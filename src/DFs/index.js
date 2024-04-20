/* eslint-disable no-restricted-syntax,no-await-in-loop */
require('dotenv').config({ path: './config/.env' })
const https = require('https')
const crypto = require('crypto')
const { REST } = require('@discordjs/rest')
const _ = require('lodash')
const uuid = require('uuid').v4
const fs = require('fs');
const AsyncStreamProcessorWithConcurrency = require('./lib/AsyncStreamProcessorWithConcurrency')
const AsyncStreamProcessor = require('./lib/AsyncStreamProcessor')
const StreamChunker = require('./lib/StreamChunker')

const DEFAULT_CHUNK_SIZE = 25165824 // 24MB
const DEFAULT_ENCRYPTION = 'aes-256-ctr'
const DEFAULT_REST_OPTS = { version: 10, timeout: 60000 }
const DEFAULT_MAX_UPLOAD_CONCURRENCY = 3
const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const { Collection } = require('discord.js');
let channel_msg_fetched = []

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`,);
    const channel = client.guilds.cache.get(process.env.GUILD_ID).channels.cache.get(process.env.CHANNEL_ID)
    // Vérifier si le fichier de cache existe et s'il contient des données
    let cacheExists = true;
    try {
        fs.accessSync('cache.json');
        const cacheContent = fs.readFileSync('cache.json', 'utf8');
        if (!cacheContent || cacheContent.length <= 2) {
            cacheExists = false;
            console.log('The cache file is empty.');
        }
    } catch (err) {
        cacheExists = false;
        console.error('Cache file does not exist, create ... (this operation may take some time depending on the number of files in the ddrive, patience)');
    }

    // If no cache file is found, run update
    if (!cacheExists) {
        try {
            const list = await fetchMore(channel, 1000); //increase if older files are not downloadable

            // Save list to cache file
            const messagesToCache = [];
            list.forEach((value, key) => {
                if (value.attachments.first()) messagesToCache.push(value.attachments.first())
            });

            channel_msg_fetched = messagesToCache
            fs.writeFileSync('cache.json', JSON.stringify(messagesToCache, null, 2), 'utf8');

            console.log('Initial list loaded from discord server and saved in cache file.');
        } catch (err) {
            console.error('Error during initial message retrieval :', err);
        }
    } else {
        // If it exists, load its contents
        try {
            const cacheContent = fs.readFileSync('cache.json', 'utf8');
            if (cacheContent) {
                const cachedMessages = JSON.parse(cacheContent);
                channel_msg_fetched = cachedMessages

                console.log('Initial list loaded from cache file.');
            }
        } catch (err) {
            console.error('Error reading cache file :', err);
        }
    }
    // Update every 40 minutes
    setInterval(async () => {
        try {
            const list = await fetchMore(channel, 15000); //increase if older files are not downloadable

            // Save list to cache file
            const messagesToCache = [];
            list.forEach((value, key) => {
                if (value.attachments.first()) messagesToCache.push(value.attachments.first())
            });
            channel_msg_fetched = messagesToCache

            fs.writeFileSync('cache.json', JSON.stringify(messagesToCache, null, 2), 'utf8');

            console.log('List updated and saved in cache file.');
        } catch (err) {
            console.error('Error updating the list :', err);
        }
    }, 40 * 60 * 1000); // 40 minutes in milliseconds
});
client.login(process.env.BOT_TOKEN)

async function fetchMore(channel, limit = 15000) {
    if (!channel) {
        throw new Error(`Expected channel, got ${typeof channel}.`);
    }
    if (limit <= 100) {
        return channel.messages.fetch({ limit });
    }

    let collection = new Collection();
    let lastId = null;
    let options = {};
    let remaining = limit;

    while (remaining > 0) {
        options.limit = remaining > 100 ? 100 : remaining;
        remaining = remaining > 100 ? remaining - 100 : 0;

        if (lastId) {
            options.before = lastId;
        }

        let messages = await channel.messages.fetch(options);

        if (!messages.last()) {
            break;
        }

        collection = collection.concat(messages);
        lastId = messages.last().id;
    }

    return collection;
}

class DiscordFileSystem {
    constructor(opts) {
        this.webhooks = opts.webhooks
        this.maxUploadConc = opts.maxUploadConc || DEFAULT_MAX_UPLOAD_CONCURRENCY
        this.chunkSize = opts.chunkSize || DEFAULT_CHUNK_SIZE
        this.encAlg = opts.encAlg || DEFAULT_ENCRYPTION
        this.secret = opts.secret
        this.rest = new REST({ ...DEFAULT_REST_OPTS, ...opts.restOpts })
        this.lastWbIdx = 0

        //
        // Validate parameters
        //
        if (!this.webhooks) throw new Error('webhooks parameter is missing')
        if (!this.webhooks.length) throw new Error('At least 1 valid webhookURL required')

        if (!_.isFinite(this.chunkSize)
            || this.chunkSize < 1
            || this.chunkSize > 26109542) {
            throw new Error('Invalid chunkSize - chunkSize should be valid number and > 1 and < 26109542')
        }

        const { timeout } = opts.restOpts
        if (!_.isFinite(timeout) || timeout < 1) {
            throw new Error('Invalid timeout - timeout should be valid number and > 0')
        }
    }

    get webhookURL() {
        const webhookURL = this.webhooks[this.lastWbIdx]
        this.lastWbIdx = this.lastWbIdx + 1 >= this.webhooks.length
            ? 0
            : this.lastWbIdx + 1

        return webhookURL.replace('https://discord.com/api', '')
    }

    /**
     * @description Encrypt the given buffer
     * @param secret
     * @param data
     * @returns {{encrypted: Buffer, iv: string}}
     * @private
     */
    _encrypt(secret, data) {
        // Create hash for given secret
        const key = crypto.createHash('sha256').update(secret).digest()
        // Create iv
        const iv = crypto.randomBytes(16)
        // Create cipher and encrypt the data
        const cipher = crypto.createCipheriv(this.encAlg, key, iv)
        let encrypted = cipher.update(data)
        encrypted = Buffer.concat([encrypted, cipher.final()])
        // Return iv and encrypted data

        return {
            iv: iv.toString('hex'),
            encrypted,
        }
    }

    /**
     * @description Returns the decryption cipher
     * @param secret
     * @param iv
     * @private
     */
    _decrypt(secret, iv) {
        // Create key hash
        const key = crypto.createHash('sha256').update(secret).digest()
        // Return decipher transform stream

        return crypto.createDecipheriv(this.encAlg, key, Buffer.from(iv, 'hex'))
    }

    /**
     * @description Upload single file to discord
     * @param file {Object}
     * @returns {Promise<unknown>}
     * @private
     */
    _uploadFile(file) {
        return this.rest.post(this.webhookURL, { files: [file], auth: false })
    }

    /**
     * @description Read files from discord and write it to stream
     * @param stream
     * @param parts {Array}
     * @returns {Promise<void>}
     */
    async read(stream, parts) {
        for (const part of parts) {
            let headers = {}
            if (part.start || part.end) headers = { Range: `bytes=${part.start || 0}-${part.end || ''}` }
            await new Promise((resolve, reject) => {
                https.get(part.url, { headers }, (res) => {
                    // Handle incoming data chunks from discord server
                    const handleData = async (data) => {
                        // https://nodejs.org/docs/latest-v16.x/api/stream.html#writablewritechunk-encoding-callback
                        if (!stream.write(data)) {
                            await new Promise((r) => stream.once('drain', r))
                        }
                    }
                    // Handle Decryption if file is encrypted
                    if (part.iv) {
                        if (!this.secret) throw new Error('secret not provided')
                        // Create decipher
                        const decipher = this._decrypt(this.secret, part.iv)
                        decipher.on('end', () => resolve())
                        decipher.on('error', (err) => reject(err))
                        res.pipe(decipher).pipe(new AsyncStreamProcessor(handleData))
                    } else {
                        res.pipe(new AsyncStreamProcessor(handleData))
                        res.on('end', () => resolve())
                    }

                    res.on('error', (err) => reject(err))
                })
            })
        }
        stream.end()
    }

    /**
     * @description Read from readable stream and upload file on discord in chunks
     * @param stream
     * @returns {Promise<unknown>}
     */
    async write(stream) {
        const parts = []
        // This function will be executed to process each chunk for file
        const processChunk = async (data, chunkCount) => {
            // Encrypt the data if secret is provided
            let iv
            let encrypted
            if (this.secret)({ iv, encrypted } = this._encrypt(this.secret, data))
            // Upload file to discord
            const part = { name: uuid(), data: encrypted || data }
            const { attachments: [attachment] } = await this._uploadFile(part)
            // Push part object into array and return later
            parts[chunkCount] = { url: attachment.url, size: attachment.size, iv }
        }

        return new Promise((resolve, reject) => {
            stream
                .on('aborted', () => reject(new Error('file upload aborted'))) // On HTTP request abort delete all the messages and reject promise
                .pipe(new StreamChunker(this.chunkSize))
                .pipe(new AsyncStreamProcessorWithConcurrency(processChunk, this.maxUploadConc))
                .on('finish', () => resolve(parts))
                .on('error', (err) => reject(err))
        })
    }
}

module.exports = DiscordFileSystem
