import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AssetTypes, BOX_ASSET_PREFIXES } from '../constants.js';
import { Data } from "../data.js";
import { logInfo } from './log_util.js';

export function AssetUtil(workspace) {
    let mWorkspace = workspace;
    let mModel = new Data.StoryModel();
    const mAudioLoader = new THREE.AudioLoader();

    let mLoadedAssets = {};
    let mLoadedFiles = {};
    let mAssetAges = {};

    const mImageLoader = new THREE.ImageLoader();

    function updateModel(model) {
        let newAssetIds = model.assets.map(a => a.id);
        Object.keys(mLoadedAssets).forEach(id => {
            if (!newAssetIds.includes(id)) { delete mLoadedAssets[id]; }
        })
        model.assets.forEach(a => {
            if (mAssetAges[a.id] && a.updated > mAssetAges[a.id]) {
                // if the file has been updated remove this from the cache. 
                delete mLoadedAssets[a.id];
                delete mAssetAges[a.id];
                delete mLoadedFiles[a.filename];
            }
        })
        mModel = model;
    }

    async function loadEnvironmentCube(assetId) {
        if (!mLoadedAssets[assetId]) {
            let asset = mModel.getAsset(assetId);
            if (!asset || asset.type != AssetTypes.BOX) { console.error("Invalid cube asset!", assetId, asset); return loadDefaultEnvironmentCube(); }
            let files = [];
            for (const prefix of BOX_ASSET_PREFIXES) {
                let filename = prefix + asset.filename;
                files.push(await mWorkspace.getAssetAsDataURI(filename))
            }
            let cubeLoader = new THREE.CubeTextureLoader();
            mLoadedAssets[assetId] = cubeLoader.load(files)
            mAssetAges[assetId] = asset.updated;
        }
        if (!mLoadedAssets[assetId]) { console.error('Failed to load asset: ' + assetId); return null; }
        return mLoadedAssets[assetId];
    }

    async function loadImage(assetId) {
        try {
            if (!mLoadedAssets[assetId]) {
                let asset = mModel.find(assetId);
                if (!asset) { console.error("Invalid image asset: " + assetId, asset); throw new Error("Invalid model asset: " + assetId); }
                let uri = await mWorkspace.getAssetAsDataURI(asset.filename);
                let image = await mImageLoader.loadAsync(uri, null, null, function (error) { console.error('Error loading image', error); });
                mLoadedAssets[assetId] = image;
                mAssetAges[assetId] = asset.updated;
            }
            if (!mLoadedAssets[assetId]) { console.error('Failed to load asset: ' + assetId); return null; }
            return mLoadedAssets[assetId];
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    async function loadAssetModel(assetId) {
        let asset = mModel.find(assetId);
        if (!asset || asset.type != AssetTypes.MODEL) { console.error("Bad asset", assetId, asset); throw new Error("Invalid model asset: " + assetId); }
        let model = await loadGLTFModel(asset.filename);
        mAssetAges[assetId] = asset.updated;

        if (!model) { console.error('Failed to load asset: ' + assetId); return null; }
        return model.scene;
    }

    async function loadGLTFModel(filename) {
        if (!mLoadedFiles[filename]) {
            mLoadedFiles[filename] = await mWorkspace.getAssetAsDataURI(filename)
        }
        if (!mLoadedFiles[filename]) { console.error("failed to load file: " + filename); return null; }

        const modelLoader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('./node_modules/three/examples/jsm/libs/draco/');
        modelLoader.setDRACOLoader(dracoLoader);
        let model = await modelLoader.loadAsync(mLoadedFiles[filename], null,
            // called while loading is progressing
            function (xhr) {
                logInfo(file + " "(xhr.loaded / xhr.total * 100) + '% loaded');
            },
            // called when loading has errors
            function (error) {
                console.error('An error happened', error);
            }
        );
        return model;
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

    async function loadAudioBuffer(assetId) {
        try {
            if (!mLoadedAssets[assetId]) {
                let asset = mModel.assets.find(a => a.id == assetId);
                if (!asset) {
                    console.error("Invalid audio asset: " + assetId);
                    throw new Error("Invalid model asset: " + assetId);
                }
                let uri = await mWorkspace.getAssetAsDataURI(asset.filename);
                let buffer = await new Promise((resolve, reject) => mAudioLoader.load(uri, resolve, null, reject));
                mLoadedAssets[assetId] = buffer;
                mAssetAges[assetId] = asset.updated;
            }
            if (!mLoadedAssets[assetId]) { console.error('Failed to load asset: ' + assetId); return null; }
            return mLoadedAssets[assetId];
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    this.updateModel = updateModel;
    this.loadEnvironmentCube = loadEnvironmentCube;
    this.loadDefaultEnvironmentCube = loadDefaultEnvironmentCube;
    this.loadImage = loadImage;
    this.loadGLTFModel = loadGLTFModel;
    this.loadAssetModel = loadAssetModel;
    this.loadAudioBuffer = loadAudioBuffer;
    this.getAssetAge = (id) => mAssetAges[id];
}