import * as THREE from 'three';
import { DataModel } from '../../data_model.js';
import { Model3DScene } from '../scene_objects/model3d_scene.js';
import { Data } from '../../data_structs.js';

export function AssetSceneController() {
    let mScene = new THREE.Scene();
    let mModel = new DataModel();

    let mAssetId = null;
    let mModel3DScene = new Model3DScene(mScene);
    let mModel3D = new Data.Model3D();

    let mEnvironmentBox;

    async function updateModel(model, assetUtil) {
        let oldModel = mModel;
        mModel = model;

        let story = mModel.getStory();
        let oldStory = oldModel.getStory();

        if (story.background != oldStory.background || !mScene.background) {
            if (story.background) {
                mEnvironmentBox = await assetUtil.loadEnvironmentCube(story.background);
            } else {
                mEnvironmentBox = await assetUtil.loadDefaultEnvironmentCube();
            }
            mScene.background = mEnvironmentBox;
        }
    }

    async function showAsset(assetId, assetUtil) {
        let asset = mModel.getAsset(assetId);
        if (!asset) { console.error("Invalid asset id"); return; }
        mModel3D = new Data.Model3D();
        mModel3D.assetId = assetId;
        mModel3DScene.update(mModel3D, null, assetUtil)
    }

    function onCameraMove() {
        // do something with regards to rearranging things. 
    }

    this.updateModel = updateModel;
    this.showAsset = showAsset;
    this.onCameraMove = onCameraMove;
    this.getScene = () => mScene;
}