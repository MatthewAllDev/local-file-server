let FILEMAP;
let SHIFTDOWN = false;
let CLICKSINDEX = new Array();

document.getElementById('files_input').addEventListener('change', createFilesPreview);
document.addEventListener('keyup', keyEventListner);
document.addEventListener('keydown', keyEventListner);

function keyEventListner(event) {
    if (event.key === 'F2') {
        renameActiveFiles();
    } else if (event.key === 'F4') {
        changeDeleteClassFlag();
    } else if (event.key === 'Escape') {
        deactivateAll();
    } else if (event.key === 'Shift') {
        SHIFTDOWN = !SHIFTDOWN;
        CLICKSINDEX = new Array();
    }
}

function createFileMap(files) {
    let currentMap = new Map(JSON.parse(localStorage.getItem('FILEMAP')));
    if (currentMap === null) {
        currentMap = new Map();
    }
    let newMap = new Map();
    let sortArray = new Array();
    let keysMap = new Map();
    for (let file of files) {
        let key = (file.name + file.lastModified + file.size).split('').map(c => c.codePointAt(0).toString(16)).join('');
        let currentObject = currentMap.get(key);
        if (currentObject === undefined) {
            currentObject = {};
        }
        let fileObject = {
            key: key,
            file: file,
            name: currentObject.name,
            fileName: file.name,
            isDeleted: Boolean(currentObject.isDeleted)
        }
        keysMap.set(file.name + file.lastModified, key);
        sortArray.push(file.name + file.lastModified);
        newMap.set(key, fileObject);
    }
    sortArray.sort();
    let sortedKeys = new Array();
    for (let element of sortArray) {
        sortedKeys.push(keysMap.get(element));
    }
    newMap.set('sortedKeys', sortedKeys);
    return newMap;
}

function createFilesPreview(event) {
    let targetContainer = document.getElementById('images_container');
    let template = document.getElementById('preview_template').getElementsByTagName('div')[0];
    FILEMAP = createFileMap(event.target.files);
    localStorage.setItem('FILEMAP', JSON.stringify(Array.from(FILEMAP.entries())));
    for (let fileKey of FILEMAP.get('sortedKeys')) {
        let fileData = FILEMAP.get(fileKey)
        let node = template.cloneNode(true);
        node.getElementsByTagName('img')[0].setAttribute('src', URL.createObjectURL(fileData.file));
        node.getElementsByTagName('div')[0].innerText = fileData.name !== undefined ? fileData.name : fileData.fileName;
        if (fileData.isDeleted) {
            node.classList.add('image-to-delete');
        }
        node.setAttribute('data-file-id', fileData.key);
        node.addEventListener('click', (event) => { activateFiles(event.currentTarget); })
        targetContainer.append(node);
    }
    document.getElementById('input_files_label').getElementsByTagName('span')[0].innerText = localization.input_files_label.make({
        count: event.target.files.length
    });
}

function activateFiles(node) {
    if (!SHIFTDOWN) {
        changeClassFlag(node, 'image-active');
    } else if (CLICKSINDEX.length === 0) {
        CLICKSINDEX.push(FILEMAP.get('sortedKeys').indexOf(node.getAttribute('data-file-id')));
        changeClassFlag(node, 'image-active');
    } else {
        CLICKSINDEX.push(FILEMAP.get('sortedKeys').indexOf(node.getAttribute('data-file-id')));
        let fileNodes = document.getElementsByClassName('image');
        let state = fileNodes[CLICKSINDEX[0]].classList.contains('image-active');
        CLICKSINDEX.sort((a, b) => { return a - b; });
        for (let i = CLICKSINDEX[0]; i <= CLICKSINDEX[1]; i++) {
            if (state) {
                fileNodes[i].classList.add('image-active');
            } else {
                fileNodes[i].classList.remove('image-active');
            }
        }
        CLICKSINDEX = new Array();
    }
}

function changeClassFlag(node, className) {
    if (node.classList.contains(className)) {
        node.classList.remove(className);
    } else {
        node.classList.add(className)
    }
}

function renameActiveFiles() {
    let activeElements = document.getElementsByClassName('image-active');
    let defaultName = FILEMAP.get(activeElements[0].getAttribute('data-file-id')).fileName;
    for (let element of activeElements) {
        let fileData = FILEMAP.get(activeElements[0].getAttribute('data-file-id'));
        if (fileData.name !== undefined) {
            defaultName = fileData.name;
        }
    }
    let name = prompt(localization.file_name_question, defaultName).trim();
    while (activeElements.length > 0) {
        activeElements[0].getElementsByClassName('object-name')[0].innerText = name;
        let fileData = FILEMAP.get(activeElements[0].getAttribute('data-file-id'));
        fileData.name = name;
        activeElements[0].classList.remove('image-active');
    }
    localStorage.setItem('FILEMAP', JSON.stringify(Array.from(FILEMAP.entries())));
}

function changeDeleteClassFlag() {
    let activeElements = document.getElementsByClassName('image-active');
    while (activeElements.length > 0) {
        changeClassFlag(activeElements[0], 'image-to-delete');
        let fileData = FILEMAP.get(activeElements[0].getAttribute('data-file-id'));
        fileData.isDeleted = !fileData.isDeleted;
        activeElements[0].classList.remove('image-active');
    }
    localStorage.setItem('FILEMAP', JSON.stringify(Array.from(FILEMAP.entries())));
}

function deactivateAll() {
    let activeElements = document.getElementsByClassName('image-active');
    while (activeElements.length > 0) {
        activeElements[0].classList.remove('image-active');
    }
}

function uploadFiles() {
    let keys = FILEMAP.get('sortedKeys');
    let files = []
    for (let fileKey of keys) {
        let fileData = FILEMAP.get(fileKey);
        if (!fileData.isDeleted) {
            files.push(fileData)
        }
    }
    let progressBar = new ProgressBar(files.length, localization.upload_progress_header_many);
    progressBar.show();
    for (let fileData of files) {
        uploadFile(fileData, progressBar);
    }
}

function uploadFile(fileData, progressBar = undefined) {
    if (progressBar == undefined) {
        progressBar = new ProgressBar(1, localization.upload_progress_header_one);
    }
    checkStatus = (response) => {
        if (response.status >= 200 && response.status < 300) {
            return Promise.resolve(response)
        } else {
            return Promise.reject(new Error(`${response.status} ${response.statusText}`))
        }
    }
    showError = (error) => {
        progressBar.inc();
        let err = new Error(`(${fileData.name} | ${fileData.fileName}) - ${error.message}`);
        progressBar.showError(err);
    }
    var data = new FormData()
    for (let [key, value] of Object.entries(fileData)) {
        if (value !== undefined) data.append(key, value);
    }
    fetch('/upload', { method: 'POST', body: data }).then(checkStatus, showError).then(
        () => { progressBar.inc(); },
        showError
    );
}

class Popup {
    constructor(id = 'popup') {
        this._node = document.createElement('div');
        this._node.addEventListener('click', (event) => { if (event.target.classList.contains('popup')) this.hide(); })
        this._node.className = 'popup';
        this._node.id = id;
        this._contentContainer = document.createElement('div');
        this._contentContainer.className = 'popup-content';
        this._node.append(this._contentContainer);
    }

    addContent(...nodes) {
        for (let node of nodes) {
            this._content = node;
            this._contentContainer.append(node);
        }
    }

    clearContent() {
        this._contentContainer.remove();
        this._contentContainer = undefined;
    }

    show() {
        document.body.append(this._node);
    }

    hide() {
        this._node.remove();
    }
}

class ProgressBar extends Popup {

    constructor(maxCount, header = 'Progress...', afterFinishing = (progressBar) => { }) {
        super('progress_bar');
        this._progress = 0;
        this._maxCount = maxCount;
        let progressBarNode = document.createElement('div');
        progressBarNode.className = 'progress-bar';
        this._progressNode = document.createElement('div');
        this._progressNode.className = 'progress';
        this._progressTextNode = document.createElement('div');
        this._progressTextNode.append(document.createTextNode('0%'));
        this._progressTextNode.className = 'progress-text';
        progressBarNode.append(this._progressNode, this._progressTextNode);
        this._headerNode = document.createElement('h2');
        this._headerNode.append(document.createTextNode(header));
        let errorsNode = document.createElement('div');
        errorsNode.className = 'progress-bar-errors';
        this._errorsListNode = document.createElement('ul');
        errorsNode.append(this._errorsListNode);
        this.addContent(this._headerNode, progressBarNode, errorsNode);
        this.callBack = afterFinishing;
    }

    hide(forced = false) {
        if ((this._progress >= this._maxCount) || forced) {
            super.hide();
        }
    }

    inc() {
        this._progress++;
        this._showProgress();
        if (this._progress === this._maxCount) this.callBack(this);
    }

    reset() {
        this._progress = 0;
        this._showProgress();
    }

    showError(error) {
        let errorsListElementNode = document.createElement('li');
        errorsListElementNode.append(document.createTextNode(error));
        this._errorsListNode.append(errorsListElementNode);
    }

    _showProgress() {
        let progressPerсent = `${Math.round(this._progress / this._maxCount * 100)}%`;
        this._progressNode.style.width = progressPerсent;
        this._progressTextNode.textContent = progressPerсent;
    }

}