
export function setup() {
    global.fileSystem = {}
}

export function cleanup() {
    delete global.fileSystem;
}

export function mockFileSystemDirectoryHandle(directoryName) {
    this.permission = 'granted';
    this.queryPermission = () => this.permission;
    this.requestPermission = () => this.permission;
    this.getFileHandle = (fileName, config) => { return new mockFileSystemFileHandle(directoryName + "/" + fileName, config) }
    this.getDirectoryHandle = (dirName) => { return new mockFileSystemDirectoryHandle(directoryName + "/" + dirName) }
}

export function mockFileSystemFileHandle(fileName, config) {
    if (config && config.create && !global.fileSystem[fileName]) { global.fileSystem[fileName] = "new" }
    this.getFile = () => new mockFile(fileName);
    this.createWritable = () => new mockFile(fileName);
}

export function mockFile(fileName) {
    if (!global.fileSystem[fileName]) {
        throw new Error('A requested file or directory could not be found at the time an operation was processed');
    }
    this.text = () => global.fileSystem[fileName];
    this.write = (text) => global.fileSystem[fileName] = text;
    this.close = () => { };
}