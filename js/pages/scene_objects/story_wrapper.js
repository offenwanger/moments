import * as THREE from 'three';
import { DataModel } from "../../data_model.js";
import { AnnotationWrapper } from "./annotation_wrapper.js";
import { Model3DWrapper } from "./model3D_wrapper.js";
import { SceneUtil } from '../../utils/scene_util.js';

export function StoryWrapper(parent) {
    let mModel = new DataModel();

    let mStoryGroup = new THREE.Group();
    parent.add(mStoryGroup);

    let mLight = new THREE.DirectionalLight(0xFFFFFF, 3);
    mLight.position.set(- 1, 2, 4);
    mStoryGroup.add(mLight);

    let mModel3DWrappers = [];
    let mAnnotationWrappers = [];

    async function updateModel(model, assetUtil) {
        mModel = model;
        let story = mModel.getStory();

        await SceneUtil.updateWrapperArray(mModel3DWrappers, story.model3Ds, mModel, assetUtil, async (model3D) => {
            let newModel3DWrapper = new Model3DWrapper(mStoryGroup);
            return newModel3DWrapper;
        });

        await SceneUtil.updateWrapperArray(mAnnotationWrappers, story.annotations, mModel, assetUtil, async (annotation) => {
            let newAnnotationWrapper = new AnnotationWrapper(mStoryGroup);
            return newAnnotationWrapper;
        });
    }


    function render() {

    }

    function onCameraMove(globalPosition) {
        
    }

    function globalToLocalPosition(globalPosition) {
        return globalPosition;
    }

    function localToGlobalPosition(localPosition) {
        return localPosition;
    }

    function getIntersections(ray) {
        return [
            ...mModel3DWrappers.map(w => w.getIntersections(ray)).flat(),
            ...mAnnotationWrappers.map(w => w.getIntersections(ray)).flat(),
        ]
    }

    this.updateModel = updateModel;
    this.render = render;
    this.onCameraMove = onCameraMove;
    this.getIntersections = getIntersections;
}