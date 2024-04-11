import THREE from 'three';

import { createCanvas } from './mock_canvas.js'
import { mockD3 } from './mock_d3.js';
import { HTMLElement } from './mock_html_element.js';
import { mockIndexedDB } from './mock_indexedDB.js';
import * as mockFileSystem from './mock_filesystem.js'
import * as mockTHREE from './mock_three.js'

jest.spyOn(THREE, 'WebGLRenderer').mockReturnValue({
    setSize: () => { },
    setAnimationLoop: () => { },
    xr: {
        enabled: false,
        addEventListener: () => { },
        getController: () => { return new THREE.Object3D(); },
        getControllerGrip: () => { return new THREE.Object3D(); },
    },
});
jest.spyOn(THREE, 'ImageLoader').mockReturnValue({
    loadAsync: () => { return createCanvas() }
});
jest.mock('three/addons/webxr/VRButton.js', () => { return { VRButton: mockTHREE.mockVRButton } }, { virtual: true });
jest.mock('three/addons/loaders/GLTFLoader.js', () => { return { GLTFLoader: mockTHREE.mockGLTFLoader } }, { virtual: true });
jest.mock('three/addons/loaders/DRACOLoader.js', () => { return { DRACOLoader: mockTHREE.mockDRACOLoader } }, { virtual: true });
jest.mock('three/addons/controls/OrbitControls.js', () => { return { OrbitControls: mockTHREE.mockOrbitControls } }, { virtual: true });
jest.mock('three/addons/webxr/XRControllerModelFactory.js', () => { return { XRControllerModelFactory: mockTHREE.mockXRControllerModelFactory } }, { virtual: true });
jest.mock("three-mesh-ui", () => { return { ThreeMeshUI: {} } }, { virtual: true });
jest.mock('three/addons/helpers/VertexNormalsHelper.js', () => { }, { virtual: true });

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
    global.document = {
        createElement: (e) => {
            if (e == 'canvas') return createCanvas();
            else return new HTMLElement(e);
        },
        createElementNS: function (ns, e) { return this.createElement(e) },
        addEventListener: function (event, listener) { },
        body: { appendChild: function (vrbutton) { } }
    }
    global.navigator = {};
    global.window = {
        callbacks: {},
        directories: [],
        files: [],
        on: (event, callback) => { window.callbacks[event] = callback; },
        showDirectoryPicker: () => global.window.directories.pop(),
        showOpenFilePicker: () => [global.window.files.pop()],
        location: { search: "" },
        innerWidth: 1000,
        innerHeight: 800
    };

    let { main } = await import('../../js/main.js');
    await main();
}

export async function cleanup() {
    delete global.d3;
    delete global.indexedDB;
    delete global.document;
    delete global.navigator;
    delete global.window;
    mockFileSystem.cleanup();
}
