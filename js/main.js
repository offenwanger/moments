import * as C from './constants.js';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Moment } from './moment.js';
import { Caption } from './caption.js';
import { HighlightRing } from './highlight_ring.js';
import { InputManager } from './input_manager.js';

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

    const mEnvironmentBox = getEnvBox();

    const mScene = new THREE.Scene();
    mScene.background = mEnvironmentBox;

    const mMoments = getMoments();
    sortMoments();
    const mHighlightRing = new HighlightRing(mScene);

    const light = new THREE.DirectionalLight(0xFFFFFF, 3);
    light.position.set(- 1, 2, 4);
    mScene.add(light);

    const mInputManager = new InputManager(mCamera, mRenderer, mScene);
    mInputManager.setCameraPositionChangeCallback(() => {
        sortMoments();
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

        for (let i = 0; i < mMoments.length; i++) {
            if (clock.getElapsedTime() > 0.015) { break; }
            mMoments[i].update(cameras);
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
            let lookTarget = mInputManager.getLookTarget(mCamera, mMoments);
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
            } else if (lookTarget.type == C.LookTarget.HORIZON_FORWARD) {
                // Get last moment viewing position
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
        mMoments.forEach(moment => {
            moment.animate(time);
        })

        // render the interaction target first
        if (clock.getElapsedTime() < 0.02 && interactionTarget) {
            interactionTarget.setBlur(false);
            interactionTarget.render();
        }
        for (let i = 0; i < mMoments.length; i++) {
            if (mMoments[i] == interactionTarget) continue;
            if (clock.getElapsedTime() < 0.02) {
                mMoments[i].setBlur(false);
                mMoments[i].render();
            } else {
                // if we've going to drop below 60fps, stop rendering
                mMoments[i].setBlur(true);
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

    function sortMoments() {
        // sort the moments by their distance on t, i.e. how far they are 
        // from the time point the user is standing on. Only changes when the user moves
        // then we can just check the moments whose tDist places them in
        // the walking area
        mMoments.forEach(moment => {
            moment.tDist = mCamera.position.distanceTo(moment.getPosition());
        })
        mMoments.sort((a, b) => a.tDist - b.tDist)
    }

    function getEnvBox() {
        let cubeLoader = new THREE.CubeTextureLoader();
        cubeLoader.setPath('assets/envbox/');
        return cubeLoader.load([
            'px.jpg', 'nx.jpg',
            'py.jpg', 'ny.jpg',
            'pz.jpg', 'nz.jpg'
        ]);
    }

    function getMoments() {
        let result = [];

        let testCount = 16;
        for (let i = 0; i < testCount; i++) {
            let m = new Moment(mScene);
            m.setEnvBox(mEnvironmentBox);

            m.setPosition(new THREE.Vector3(
                Math.sin(Math.PI * 3 * i / testCount) * 2 + i / 4,
                Math.cos(Math.PI * 3 * i / testCount) * 2 + i / 4,
                Math.cos(Math.PI * 3 * i / testCount) * -2 + i / 4))
            m.setSize(0.5 + (i % 4) / 8)
            m.setOrientation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * (i % 8) / 8))

            result.push(m)
        }

        [{ offset: { x: 1, y: 1 }, moment: 0, root: new THREE.Vector3(-15.1, 7, -0.5), text: 'Things are less significant if I am talking. Unfourtunatly, I do need to say things in order to test the speech bubbles.' },
        { offset: { x: 0.75, y: 1.5 }, moment: 2, root: new THREE.Vector3(-15.1, 2.2, 1.2), text: 'There are sometimes things to say.' },
        { offset: { x: -0.25, y: 1.25 }, moment: 2, root: new THREE.Vector3(0, 0, 2), text: 'and they must be readable', },
        { offset: { x: 1.5, y: 0 }, moment: 3, root: new THREE.Vector3(0, 0, 2), text: 'And they could go anywhere', },
        { offset: { x: 0, y: -1.5 }, moment: 4, root: new THREE.Vector3(0, 0, 2), text: 'Anywhere at all', },
        ].forEach(c => {
            let caption = new Caption(mScene);
            caption.setText(c.text);
            caption.setOffset(c.offset);
            caption.setRoot(c.root);
            result[c.moment].addCaption(caption);
        })

        return result;
    }

}

main();