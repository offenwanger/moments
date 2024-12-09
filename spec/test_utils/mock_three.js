
import * as td from 'testdouble';
import * as THREE from 'three';
import { createCanvas } from './mock_canvas.js';
import { mockXRControllerModelFactory } from './mock_xr.js';

export async function mockThreeSetup() {
    await td.replaceEsm('three', {
        ...THREE,
        WebGLRenderer: function () {
            this.animationLoop = null;
            this.lastRender = { scene: null, camera: null }
            this.setSize = () => { }
            this.setAnimationLoop = (func) => {
                this.animationLoop = func
                global.test_rendererAccess.animationLoop = func;
            }
            this.xr = global.navigator.xr;
            this.render = function (scene, camera) {
                global.test_rendererAccess.lastRender = { scene, camera };
            }
        },
        ImageLoader: function () {
            this.loadAsync = () => { return createCanvas() }
        },
    });

    await td.replaceEsm('three/addons/loaders/DRACOLoader.js', { DRACOLoader: mockDRACOLoader });
    await td.replaceEsm('three/addons/controls/OrbitControls.js', { OrbitControls: mockOrbitControls });
    await td.replaceEsm('three/addons/webxr/XRControllerModelFactory.js', { XRControllerModelFactory: mockXRControllerModelFactory });
    await td.replaceEsm('three/addons/helpers/VertexNormalsHelper.js', { VertexNormalsHelper: {} });
    await td.replaceEsm('three-mesh-ui', new mockThreeMeshUI());
}

export function mockOrbitControls(camera) {
    this.minDistance = 0;
    this.maxDistance = 0;
    this.target = new THREE.Vector3();
    this.update = function () { };
    this.addEventListener = function () { };
    this.enabled = false;
}

export function mockDRACOLoader() {
    this.setDecoderPath = () => { };
}

function mockThreeMeshUI() {
    let list = [];
    function Block() {
        let o = new THREE.Group();
        o.getHeight = () => 100;
        o.getWidth = () => 100;
        o.getJustifyContent = () => 'start';
        o.states = []
        o.setupState = () => { };
        o.setState = () => { };
        o.set = () => { };
        o.update = () => { };
        list.push(o);
        return o;
    };
    function Text() {
        let o = new THREE.Group();
        list.push(o);
        return o;
    };
    function update() {
        list.forEach(o => {
            if (o.lines = {})
                if (o.onAfterUpdate) {
                    o.onAfterUpdate();
                }
        })
    };

    return {
        Block,
        Text,
        update,
    }
}
