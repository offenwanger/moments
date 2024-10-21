
import * as td from 'testdouble';
import * as THREE from 'three';
import { createCanvas } from './mock_canvas.js';
import { mockXR, mockXRControllerModelFactory } from './mock_xr.js';

export async function mockThreeSetup() {
    await td.replaceEsm('three', {
        ...THREE,
        WebGLRenderer: function () {
            this.animationLoop = null;
            this.lastRender = { scene: null, camera: null }
            this.setSize = () => { }
            this.setAnimationLoop = (func) => { this.animationLoop = func }
            this.xr = new mockXR()
            this.render = function (scene, camera) { this.lastRender = { scene, camera }; }
        },
        ImageLoader: function () {
            this.loadAsync = () => { return createCanvas() }
        },
    });

    await td.replaceEsm('three/addons/webxr/VRButton.js', { VRButton: mockVRButton });
    await td.replaceEsm('three/addons/loaders/DRACOLoader.js', { DRACOLoader: mockDRACOLoader });
    await td.replaceEsm('three/addons/controls/OrbitControls.js', { OrbitControls: mockOrbitControls });
    await td.replaceEsm('three/addons/webxr/XRControllerModelFactory.js', { XRControllerModelFactory: mockXRControllerModelFactory });
    await td.replaceEsm("three-mesh-ui", { ThreeMeshUI: {} });
    await td.replaceEsm('three/addons/helpers/VertexNormalsHelper.js', { VertexNormalsHelper: {} });
}

export function mockOrbitControls(camera) {
    this.minDistance = 0;
    this.maxDistance = 0;
    this.target = new THREE.Vector3();
    this.update = function () { };
    this.addEventListener = function () { };
    this.enabled = false;
}

export const mockVRButton = {
    createButton: function (XRRenderer) {
        global.XRRenderer = XRRenderer;
        return d3.root.append('div').attr("id", "VRButton");
    }
}

export function mockDRACOLoader() {
    this.setDecoderPath = () => { };
}
