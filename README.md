<h1 align="center" style="font-size: 60px"> DDRIVE </h1>

<p align="center"><strong> Turn Discord into a datastore that can manage and store your files. </strong></p>
<p align="center">
    <a href="https://discord.gg/3TCZRYafhW">
        <img src="https://img.shields.io/discord/1020806104881561754?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
    <a href="https://github.com/forscht/ddrive/actions/workflows/lint.yml">
        <img src="https://github.com/forscht/ddrive/actions/workflows/lint.yml/badge.svg">
    </a>
    <a href="https://hub.docker.com/r/forscht/ddrive">
        <img src="https://img.shields.io/docker/v/forscht/ddrive?logo=docker">
    </a>
    <a href="https://hub.docker.com/r/forscht/ddrive">
        <img src="https://img.shields.io/docker/pulls/forscht/ddrive.svg?logo=docker">
    </a>
    <a href="https://github.com/forscht/ddrive/actions/workflows/codeql-analysis.yml">
        <img src="https://github.com/forscht/ddrive/actions/workflows/codeql-analysis.yml/badge.svg">
    </a>
    <a href="https://github.com/forscht/ddrive/blob/v2/LICENSE">
        <img src="https://img.shields.io/badge/License-MIT-yellow.svg">
    </a>

</p>
<br>

##### **DDrive** A lightweight cloud storage system using discord as storage device written in nodejs. Supports an unlimited file size and unlimited storage, Implemented using node js streams with multi-part up & download.

https://user-images.githubusercontent.com/59018146/167635903-48cdace0-c383-4e7d-a037-4a32eaa4ab69.mp4

#### Current stable branch `4.x`

### Live demo at [ddrive.forscht.dev](https://ddrive.forscht.dev/)

### Features
- Theoretically unlimited file size, thanks to splitting the file in 24mb chunks using nodejs streams API.
- Simple yet robust HTTP front end 
- Rest API with OpenAPI 3.1 specifications.
- Tested with storing 4000 GB of data on single discord channel (With max file size of 16GB).
- Supports basic auth with read only public access to panel.
- Easily deployable on heroku/replit and use as private cloud storage.

## New Version 4.0


This next major version release 4.0 is ddrive written from scratch. It comes with most requested features and several improvements.

- Now uses `postgres` to store files metadata. Why?
  - Once you have huge amount of data stored on ddrive it makes ddrive significantly slow to start since ddrive have to fetch all the metadata from discord channel (For 3 TB of data it takes me 30+ minutes.)
  - With postgres, deleting file is extremely faster because now ddrive don't have to delete files on discord channel and just need to remove from metadata only.
  - With postgres now it's possible to move or rename files/folders which was impossible with older version.
- Added support for `rename` files/folders.
- Added support to `move` file/folder (Only via API, Not sure how to do it with frontend, PR welcomes.)
- Now uses `webhooks` instead of `bot/user tokens` to bypass the discord rate limit
- DDrive now uploads file chunks in parallel with limit. Which significantly increase the upload speed. I was able to upload file with `5GB of size in just 85 seconds`.
- Public access mode - It is now possible to provide users read-only access with just one config var
- Batch upload files - Now you can upload multiple files at once from panel. (DClone support has been removed from this version)
- Bug fix - `download reset` for few mobile devices
- Added support for optional encryption to files uploaded to discord
- DDrive now has proper rest API with OpenAPI 3.1 standards
- Added support for dark/light mode on panel

I spent several weeks finalizing this new version.  Any support is highly appreciated - [Buy me a coffee](https://www.buymeacoffee.com/forscht)

### Requirements
- NodeJS v16.x or Docker
- Postgres Database, Discord Webhook URLs
- Avg technical knowledge

## Setup Guide
1. Clone this project
2. Create few webhook urls. For better performance and to avoid rate limit at least create 5 with 1 webhook / text channel. ([How to create webhook url](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks))
3. Setup postgres using docker, if you already don't have it running
   - `cd .devcontainer`
   - `docker-compose up -d`
4. Copy `config/.env_sample` to `config/.env` and make necessary changes
5. Optional - If you have lots of webhookURLs you can put those in `webhook.txt` with `\n` seperated.
6. Run - `npm run migration:up`
7. Run - `node bin/ddrive`
8. Navigate to `http://localhost:3000` in your browser.

### How to keep it running forever
1. Install pm2 with `npm install -g pm2`
2. Run - `pm2 start bin/ddrive`
3. Run - `pm2 list` to check status of ddrive
4. Run - `pm2 logs` to check ddrive logs

### Config variables explanation
```shell
# config/.env

# Required params
DATABASE_URL= # Database URL of postgres with valid postgres uri

WEBHOOKS={url1},{url2} # Webhook urls seperated by ","

# Optional params
PORT=3000 # HTTP Port where ddrive panel will start running

REQUEST_TIMEOUT=60000 # Time in ms after which ddrive will abort request to discord api server. Set it high if you have very slow internet

CHUNK_SIZE=25165824 # ChunkSize in bytes. You should probably never touch this and if you do  don't set it to more than 25MB, with discord webhooks you can't upload file bigger than 25MB

SECRET=someverysecuresecret # If you set this every files on discord will be stored using strong encryption, but it will cause significantly high cpu usage, so don't use it unless you're storing important stuff

AUTH=admin:admin # Username password seperated by ":". If you set this panel will ask for username password before access

PUBLIC_ACCESS=READ_ONLY_FILE # If you want to give read only access to panel or file use this option. Check below for valid options.
                             # READ_ONLY_FILE - User will be only access download links of file and not panel
                             # READ_ONLY_PANEL - User will be able to browse the panel for files/directories but won't be able to upload/delete/rename any file/folder.

UPLOAD_CONCURRENCY=3 # ddrive will upload this many chunks in parallel to discord. If you have fast internet increasing it will significantly increase performance at cost of cpu/disk usage                                              

BOT_TOKEN= # Add a bot to your Discord server and retrieve the token from the Developer Portal at https://discord.com/developers/applications.
CHANNEL_ID= # The channel ID where the file will be uploaded, is the same as the webhook's channel.
GUILD_ID= # The GUILD ID where the file will be uploaded
```
src/DFs/index.js line 42 AND line 74 :
`const list = await fetchMore(channel, 15000); `

Increase the number if older files are not downloadable, like 20000 or 30000. **If you change it, delete the cache.json before restart**

### Run using docker
```shell
docker run -rm -it -p 8080:8080 \
-e PORT=8080 \
-e WEBHOOKS={url1},{url2} \
-e DATABASE_URL={database url} \
--name ddrive forscht/ddrive
```
### One Click Deploy with Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/tL53xa)

### Setup tutorials
- Setup under 4 minutes in local/cloud server using `neon.tech` postgres - [Youtube](https://youtu.be/Zvr1BHjrYC0)
## API Usage
`npm install @forscht/ddrive`
```javascript
const { DFs, HttpServer } = require('@forscht/ddrive')

const DFsConfig = {
  chunkSize: 25165824,
  webhooks: 'webhookURL1,webhookURL2',
  secret: 'somerandomsecret',
  maxConcurrency: 3, // UPLOAD_CONCURRENCY
  restOpts: {
    timeout: '60000',
  },
}

const httpConfig = {
  authOpts: {
    auth: { user: 'admin', pass: 'admin' },
    publicAccess: 'READ_ONLY_FILE', // or 'READ_ONLY_PANEL'
  },
  port: 8080,
}

const run = async () => {
  // Create DFs Instance
  const dfs = new DFs(DFsConfig)
  // Create HTTP Server instance
  const httpServer = HttpServer(dfs, httpConfig)

  return httpServer.listen({ host: '0.0.0.0', port: httpConfig.port })
}

run().then()

```

## Migrate from v3 to v4
Migrating ddrive v3 to v4 is one way process once you migrate ddrive to v4 and add new files you can't migrate new files to v3 again but you can still use v3 with old files.

1. Clone this project
2. Create few webhooks (1 webhook/text channel). Do not create webhook on old text channel where you have already stored v3 data.
3. Take pull of latest ddrive v3
4. Start ddrive v3 with option `--metadata=true`. Ex - `ddrive --channelId {id} --token {token} --metadata=true`
5. Open `localhost:{ddrive-port}/metadata` in browser
6. Save JSON as old_data.json in cloned ddrive directory
7. Put valid `DATABASE_URL` in `config/.env`
8. Run `node bin/migrate old_data.json`
9. After few seconds once process is done you should see the message `Migration is done`

Feel free to create [new issue](https://github.com/forscht/ddrive/issues/new) if it's not working for you or need any help.

[Discord Support server](https://discord.gg/3TCZRYafhW)
