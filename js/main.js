import * as C from './constants.js';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { HighlightRing } from './highlight_ring.js';
import { InputManager } from './input_manager.js';
import { Storyline } from './storyline.js';
import { FileHandler } from './file_handler.js';
import { Util } from './utility.js';

function main() {
    const MOMENT_DRAG = 'draggingMoment';

    const mRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.querySelector('#c') });
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

    /////////////// this should be handled elsewhere ///////////
    let obj = FileHandler.loadStorylineFile();
    mStoryline.loadFromObject(obj);
    mStoryline.update(0, 0);
    mStoryline.sortMoments(mCamera.position.clone())
    ////////////////////////////////////////////////////////////

    const mInputManager = new InputManager(mCamera, mRenderer, mScene);
    mInputManager.setCameraPositionChangeCallback(() => {
        mStoryline.sortMoments(mCamera.position.clone());
    })
    mInputManager.setDragStartCallback(moment => {
        mInteraction = {
            type: MOMENT_DRAG,
            moment,
            cameraStartPos: mCamera.position.clone(),
            toMoment: new THREE.Vector3().subVectors(moment.getWorldPosition(), mCamera.position).applyQuaternion(mCamera.quaternion.clone().invert())
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

            let userPosition = mStoryline.worldToLocalPosition(mCamera.position.clone());
            let userClosestPoint = Util.getClosestPointOnLine(mStoryline.getPathLine().getLinePoints(), userPosition);

            let position = mStoryline.worldToLocalPosition(mLastLookTarget.position)
            let closestPoint = Util.getClosestPointOnLine(mStoryline.getPathLine().getLinePoints(), position);
            let offset = new THREE.Vector3()
                .subVectors(position, closestPoint.point)
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

        for (let i = 0; i < momentsArr.length; i++) {
            if (clock.getElapsedTime() > 0.015) { break; }
            momentsArr[i].update(mCamera.position);
        }

        let interactionTarget;
        if (mInteraction) {
            if (mInteraction.type == MOMENT_DRAG) {
                interactionTarget = mInteraction.moment;
                mInteraction.moment.setLocalPosition(
                    mStoryline.worldToLocalPosition(mInteraction.toMoment.clone()
                        .applyQuaternion(mCamera.quaternion)
                        .add(mInteraction.cameraStartPos)))
            } else {
                console.error("Not supported!", mInteraction);
            }
        } else {
            mLastLookTarget = mInputManager.getLookTarget(mCamera, mStoryline);
            if (mLastLookTarget.type == C.LookTarget.MOMENT) {
                mHighlightRing.setPosition(mLastLookTarget.moment.getWorldPosition()
                    .add(new THREE.Vector3(0, -mLastLookTarget.moment.getSize(), 0)))
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

        let cameras;
        if (mRenderer.xr.isPresenting) {
            cameras = mRenderer.xr.getCamera().cameras;
        } else {
            cameras = [mCamera]
        }

        // render the interaction target first
        if (clock.getElapsedTime() < 0.02 && interactionTarget) {
            interactionTarget.setBlur(false);
            interactionTarget.render(cameras);
        }
        for (let i = 0; i < momentsArr.length; i++) {
            if (momentsArr[i] == interactionTarget) continue;
            if (clock.getElapsedTime() < 0.02) {
                momentsArr[i].setBlur(false);
                momentsArr[i].render(cameras);
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