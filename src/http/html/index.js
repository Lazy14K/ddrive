/* eslint-disable no-restricted-syntax,no-loop-func */
const table = document.getElementById('fm-table')
const tbody = document.getElementById('tbody')
const lightModeBtn = document.getElementById('light-mode-btn')
const darkModeBtn = document.getElementById('dark-mode-btn')

const fileInput = document.getElementById('file-input')

const prevBtn = document.getElementById('previous-btn')

const createFolderBtn = document.getElementById('create-btn')
const uploadBtn = document.getElementById('upload-btn')

const trashBtn = document.getElementById('trash-btn')
const renameBtn = document.getElementById('rename-btn')
const clipboardBtn = document.getElementById('clipboard-btn')

let currDirectory = ''
let parentDirectory = ''

//
// Utility functions
//
function makeid(length) {
    let result = ''
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const charactersLength = characters.length
    for (let i = 0; i < length; i += 1) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }

    return result
}

function sort(arr, key) {
    if (key === "createdAt") {
        return arr.sort((b, a) => new Date(a[key]) - new Date(b[key]));
    } else {
        return arr.sort((a, b) => {
            if (a[key] < b[key]) return -1
            if (a[key] > b[key]) return 1
            return 0
        })
    }
}
function download(url) {
    const a = document.createElement('a')
    a.href = url
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea')
    textArea.value = text

    // Avoid scrolling to bottom
    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.position = 'fixed'

    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
}

function copyTextToClipboard(text) {
    navigator.clipboard?.writeText(text).catch(() => fallbackCopyTextToClipboard(text))
}

//
// Helper functions
//
function getSelected() {
    const [selected] = table.getElementsByClassName('selected')
    if (!selected) return undefined
    if (selected.classList.contains('file')) selected.type = 'file'
    else selected.type = 'folder'

    return selected
}

function resetBtns() {
    createFolderBtn.disabled = false
    uploadBtn.disabled = false
    const selected = getSelected()
    trashBtn.disabled = !selected
    renameBtn.disabled = !selected
    clipboardBtn.disabled = !(selected && selected.type === 'file')
}

function disableAllBtns() {
    prevBtn.disabled = true
    createFolderBtn.disabled = true
    uploadBtn.disabled = true
    trashBtn.disabled = true
    renameBtn.disabled = true
    clipboardBtn.disabled = true
}

function clearTableAndResetButtons() {
    while (tbody.hasChildNodes()) tbody.removeChild(tbody.lastChild)
    resetBtns()
}

function setTheme(mode) {
    let currMode = mode
    if (!currMode) currMode = window.localStorage.getItem('mode') || 'dark'
    document.documentElement.classList.add(currMode)
    document.documentElement.classList.remove(currMode === 'dark' ? 'light' : 'dark')
    window.localStorage.setItem('mode', currMode)
    if (currMode === 'dark') {
        lightModeBtn.parentNode.classList.add('active')
        darkModeBtn.parentNode.classList.remove('active')
    } else {
        lightModeBtn.parentNode.classList.remove('active')
        darkModeBtn.parentNode.classList.add('active')
    }
}

//
// API Operations
//
async function refreshTable() {
    const resp = await fetch(`/api/directories/${currDirectory}`)
    const body = await resp.json()
    if (resp.status !== 200) {
        disableAllBtns()

        return
    }
    currDirectory = body.id
    parentDirectory = body.parentId
    prevBtn.disabled = !parentDirectory
    clearTableAndResetButtons()
    for (const directory of sort(body.child.directories, 'name')) {
        tbody.appendChild(prepareFolderTR(directory))
    }
    for (const file of sort(body.child.files, 'name')) {
        tbody.appendChild(prepareFileTR(file))
    }
}

async function deleteFileOrFolder(type = 'file', id) {
    const url = `/api/${type === 'file' ? 'files' : 'directories'}/${id}`
    await fetch(url, { method: 'DELETE' })
    await refreshTable()
}

async function uploadFile() {
    for (const file of fileInput.files) {
        // Create unique id for progress bar
        const id = makeid(20)

        // Prepare form data and create progress bar
        const formData = new FormData()
        formData.append('file', file)
        createProgressBar(id, `Uploading ${file.name}`)

        // Create XHR request
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `/api/files/${currDirectory}`, true)

        // handle update progress
        xhr.upload.onprogress = (e) => {
            const progress = (e.total === 0) ? 0 : (e.loaded / e.total) * 100
            updateProgressBar(id, Math.floor(progress))
        }

        // Non 200 status handler
        xhr.onload = async () => {
            deleteProgressBar(id)
            await refreshTable()
        }

        // Network error handler
        xhr.onerror = async () => {
            deleteProgressBar(id)
            await refreshTable()
        }

        // Finally send data
        xhr.send(formData)
    }
}

async function navigatePrevFolder() {
    currDirectory = parentDirectory
    await refreshTable()
}

async function createFolder() {
    const id = makeid(20) // Temp id
    const input = createFolderTR(id)
    input.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            await fetch(`/api/directories`, {
                method: 'POST',
                body: JSON.stringify({ name: input.value, parentId: currDirectory }),
                headers: { 'Content-Type': 'application/json' },
            })
            await refreshTable()
        }
    })
    input.focus()
    disableAllBtns()
}

function copyToClipboard() {
    const selected = getSelected()
    if (selected && selected.type === 'file') {
        // eslint-disable-next-line no-restricted-globals
        const url = `${location.href.replace(/\/$/, '')}/api/files/${selected.id}/download`
        copyTextToClipboard(url)
    }
}
async function renameFileOrFolder() {
    const selected = getSelected()
    const inputText = document.createElement('input')
    inputText.style.height = '1rem'
    inputText.style.width = '80%'
    inputText.setAttribute('type', 'text')
    inputText.setAttribute('value', selected.textContent)
    selected.textContent = ''
    inputText.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            await fetch(`/api/${selected.type === 'file' ? 'files' : 'directories'}/${selected.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: inputText.value }),
                headers: { 'Content-Type': 'application/json' },
            })
            await refreshTable()
        }
    })
    selected.appendChild(inputText)
    inputText.focus()
    disableAllBtns()
}

//
// Event handlers
//
async function handleClick(e) {
    const selected = getSelected()
    if (selected && e.target.id === trashBtn.id) {
        await deleteFileOrFolder(selected.type, selected.id)
    }
    if (e.target.id === prevBtn.id && parentDirectory) {
        await navigatePrevFolder()
    }
    if (selected && e.target.id === renameBtn.id) {
        await renameFileOrFolder()
    }
    if (e.target.id === createFolderBtn.id) {
        await createFolder()
    }
    if (e.target.id === clipboardBtn.id) {
        copyToClipboard()
    }
    if (e.target.id === lightModeBtn.id) {
        setTheme('light')
    }
    if (e.target.id === darkModeBtn.id) {
        setTheme('dark')
    }
    if (selected) {
        selected.classList.remove('selected')
        resetBtns()
    }
    const { classList } = e.target
    if (classList.contains('file') || classList.contains('folder')) {
        classList.add('selected')
        resetBtns()
    }
}

async function handleDoubleClick(e) {
    const { classList } = e.target
    if (classList.contains('file')) {
        download(`/api/files/${e.target.id}/download`)
    }
    if (classList.contains('folder')) {
        currDirectory = e.target.id
        await refreshTable()
    }
}

function loadDataTable() {
    document.onclick = handleClick
    document.ondblclick = handleDoubleClick
    clearTableAndResetButtons()
    refreshTable().then()
    fileInput.addEventListener('change', () => uploadFile())

    setTheme()
}

loadDataTable()
