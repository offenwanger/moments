import * as td from 'testdouble';

// set the three mocks
import { mockThreeSetup } from './mock_three.js';
// do the rest of the imports
import { createCanvas } from './mock_canvas.js';
import { mockD3 } from './mock_d3.js';
import * as mockFileSystem from './mock_filesystem.js';
import { HTMLElement } from './mock_html_element.js';
import { mockIndexedDB } from './mock_indexedDB.js';

import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
eval(fs.readFileSync(__dirname + '../../../lib/delaunator.min.js', 'utf-8'))

// Trap error and trigger a failure. 
let consoleError = console.error;
console.error = function (message) {
    if (("" + message).startsWith("TypeError: Cannot read properties of null")) return;
    consoleError(...arguments);
    expect("").toEqual(message)
}

export async function setup() {
    mockFileSystem.setup();

    global.d3 = new mockD3();
    global.indexedDB = new mockIndexedDB();
    //// THREE things /////
    global.HTMLCanvasElement = Object;
    global.ProgressEvent = Event;
    global.navigator = undefined;
    ////
    global.document = {
        querySelector: (query) => { return { checkVisibility: () => false } },
        createElement: (e) => {
            if (e == 'canvas') return createCanvas();
            if (e == 'input') return {
                click: function () { this.onchange({ target: { files: [global.window.files.pop()] } }) }
            };
            else return new HTMLElement(e);
        },
        createElementNS: function (ns, e) { return this.createElement(e) },
        addEventListener: function (event, listener) { },
        body: { appendChild: function (vrbutton) { } }
    }
    global.window = {
        callbacks: {},
        directories: [],
        files: [],
        on: (event, callback) => { window.callbacks[event] = callback; },
        addEventListener: (event, callback) => { window.callbacks[event] = callback; },
        showDirectoryPicker: () => global.window.directories.pop(),
        showOpenFilePicker: () => [global.window.files.pop()],
        location: { search: "" },
        innerWidth: 1000,
        innerHeight: 800
    };
    global.Image = function () {
        let src;
        let onload;
        let img = createCanvas();
        Object.defineProperty(img, "src", {
            set: function (value) {
                src = value
                if (src && onload) onload();
                return true;
            }
        });
        Object.defineProperty(img, "onload", {
            set: function (value) {
                onload = value
                if (src && onload) onload();
                return true;
            }
        });

        return img;
    }
    global.FileReader = mockFileSystem.mockFileReader;
    global.io = function () { return { on: () => { }, emit: () => { }, } };
    global.domtoimage = { toPng: () => createCanvas() }

    await mockThreeSetup();

    let { main } = await import('../../js/main.js')
    await main();
}

export async function cleanup() {
    delete global.d3;
    delete global.indexedDB;
    delete global.document;
    delete global.navigator;
    delete global.window;
    mockFileSystem.cleanup();
    td.reset();
}
