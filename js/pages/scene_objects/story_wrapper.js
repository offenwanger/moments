import * as THREE from 'three';
import { DataModel } from "../../data_model.js";
import { AnnotationWrapper } from "./annotation_wrapper.js";
import { Model3DWrapper } from "./model3D_wrapper.js";
import { MomentWrapper } from "./moment_wrapper.js";
import { PointerWrapper } from "./pointer_wrapper.js";
import { SceneUtil } from '../../utils/scene_util.js';

export function StoryWrapper(parent) {
    let mModel = new DataModel();

    let mStoryGroup = new THREE.Group();
    parent.add(mStoryGroup);

    let mLight = new THREE.DirectionalLight(0xFFFFFF, 3);
    mLight.position.set(- 1, 2, 4);
    mStoryGroup.add(mLight);

    let mModel3DWrappers = []
    let mMomentWrappers = [];
    let mAnnotationWrappers = [];
    let mPointerWrappers = [];

    async function updateModel(model, assetUtil) {
        mModel = model;
        let story = mModel.getStory();

        await SceneUtil.syncArray(mModel3DWrappers, story.model3Ds, mModel, assetUtil, async (model3D) => {
            let newModel3DWrapper = new Model3DWrapper(mStoryGroup);
            await newModel3DWrapper.update(model3D, mModel, assetUtil)
            return newModel3DWrapper;
        });

        await SceneUtil.syncArray(mMomentWrappers, story.moments, mModel, assetUtil, async (moment) => {
            let newMomentWrapper = new MomentWrapper(mStoryGroup);
            await newMomentWrapper.update(moment, mModel, assetUtil)
            newMomentWrapper.render();
            return newMomentWrapper;
        });

        await SceneUtil.syncArray(mAnnotationWrappers, story.annotations, mModel, assetUtil, async (annotation) => {
            let newAnnotationWrapper = new AnnotationWrapper(mStoryGroup);
            await newAnnotationWrapper.update(annotation, mModel, assetUtil)
            return newAnnotationWrapper;
        });

        await SceneUtil.syncArray(mPointerWrappers, story.pointers, mModel, assetUtil, async (pointer) => {
            let newPointerWrapper = new PointerWrapper(mStoryGroup);
            await newPointerWrapper.update(pointer, mModel, assetUtil)
            return newPointerWrapper;
        });
    }


    function render() {

    }

    function onCameraMove(globalPosition) {
        let localPosition = globalToLocalPosition(globalPosition);
        mMomentWrappers.forEach(moment => {
            moment.onCameraMove(localPosition)
        })
    }

    function globalToLocalPosition(globalPosition) {
        return globalPosition;
    }

    function localToGlobalPosition(localPosition) {
        return localPosition;
    }

    this.updateModel = updateModel;
    this.render = render;
    this.onCameraMove = onCameraMove;
}