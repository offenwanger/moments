import * as THREE from 'three';
import { StoryScene } from '../scene_objects/story_scene.js';
import { DataModel } from '../../data_model.js';

export function StorySceneController() {
    let mScene = new THREE.Scene();
    let mStoryScene = new StoryScene(mScene);
    let mModel = new DataModel();

    let mEnvironmentBox;

    function onCameraMove(globalPosition) {
        mStoryScene.onCameraMove(globalPosition)
    }

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

        await mStoryScene.updateModel(model, assetUtil);
    }

    this.updateModel = updateModel;
    this.onCameraMove = onCameraMove;
    this.getScene = () => mScene;
}