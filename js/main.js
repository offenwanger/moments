import * as C from './constants.js';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { HighlightRing } from './highlight_ring.js';
import { InputManager } from './input_manager.js';
import { Storyline } from './storyline.js';

function main() {
    const MOMENT_DRAG = 'draggingMoment';

    const mRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.querySelector('#c') });
    mRenderer.xr.enabled = true;
    document.body.appendChild(VRButton.createButton(mRenderer));

    const fov = 75;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 200;

    let mInteraction = false;

    const mCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    mCamera.position.set(0, 1.6, 0);

    const mScene = new THREE.Scene();
    const mHighlightRing = new HighlightRing(mScene);

    const light = new THREE.DirectionalLight(0xFFFFFF, 3);
    light.position.set(- 1, 2, 4);
    mScene.add(light);

    const mStoryline = new Storyline(mScene);
    mStoryline.loadFromObject("don't have yet");
    mStoryline.sortMoments(mCamera.position.clone())

    const mInputManager = new InputManager(mCamera, mRenderer, mScene);
    mInputManager.setCameraPositionChangeCallback(() => {
        mStoryline.sortMoments(mCamera.position.clone());
    })
    mInputManager.setDragStartCallback(moment => {
        mInteraction = {
            type: MOMENT_DRAG,
            moment,
            cameraStartPos: mCamera.position.clone(),
            toMoment: new THREE.Vector3().subVectors(moment.getPosition(), mCamera.position).applyQuaternion(mCamera.quaternion.clone().invert())
        }
        mHighlightRing.hide();
    });
    mInputManager.setDragEndCallback(() => {
        mInteraction = false;
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

        let cameras;
        if (mRenderer.xr.isPresenting) {
            cameras = mRenderer.xr.getCamera().cameras;
        } else {
            cameras = [mCamera]
        }

        let momentsArr = mStoryline.getMoments();

        for (let i = 0; i < momentsArr.length; i++) {
            if (clock.getElapsedTime() > 0.015) { break; }
            momentsArr[i].update(cameras);
        }

        let interactionTarget;
        if (mInteraction) {
            if (mInteraction.type == MOMENT_DRAG) {
                interactionTarget = mInteraction.moment;
                mInteraction.moment.setPosition(
                    mInteraction.toMoment.clone()
                        .applyQuaternion(mCamera.quaternion)
                        .add(mInteraction.cameraStartPos))
            } else {
                console.error("Not supported!", mInteraction);
            }
        } else {
            let lookTarget = mInputManager.getLookTarget(mCamera, momentsArr);
            if (lookTarget.type == C.LookTarget.MOMENT) {
                mHighlightRing.setPosition(lookTarget.moment.getPosition()
                    .add(new THREE.Vector3(0, -lookTarget.moment.getSize(), 0)))
                mHighlightRing.show();
                interactionTarget = lookTarget.moment;
            } else if (lookTarget.type == C.LookTarget.GROUND) {
                mHighlightRing.setPosition(lookTarget.position);
                mHighlightRing.show();
            } else if (lookTarget.type == C.LookTarget.HORIZON_FORWARD) {
                // Get next moment viewing position
                mHighlightRing.hide();
            } else if (lookTarget.type == C.LookTarget.HORIZON_BACKWARD) {
                // Get last moment viewing position
                mHighlightRing.hide();
            } else if (lookTarget.type == C.LookTarget.UP) {
                mHighlightRing.hide();
                // show the exit
            } else if (lookTarget.type == C.LookTarget.NONE) {
                mHighlightRing.hide();
            } else {
                console.error("Type not supported!", lookTarget);
            }
        }

        // chop the animation time out of rendering, it should be cheap
        momentsArr.forEach(moment => {
            moment.animate(time);
        })

        // render the interaction target first
        if (clock.getElapsedTime() < 0.02 && interactionTarget) {
            interactionTarget.setBlur(false);
            interactionTarget.render();
        }
        for (let i = 0; i < momentsArr.length; i++) {
            if (momentsArr[i] == interactionTarget) continue;
            if (clock.getElapsedTime() < 0.02) {
                momentsArr[i].setBlur(false);
                momentsArr[i].render();
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