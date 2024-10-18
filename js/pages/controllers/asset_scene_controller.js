import * as THREE from 'three';
import { Data } from '../../data.js';
import { Model3DWrapper } from '../scene_objects/model3D_wrapper.js';

export function AssetSceneController() {
    let mScene = new THREE.Scene();
    let mContent = new THREE.Group();
    mScene.add(mContent);
    let mModel = new Data.StoryModel();

    let mAssetId = null;
    let mModel3D = new Data.Model3D();
    let mModel3DWrapper = new Model3DWrapper(mContent);

    let mEnvironmentBox;

    let mLight = new THREE.DirectionalLight(0xFFFFFF, 3);
    mLight.position.set(- 1, 2, 4);
    mScene.add(mLight);

    async function updateModel(model, assetUtil) {
        let oldModel = mModel;
        mModel = model;

        let story = mModel;
        let oldStory = oldModel;

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
        mModel3D.z = -1;
        mModel3D.assetId = assetId;
        await mModel3DWrapper.update(mModel3D, null, assetUtil)
    }

    function userMove(globalPosition) {
        // do something with regards to rearranging things. 
    }

    function getTargets(ray) {
        return [...mModel3DWrapper.getTargets(ray)];
    }

    this.updateModel = updateModel;
    this.showAsset = showAsset;
    this.getTargets = getTargets;
    this.userMove = userMove;
    this.updateOtherUser = () => { }
    this.removeOtherUser = () => { }
    this.addOtherUser = () => { }
    this.getScene = () => mScene;
    this.getContent = () => mContent;
    this.setMode = () => { };
    this.toSceneCoordinates = (v) => v;
    this.setScale = (scale) => mContent.scale.set(scale, scale, scale);
}