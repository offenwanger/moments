import * as THREE from 'three';

import { DataModel } from "../data_model.js";
import { StorylineController } from "./storyline_controller.js";
import { AssetUtil } from '../utils/assets_util.js';

export function StoryController(scene) {
    let mModel = new DataModel();
    let mStorylineController = new StorylineController(scene);

    let mEnvironmentBox;

    async function updateModel(model) {
        mModel = model;
        mStorylineController.updateModel(mModel);
        if (mModel.getStory().background) {
            mEnvironmentBox = await AssetUtil.loadEnvironmentCube(mModel.getStory().background);
        } else {
            mEnvironmentBox = await AssetUtil.loadDefaultEnvironmentCube();
        }
        scene.background = mEnvironmentBox;
    }

    this.getMoments = mStorylineController.getMoments;
    this.sortMoments = mStorylineController.sortMoments;
    this.worldToLocalPosition = mStorylineController.worldToLocalPosition;
    this.worldToLocalRotation = mStorylineController.worldToLocalRotation;
    this.getPathLine = mStorylineController.getPathLine;
    this.localToWorldPosition = mStorylineController.localToWorldPosition;
    this.localToWorldRotation = mStorylineController.localToWorldRotation;
    this.updateModel = updateModel;
}

