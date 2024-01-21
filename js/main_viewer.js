import * as C from './constants.js';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { HighlightRing } from './highlight_ring.js';
import { InputManager } from './input_manager.js';
import { Storyline } from './storyline.js';
import { ServerUtil } from './utils/server_util.js';

function main() {
    const MOMENT_DRAG = 'draggingMoment';

    const mRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.querySelector('#viewer') });
    mRenderer.xr.enabled = true;
    document.body.appendChild(VRButton.createButton(mRenderer));

    const fov = 75;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 200;

    const USER_HEIGHT = 1.6;

    let mInteraction = false;
    // A value between 0 and 1;
    let mTPosition = 0;
    let mLastLookTarget = false;

    const mCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    mCamera.position.set(0, USER_HEIGHT, 0);

    const mScene = new THREE.Scene();
    const mHighlightRing = new HighlightRing(mScene);

    const light = new THREE.DirectionalLight(0xFFFFFF, 3);
    light.position.set(- 1, 2, 4);
    mScene.add(light);

    const mStoryline = new Storyline(mScene);

    const mStoryName = new URLSearchParams(window.location.search).get("story");
    if (!mStoryName) { console.error("Story not set!") } else {
        ServerUtil.fetchStory(mStoryName).then(storyObj => {
            mStoryline.loadFromObject(storyObj);
            mStoryline.update(0, 0);
            mStoryline.sortMoments(mStoryline.worldToLocalPosition(mCamera.position));
        });
    }

    const mInputManager = new InputManager(mCamera, mRenderer, mScene);
    mInputManager.setCameraPositionChangeCallback(() => {
        mStoryline.sortMoments(mStoryline.worldToLocalPosition(mCamera.position));
    });
    mInputManager.setDragStartCallback(moment => {
        mInteraction = {
            type: MOMENT_DRAG,
            moment,
            cameraStartPos: mCamera.position.clone(),
            toMoment: new THREE.Vector3().subVectors(mStoryline.localToWorldPosition(moment.getPosition()), mCamera.position).applyQuaternion(mCamera.quaternion.clone().invert())
        }
        mHighlightRing.hide();
    });
    mInputManager.setDragEndCallback(() => {
        mInteraction = false;
    });
    mInputManager.setClickCallback(() => {
        if (!mLastLookTarget) return;
        if (mLastLookTarget.type == C.LookTarget.LINE_SURFACE) {
            let zeroT = mTPosition;

            let userPosition = mStoryline.worldToLocalPosition(mCamera.position);
            let userClosestPoint = mStoryline.getPathLine().getClosestPoint(userPosition);

            let position = mStoryline.worldToLocalPosition(mLastLookTarget.position)
            let closestPoint = mStoryline.getPathLine().getClosestPoint(position);
            let offset = new THREE.Vector3()
                .subVectors(position, closestPoint.position)
                .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), closestPoint.tangent));

            mTPosition = closestPoint.t + zeroT - userClosestPoint.t;
            mTPosition = Math.max(0, Math.min(1, mTPosition));

            mStoryline.update(mTPosition, offset.x);
        }
    });

    function render(time) {
        time *= 0.001;
        let clock = new THREE.Clock();
        clock.start();

        if (resizeRendererToDisplaySize(mRenderer)) {
            const canvas = mRenderer.domElement;
            mCamera.aspect = canvas.clientWidth / canvas.clientHeight;
            mCamera.updateProjectionMatrix();
        }

        let momentsArr = mStoryline.getMoments();
        let localCameraPos = mStoryline.worldToLocalPosition(mCamera.position);

        for (let i = 0; i < momentsArr.length; i++) {
            if (clock.getElapsedTime() > 0.015) { break; }
            momentsArr[i].update(localCameraPos);
        }

        let interactionTarget;
        if (mInteraction) {
            if (mInteraction.type == MOMENT_DRAG) {
                interactionTarget = mInteraction.moment;
                let newWorldPos = mInteraction.toMoment.clone()
                    .applyQuaternion(mCamera.quaternion)
                    .add(mCamera.position);
                mInteraction.moment.setPosition(mStoryline.worldToLocalPosition(newWorldPos))
            } else {
                console.error("Not supported!", mInteraction);
            }
        } else {
            mLastLookTarget = mInputManager.getLookTarget(mCamera, mStoryline);
            if (mLastLookTarget.type == C.LookTarget.MOMENT) {
                let worldPos = mStoryline.localToWorldPosition(mLastLookTarget.moment.getPosition());
                worldPos.add(new THREE.Vector3(0, -mLastLookTarget.moment.getSize(), 0))
                mHighlightRing.setPosition(worldPos)
                mHighlightRing.rotateUp();
                mHighlightRing.show();
                interactionTarget = mLastLookTarget.moment;
            } else if (mLastLookTarget.type == C.LookTarget.LINE_SURFACE) {
                mHighlightRing.setPosition(mLastLookTarget.position)
                mHighlightRing.rotateUp(mLastLookTarget.normal);
                mHighlightRing.show();
            } else if (mLastLookTarget.type == C.LookTarget.UP) {
                mHighlightRing.hide();
                // show the exit
            } else if (mLastLookTarget.type == C.LookTarget.NONE) {
                mHighlightRing.hide();
            } else {
                console.error("Type not supported!", mLastLookTarget);
            }
        }

        // chop the animation time out of rendering, it should be cheap
        momentsArr.forEach(moment => {
            moment.animate(time);
        })

        let cameraPosition1 = null;
        let cameraPosition2 = null;
        if (mRenderer.xr.isPresenting) {
            let cameras = mRenderer.xr.getCamera().cameras;
            cameraPosition1 = mStoryline.worldToLocalPosition(cameras[0].position)
            cameraPosition2 = mStoryline.worldToLocalPosition(cameras[1].position)
        } else {
            cameraPosition1 = mStoryline.worldToLocalPosition(mCamera.position)
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
        mHighlightRing.animate(time);

        mRenderer.render(mScene, mCamera);
    }
    mRenderer.setAnimationLoop(render);

    function resizeRendererToDisplaySize(mRenderer) {
        const canvas = mRenderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            mRenderer.setSize(width, height, false);
        }

        return needResize;
    }
}

main();