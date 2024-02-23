import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { AssetTypes, BOX_ASSET_PREFIXES } from '../constants.js';

async function loadEnvironmentCube(asset, workspace) {
    let files = [];
    if (!asset || asset.type != AssetTypes.BOX) { console.error("Invalid cube asset!", asset); return loadDefaultEnvironmentCube(); }
    for (const prefix of BOX_ASSET_PREFIXES) {
        let filename = prefix + asset.filename;
        files.push(await workspace.getImageAsset(filename))
    }
    let cubeLoader = new THREE.CubeTextureLoader();
    return cubeLoader.load(files)
}

async function loadDefaultEnvironmentCube() {
    let files = BOX_ASSET_PREFIXES.map(f => f + "default.png");
    let cubeLoader = new THREE.CubeTextureLoader();
    cubeLoader.setPath('assets/default_env_box/')
    return cubeLoader.load(files);
}

async function loadImage(file) {
    const imageLoader = new THREE.ImageLoader();
    let image = await imageLoader.loadAsync('assets/images/' + file, null, null, function (error) { console.error('Error loading image', error); });
    return image;
}

async function loadTexture(file) {
    const texttureLoader = new THREE.TextureLoader();
    let texture = await texttureLoader.loadAsync('./assets/images/' + file);
    return texture;
}

function loadTextureSync(file) {
    const texttureLoader = new THREE.TextureLoader();
    let texture = texttureLoader.load('./assets/images/' + file);
    return texture;
}

async function loadGLTFModel(file) {
    const modelLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('../module/three/examples/jsm/libs/draco/');
    modelLoader.setDRACOLoader(dracoLoader);
    let model = await modelLoader.loadAsync('assets/models/' + file, null,
        // called while loading is progressing
        function (xhr) {
            (console).log(file + " "(xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // called when loading has errors
        function (error) {
            console.error('An error happened', error);
        }
    );
    return model;
}

export const AssetUtil = {
    loadEnvironmentCube,
    loadDefaultEnvironmentCube,
    loadImage,
    loadTexture,
    loadTextureSync,
    loadGLTFModel,
}