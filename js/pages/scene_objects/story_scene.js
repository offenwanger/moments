import * as THREE from 'three';
import { DataModel } from "../../data_model.js";
import { AnnotationScene } from "./annotation_scene.js";
import { Model3DScene } from "./model3d_scene.js";
import { MomentScene } from "./moment_scene.js";
import { PointerScene } from "./pointer_scene.js";
import { SceneUtil } from '../../utils/scene_util.js';

export function StoryScene(parent) {
    let mModel = new DataModel();

    let mStoryGroup = new THREE.Group();
    parent.add(mStoryGroup);

    let mLight = new THREE.DirectionalLight(0xFFFFFF, 3);
    mLight.position.set(- 1, 2, 4);
    mStoryGroup.add(mLight);

    let mModel3DScenes = []
    let mMomentScenes = [];
    let mAnnotationScenes = [];
    let mPointerScenes = [];

    async function updateModel(model, assetUtil) {
        mModel = model;
        let story = mModel.getStory();

        await SceneUtil.syncArray(mModel3DScenes, story.model3Ds, mModel, assetUtil, async (model3D) => {
            let newModel3DScene = new Model3DScene(mStoryGroup);
            await newModel3DScene.update(model3D, mModel, assetUtil)
            return newModel3DScene;
        });

        await SceneUtil.syncArray(mMomentScenes, story.moments, mModel, assetUtil, async (moment) => {
            let newMomentScene = new MomentScene(mStoryGroup);
            await newMomentScene.update(moment, mModel, assetUtil)
            newMomentScene.render();
            return newMomentScene;
        });

        await SceneUtil.syncArray(mAnnotationScenes, story.annotations, mModel, assetUtil, async (annotation) => {
            let newAnnotationScene = new AnnotationScene(mStoryGroup);
            await newAnnotationScene.update(annotation, mModel, assetUtil)
            return newAnnotationScene;
        });

        await SceneUtil.syncArray(mPointerScenes, story.pointers, mModel, assetUtil, async (pointer) => {
            let newPointerScene = new PointerScene(mStoryGroup);
            await newPointerScene.update(pointer, mModel, assetUtil)
            return newPointerScene;
        });
    }


    function render() {

    }

    function onCameraMove(globalPosition) {
        let localPosition = globalToLocalPosition(globalPosition);
        mMomentScenes.forEach(moment => {
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