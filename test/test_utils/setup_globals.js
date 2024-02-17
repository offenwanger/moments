import * as  chai from 'chai';
import * as THREE from 'three';
let assert = chai.assert;

import { createCanvas } from './mock_canvas.js'
import { mockD3 } from './mock_d3.js';
import { HTMLElement } from './mock_html_element.js';
import { mockIndexedDB } from './mock_indexedDB.js';

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
global.window = {};
global.indexedDB = new mockIndexedDB();

global.THREE = THREE
global.d3 = new mockD3();

// Trap error and trigger a failure. 
let consoleError = console.error;
console.error = function (message) {
    consoleError(...arguments);
    assert.equal("No Error", "Error: " + message);
}