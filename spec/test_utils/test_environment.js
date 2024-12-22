import * as td from 'testdouble';

// set the three mocks
import { mockThreeSetup } from './mock_three.js';
// do the rest of the imports
import { createCanvas } from './mock_canvas.js';
import * as mockFileSystem from './mock_filesystem.js';
import { HTMLElement, IFrameElement } from './mock_html_element.js';
import { mockIndexedDB } from './mock_indexedDB.js';

import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { mockAudioContext } from './mock_audio_context.js';
import { mockServerSetup } from './mock_server.js';
import { mockXR } from './mock_xr.js';

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
    let log = [];
    await td.replaceEsm('../../js/utils/log_util.js', {
        logInfo: function (...args) {
            log.push(args);
        }
    });

    mockFileSystem.setup();

    global.indexedDB = new mockIndexedDB();
    global.AudioContext = mockAudioContext;
    global.MediaRecorder = function () { return { start: () => { }, pause: () => { } } };
    global.HTMLCanvasElement = Object;
    global.ProgressEvent = Event;
    if (!global.navigator) global.navigator = { userAgent: 'TestEnv' }
    global.navigator.xr = new mockXR();
    global.navigator.mediaDevices = {
        getUserMedia: () => { return 'stream'; }
    };
    global.test_rendererAccess = {};
    global.document = {
        elements: [],
        querySelector: function (query) {
            if (query[0] == '#') {
                return this.elements.find(e => e.getAttribute('id') == query.substring(1));
            } else {
                console.error('Query not implimented: ' + query);
            }
        },
        createElement: function (e) {
            let element;
            if (e == 'canvas') element = createCanvas();
            else element = new HTMLElement(e);

            if (e == 'input') {
                element.click = function () {
                    element.eventListeners.change({ target: { files: [global.window.files.pop()] } })
                }
            }

            if (e == 'dialog') {
                element.show = function () {
                    element.open = true;
                }
                element.close = function () {
                    element.open = false;
                }
                element.removeEventListener = () => { }
            }

            if (e == 'iframe') {
                element = new IFrameElement(e);
            }

            this.elements.push(element);
            return element;
        },
        createElementNS: function (ns, e) { return this.createElement(e) },
        addEventListener: function (event, listener) { },
        body: { appendChild: function (vrbutton) { } }
    }
    let content = document.createElement('div');
    content.setAttribute('id', 'content');

    global.window = {
        callbacks: {},
        directories: [],
        files: [],
        addEventListener: (event, callback) => {
            if (!window.callbacks[event]) window.callbacks[event] = []
            window.callbacks[event].push(callback);
        },
        showDirectoryPicker: () => global.window.directories.pop(),
        showOpenFilePicker: () => [global.window.files.pop()],
        location: {
            href: "http://test.com",
            search: "",

        },
        history: {
            replaceState: function (something, somethingElse, url) {
                window.location.href = url.href;
                window.location.search = url.search;
            }
        },
        innerWidth: 1000,
        innerHeight: 800,
        AudioContext: global.AudioContext,
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
    global.Audio = function () { return {} }

    await mockThreeSetup();
    await mockServerSetup();

    let { main } = await import('../../js/main.js')
    window.mainFunc = main;
    await main();

    let app = await import('../../app.js');
}

export async function cleanup() {
    delete global.indexedDB;
    delete global.document;
    delete global.navigator;
    delete global.window;
    mockFileSystem.cleanup();
    td.reset();
}
