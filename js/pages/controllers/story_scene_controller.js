import * as THREE from 'three';
import { EditMode } from '../../constants.js';
import { Data } from '../../data.js';
import { StoryWrapper } from '../scene_objects/story_wrapper.js';

export function StorySceneController() {
    let mScene = new THREE.Scene();
    let mContent = new THREE.Group();
    mScene.add(mContent);
    let mStoryWrapper = new StoryWrapper(mContent);
    let mModel = new Data.StoryModel();

    let mEnvironmentBox;

    function onUserMove(globalPosition) {
        mStoryWrapper.onUserMove(globalPosition)
    }

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

        await mStoryWrapper.updateModel(model, assetUtil);
    }

    function getTargets(ray) {
        return [...mStoryWrapper.getTargets(ray)]
    }

    function toSceneCoordinates(v) {
        let local = new THREE.Vector3().copy(v);
        mContent.worldToLocal(local)
        return local;
    }

    function setMode(mode) {
        if (mode == EditMode.MODEL) {
            setScale(1);
        } else if (mode == EditMode.WORLD) {
            setScale(0.5);
        } else if (mode == EditMode.TIMELINE) {
            setScale(0.1);
        }

        mStoryWrapper.setMode(mode);
    }

    function setScale(scale) {
        mContent.scale.set(scale, scale, scale);
    }

    this.updateModel = updateModel;
    this.getTargets = getTargets;
    this.onUserMove = onUserMove;
    this.toSceneCoordinates = toSceneCoordinates;
    this.setMode = setMode;
    this.setScale = setScale;
    this.getScene = () => mScene;
    this.getContent = () => mContent;
}