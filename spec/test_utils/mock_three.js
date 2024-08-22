
import * as td from 'testdouble';
import * as THREE from 'three';
import { createCanvas } from './mock_canvas.js';

export async function mockThreeSetup() {
    await td.replaceEsm('three', {
        ...THREE,
        WebGLRenderer: function () {
            this.setSize = () => { }
            this.setAnimationLoop = () => { }
            this.xr = {
                enabled: false,
                addEventListener: () => { },
                getController: () => { return new THREE.Object3D(); },
                getControllerGrip: () => { return new THREE.Object3D(); },
            }
        },
        ImageLoader: function () {
            this.loadAsync = () => { return createCanvas() }
        },
    });

    await td.replaceEsm('three/addons/webxr/VRButton.js', { VRButton: mockVRButton });
    await td.replaceEsm('three/addons/loaders/GLTFLoader.js', { GLTFLoader: mockGLTFLoader });
    await td.replaceEsm('three/addons/loaders/DRACOLoader.js', { DRACOLoader: mockDRACOLoader });
    await td.replaceEsm('three/addons/controls/OrbitControls.js', { OrbitControls: mockOrbitControls });
    await td.replaceEsm('three/addons/webxr/XRControllerModelFactory.js', { XRControllerModelFactory: mockXRControllerModelFactory });
    await td.replaceEsm("three-mesh-ui", { ThreeMeshUI: {} });
    await td.replaceEsm('three/addons/helpers/VertexNormalsHelper.js', { VertexNormalsHelper: {} });
}

export function mockOrbitControls() {
    this.minDistance = 0;
    this.maxDistance = 0;
    this.target = new THREE.Vector3();
    this.update = function () { };
    this.addEventListener = function () { };
    this.enabled = false;
}

export const mockVRButton = {
    createButton: function () {
        return d3.root.append('div').attr("id", "VRButton");
    }
}

export function mockGLTFLoader() {
    this.setDRACOLoader = () => { };
    this.loadAsync = () => { return { scene: new THREE.Scene() } };
}

export function mockDRACOLoader() {
    this.setDecoderPath = () => { };
}

export function mockXRControllerModelFactory() {
    this.createControllerModel = function () { return new THREE.Object3D() }
}
