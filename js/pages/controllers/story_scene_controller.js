import * as THREE from 'three';
import { StoryWrapper } from '../scene_objects/story_wrapper.js';
import { DataModel } from '../../data_model.js';

export function StoryWrapperController() {
    let mScene = new THREE.Scene();
    let mContent = new THREE.Group();
    mScene.add(mContent);
    let mStoryWrapper = new StoryWrapper(mContent);
    let mModel = new DataModel();

    let mEnvironmentBox;

    function onCameraMove(globalPosition) {
        mStoryWrapper.onCameraMove(globalPosition)
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

        await mStoryWrapper.updateModel(model, assetUtil);
    }

    function getIntersections(ray) {
        return [...mStoryWrapper.getIntersections(ray)]
    }

    this.updateModel = updateModel;
    this.getIntersections = getIntersections;
    this.onCameraMove = onCameraMove;
    this.getScene = () => mScene;
    this.getContent = () => mContent;
    this.setScale = (scale) => mContent.scale.set(scale, scale, scale);
}