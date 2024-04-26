import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { USER_HEIGHT } from '../../constants.js';
import { DataModel } from "../../data_model.js";
import { Data } from '../../data_structs.js';
import { StoryScene } from '../scene_objects/story_scene.js';
import { SceneInputController } from './scene_input_controller.js';

export function StoryDisplayController(parentContainer) {
    let mModel = new DataModel();
    let mStory = new Data.Story();

    let mWidth = 100;
    let mHeight = 100;

    let mMainCanvas = parentContainer.append('canvas')
        .attr('id', 'main-canvas')
        .style('display', 'block')

    const fov = 75, aspect = 2, near = 0.1, far = 200;
    const mCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    mCamera.position.set(0, USER_HEIGHT, 0);

    let mScene = new THREE.Scene();
    let mEnvironmentBox;
    let mStoryScene = new StoryScene(mScene);

    let mRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: mMainCanvas.node() });
    mRenderer.xr.enabled = true;
    mRenderer.setAnimationLoop(render);

    let vrButton = VRButton.createButton(mRenderer);
    let vrButtonDiv = parentContainer.append("div")
        .style('position', 'absolute')
        .style('top', '40px')
        .style('left', '20px')
    vrButtonDiv.node().appendChild(vrButton);
    d3.select(vrButton).style("position", "relative")

    let mSceneInputController = new SceneInputController(mCamera, mRenderer, mScene);
    mSceneInputController.setCameraPositionChangeCallback(() => {
        mStoryScene.onCameraMove(mCamera.position);
    });

    mSceneInputController.setDragStartCallback(() => {

    })

    mSceneInputController.setDragEndCallback(() => {

    });

    mSceneInputController.setClickCallback(() => {

    });

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

    function onResize(width, height) {
        mWidth = width;
        mHeight = height;

        if (!mRenderer) return;
        mRenderer.setSize(width, height, false);

        mCamera.aspect = width / height;
        mCamera.updateProjectionMatrix();
    }

    function render(time) {
        mRenderer.render(mScene, mCamera);
    }

    /*

    function onCameraPositionChange() {
        mStoryDisplayController.sortMoments(mStoryDisplayController.worldToLocalPosition(mCamera.position));
    }

    function onMomentDrag(moment) {
        mInteraction = {
            type: MOMENT_DRAG,
            moment,
            cameraStartPos: mCamera.position.clone(),
            toMoment: new THREE.Vector3().subVectors(mStoryDisplayController.localToWorldPosition(moment.getPosition()), mCamera.position).applyQuaternion(mCamera.quaternion.clone().invert())
        }
        mHighlightRingController.hide();
    }

    function onMomentDragEnd() {
        mInteraction = false;
    }

    function onClick() {
        if (!mLastLookTarget) return;
        if (mLastLookTarget.type == LookTarget.LINE_SURFACE) {
            let zeroT = mTPosition;

            let userPosition = mStoryDisplayController.worldToLocalPosition(mCamera.position);
            let userClosestPoint = mStoryDisplayController.getPathLine().getClosestPoint(userPosition);

            let position = mStoryDisplayController.worldToLocalPosition(mLastLookTarget.position)
            let closestPoint = mStoryDisplayController.getPathLine().getClosestPoint(position);
            let offset = new THREE.Vector3()
                .subVectors(position, closestPoint.position)
                .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), closestPoint.tangent));

            mTPosition = closestPoint.t + zeroT - userClosestPoint.t;
            mTPosition = Math.max(0, Math.min(1, mTPosition));

            mStoryDisplayController.update(mTPosition, offset.x);
        }
    }

    function render(time) {
        time *= 0.001;
        let clock = new THREE.Clock();
        clock.start();

        // let localCameraPos = mStoryDisplayController.worldToLocalPosition(mCamera.position);

        // for (let i = 0; i < momentsArr.length; i++) {
        //     if (clock.getElapsedTime() > 0.015) { break; }
        //     momentsArr[i].update(localCameraPos);
        // }

        let interactionTarget;
        if (mInteraction) {
            if (mInteraction.type == MOMENT_DRAG) {
                interactionTarget = mInteraction.moment;
                let newWorldPos = mInteraction.toMoment.clone()
                    .applyQuaternion(mCamera.quaternion)
                    .add(mCamera.position);
                mInteraction.moment.setPosition(mStoryDisplayController.worldToLocalPosition(newWorldPos))
            } else {
                console.error("Not supported!", mInteraction);
            }
        } else {
            let mLastLookTarget = {}//mSceneInputController.getLookTarget(mCamera, mStoryDisplayController);
            if (mLastLookTarget.type == LookTarget.MOMENT) {
                let worldPos = mStoryDisplayController.localToWorldPosition(mLastLookTarget.moment.getPosition());
                worldPos.add(new THREE.Vector3(0, -mLastLookTarget.moment.getSize(), 0))
                mHighlightRingController.setPosition(worldPos)
                mHighlightRingController.rotateUp();
                mHighlightRingController.show();
                interactionTarget = mLastLookTarget.moment;
            } else if (mLastLookTarget.type == LookTarget.LINE_SURFACE) {
                mHighlightRingController.setPosition(mLastLookTarget.position)
                mHighlightRingController.rotateUp(mLastLookTarget.normal);
                mHighlightRingController.show();
            } else if (mLastLookTarget.type == LookTarget.UP) {
                mHighlightRingController.hide();
                // show the exit
            } else if (mLastLookTarget.type == LookTarget.NONE) {
                mHighlightRingController.hide();
            } else {
                console.error("Type not supported!", mLastLookTarget);
            }
        }

        // chop the animation time out of rendering, it should be cheap
        // momentsArr.forEach(moment => {
        //     moment.animate(time);
        // })

        let cameraPosition1 = null;
        let cameraPosition2 = null;
        if (mRenderer.xr.isPresenting) {
            let cameras = mRenderer.xr.getCamera().cameras;
            // cameraPosition1 = mStoryDisplayController.worldToLocalPosition(cameras[0].position)
            // cameraPosition2 = mStoryDisplayController.worldToLocalPosition(cameras[1].position)
        } else {
            // cameraPosition1 = mStoryDisplayController.worldToLocalPosition(mCamera.position)
        }

        // render the interaction target first
        if (clock.getElapsedTime() < 0.02 && interactionTarget) {
            interactionTarget.setBlur(false);
            interactionTarget.render(cameraPosition1, cameraPosition2);
        }
        for (let i = 0; i < momentsArr.length; i++) {
            if (momentsArr[i] == interactionTarget) continue;
            if (clock.getElapsedTime() < 0.02) {
                momentsArr[i].setBlur(false);
                momentsArr[i].render(cameraPosition1, cameraPosition2);
            } else {
                // if we've going to drop below 60fps, stop rendering
                momentsArr[i].setBlur(true);
            }
        }
        mHighlightRingController.animate(time);

        mRenderer.render(mScene, mCamera);
    }


    // this.getMoments = mStorylineController.getMoments;
    // this.sortMoments = mStorylineController.sortMoments;
    // this.worldToLocalPosition = mStorylineController.worldToLocalPosition;
    // this.worldToLocalRotation = mStorylineController.worldToLocalRotation;
    // this.getPathLine = mStorylineController.getPathLine;
    // this.localToWorldPosition = mStorylineController.localToWorldPosition;
    // this.localToWorldRotation = mStorylineController.localToWorldRotation;

    */

    this.updateModel = updateModel;
    this.onResize = onResize;
}

