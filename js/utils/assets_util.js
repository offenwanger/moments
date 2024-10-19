import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AssetTypes, BOX_ASSET_PREFIXES } from '../constants.js';
import { Data } from "../data.js";

export function AssetUtil(workspace) {
    let mWorkspace = workspace;
    let mModel = new Data.StoryModel();

    let mLoadedAssets = {};

    function updateModel(model) {
        let newAssetIds = model.assets.map(a => a.id);
        Object.keys(mLoadedAssets).forEach(id => {
            if (!newAssetIds.includes(id)) { delete mLoadedAssets[id]; }
        })
        mModel = model;
    }

    async function loadEnvironmentCube(assetId) {
        let asset = mModel.getAsset(assetId);
        if (!asset || asset.type != AssetTypes.BOX) { console.error("Invalid cube asset!", assetId, asset); return loadDefaultEnvironmentCube(); }
        let files = [];
        for (const prefix of BOX_ASSET_PREFIXES) {
            let filename = prefix + asset.filename;
            files.push(await mWorkspace.getAssetAsDataURI(filename))
        }
        let cubeLoader = new THREE.CubeTextureLoader();
        return cubeLoader.load(files)
    }

    async function loadDefaultEnvironmentCube() {
        if (!mLoadedAssets['DEFAULT_ENV_BOX']) { // loaded from the web server.
            let files = BOX_ASSET_PREFIXES.map(f => f + "default.png");
            let cubeLoader = new THREE.CubeTextureLoader();
            cubeLoader.setPath('assets/default_env_box/')
            mLoadedAssets['DEFAULT_ENV_BOX'] = cubeLoader.load(files);
        }

        return mLoadedAssets['DEFAULT_ENV_BOX'];
    }

    async function loadImage(assetId) {
        let asset = mModel.getAsset(assetId);
        if (!asset || asset.type != AssetTypes.IMAGE) { console.error("Invalid image asset!", assetId, asset); return; }
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

    async function loadAssetModel(assetId) {
        let asset = mModel.find(assetId);
        if (!asset || asset.type != AssetTypes.MODEL) { console.error("Bad asset", assetId, asset); throw new Error("Invalid model asset: " + assetId); }
        let model = await loadGLTFModel(asset.filename);
        return model;
    }

    async function loadGLTFModel(filename) {
        let dataUri = await mWorkspace.getAssetAsDataURI(filename)
        const modelLoader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('./node_modules/three/examples/jsm/libs/draco/');
        modelLoader.setDRACOLoader(dracoLoader);
        let model = await modelLoader.loadAsync(dataUri, null,
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

    this.updateModel = updateModel;
    this.loadEnvironmentCube = loadEnvironmentCube;
    this.loadDefaultEnvironmentCube = loadDefaultEnvironmentCube;
    this.loadImage = loadImage;
    this.loadTexture = loadTexture;
    this.loadTextureSync = loadTextureSync;
    this.loadGLTFModel = loadGLTFModel;
    this.loadAssetModel = loadAssetModel;
}