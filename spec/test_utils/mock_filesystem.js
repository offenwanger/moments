import * as fs from 'fs';
import { dirname } from 'path';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { fileURLToPath } from 'url';
import * as fr from 'file-api'

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FOLDER = __dirname + '/testoutput/'
if (!fs.existsSync(OUT_FOLDER)) { fs.mkdirSync(OUT_FOLDER); }
const IN_FOLDER = __dirname + '/testinput/'
if (!fs.existsSync(IN_FOLDER)) { fs.mkdirSync(IN_FOLDER); }

export function setup() {
    global.fileSystem = {}
}

export function cleanup() {
    delete global.fileSystem;
}

export function mockFileReader() {
    this.callbacks = {};
    this.addEventListener = function (e, func) {
        this.callbacks[e] = func;
    }
    this.readAsDataURL = async function (file) {
        // wait for load functions to get set. Dumb requirement for GLTF exporter to work. 
        await new Promise(resolve => setTimeout(() => resolve(), 0))
        this.result = file.text();
        if (this.callbacks.load) {
            this.callbacks.load(this.result)
        }
        if (this.callbacks.loadend) {
            this.callbacks.loadend(this.result)
        }
        if (this.onload) {
            this.onload(this.result)
        }
        if (this.onloadend) {
            this.onloadend(this.result)
        }
    }
}

export function mockFileSystemDirectoryHandle(directoryName) {
    this.permission = 'granted';
    this.queryPermission = () => this.permission;
    this.requestPermission = () => this.permission;
    this.getFileHandle = (filename, config) => { return new mockFileSystemFileHandle(directoryName + "/" + filename, config) }
    this.getDirectoryHandle = (dirName) => { return new mockFileSystemDirectoryHandle(directoryName + "/" + dirName) }
}

export async function loadRealFile(filename) {
    try {
        let reader = new fr.default.FileReader();
        let read = await new Promise((resolve, reject) => {
            reader.addEventListener('load', () => resolve(reader.result));
            reader.addEventListener('error', (e) => reject(e));
            reader.readAsDataURL(new fr.default.File(IN_FOLDER + filename), 'utf8');
        })
        global.fileSystem[filename] = read;
    } catch (e) {
        console.error(e);
    }
}

export function mockFileSystemFileHandle(filename, config) {
    this.name = filename;
    if (config && config.create && !global.fileSystem[filename]) { global.fileSystem[filename] = "new" }
    if (!global.fileSystem[filename]) throw new Error("A requested file or directory could not be found at the time an operation was processed")
    this.getFile = () => new mockFile(filename, global.fileSystem[filename]);
    this.createWritable = () => new mockFile(filename);
}

export function mockFile(filename, text) {
    this.text = () => text;
    this.write = (text) => { global.fileSystem[filename] = text; }
    this.close = () => { };
    this.arrayBuffer = () => text;
}

let counter = 0;
export async function exportGLTF(scene) {
    await new Promise((resolve, reject) => {
        const exporter = new GLTFExporter();
        exporter.parse(
            scene,
            function (gltf) {
                const filename = OUT_FOLDER + "testout" + Date.now() + "_" + (counter++) + ".glb";
                try {
                    fs.writeFileSync(filename, JSON.stringify(gltf), err => err ? console.error(err) : null);
                    resolve();
                } catch (e) {
                    console.error(e);
                    reject();
                }
            },
            function (error) {
                console.error(error);
                reject();
            });
    })
}

