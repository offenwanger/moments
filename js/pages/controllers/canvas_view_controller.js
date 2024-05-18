import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { USER_HEIGHT } from '../../constants.js';

export function CanvasViewController(parentContainer, mScene, mStoryScene) {
    const INTERACTION_DISTANCE = 10;
    const MODE_CARDBOARD = 'cardboard';
    const MODE_SCREEN = 'screen';
    const MODE_HEADSET = 'headset';

    const fov = 75, aspect = 2, near = 0.1, far = 200;

    let mWidth = 10;
    let mHeight = 10;

    let mMainCanvas = parentContainer.append('canvas')
        .attr('id', 'main-canvas')
        .style('display', 'block')

    let mPageRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: mMainCanvas.node() });

    const mPageCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    mPageCamera.position.set(0, USER_HEIGHT, 0);

    function pageRender(time) {
        if (time < 0) return;
        mPageRenderer.render(mScene, mPageCamera);
    }

    /*
    This object manages the inputs for the various supported
    hardware configurations. 

    1. Phone - Orbit mOrbitControls
    2. Screen - Orbit mOrbitControls + trigger
    3. Cardboard - Gaze input + trigger
    4. Oculuslike - Gaze input + trigger + grab
     */

    let mClickCallback = () => { };

    let mDragStartCallback = () => { };
    let mDragEndCallback = () => { }

    let mMode = MODE_SCREEN;
    let mLastLookTarget;
    let mDragging = false;

    const mOrbitControls = new OrbitControls(mPageCamera, mPageRenderer.domElement);
    mOrbitControls.minDistance = 2;
    mOrbitControls.maxDistance = 2;
    mOrbitControls.target.set(0, 2, -2);
    mOrbitControls.update();
    mOrbitControls.addEventListener('change', () => {
        mStoryScene.onCameraMove(mPageCamera.position);
    })

    document.addEventListener('keydown', event => {
        if (event.code === 'Space' && !event.repeat) {
            onSelectStart()
        }
    })

    document.addEventListener('keyup', event => {
        if (event.code === 'Space') {
            onSelectEnd();
        }
    })

    // function getLookTarget(camera, storyController) {
    //     let moments = storyController.getMoments();
    //     let origin = storyController.worldToLocalPosition(camera.position);
    //     let lookDirection = storyController.worldToLocalRotation(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)).add(origin);
    //     for (let i = 0; i < moments.length; i++) {
    //         if (origin.distanceTo(moments[i].getPosition()) > INTERACTION_DISTANCE) { break; }
    //         let targeted = Util.hasSphereIntersection(origin, lookDirection, moments[i].getPosition(), moments[i].getSize());
    //         if (targeted) {
    //             mLastLookTarget = {
    //                 type: LookTarget.MOMENT,
    //                 moment: moments[i]
    //             };
    //             return mLastLookTarget;
    //         }
    //     }

    //     let lookAngles = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    //     // X => Pi/2 = straight up, -PI/2 straight down, 0 = horizon
    //     let upAngle = Math.PI * 7 / 8;

    //     if (lookAngles.x > upAngle) {
    //         mLastLookTarget = { type: LookTarget.UP };
    //         return mLastLookTarget;
    //     } else {
    //         let userPosition = storyController.worldToLocalPosition(camera.position);
    //         let userLookDirection = storyController.worldToLocalRotation(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion));
    //         let pathLineIntersection = pathLineTarget(userPosition, userLookDirection, storyController.getPathLine())
    //         if (pathLineIntersection.distance < INTERACTION_DISTANCE) {
    //             mLastLookTarget = {
    //                 type: LookTarget.LINE_SURFACE,
    //                 position: storyController.localToWorldPosition(pathLineIntersection.position),
    //                 normal: storyController.localToWorldRotation(pathLineIntersection.normal),
    //             };
    //         } else {
    //             mLastLookTarget = { type: LookTarget.NONE };
    //         }

    //         return mLastLookTarget;
    //     }
    // }

    function onSelectStart() {
        if (mLastLookTarget.type == LookTarget.MOMENT &&
            (mMode == MODE_CARDBOARD || mMode == MODE_SCREEN)) {
            mDragStartCallback(mLastLookTarget.moment);
            mDragging = true;
        }
    }

    function onSelectEnd() {
        if (mDragging) {
            mDragging = false;
            mDragEndCallback();
        } else if (mLastLookTarget.type == LookTarget.LINE_SURFACE ||
            mLastLookTarget.type == LookTarget.UP) {
            mClickCallback();
        }
    }


    function onResize(width, height) {
        mWidth = width;
        mHeight = height;

        if (!mPageRenderer) return;
        mPageRenderer.setSize(width, height, false);

        mPageCamera.aspect = width / height;
        mPageCamera.updateProjectionMatrix();
    }


    this.onResize = onResize;
    this.setClickCallback = (callback) => mClickCallback = callback;
    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setDragEndCallback = (callback) => mDragEndCallback = callback;

    this.startRendering = function () { mPageRenderer.setAnimationLoop(pageRender); }
    this.stopRendering = function () { mPageRenderer.setAnimationLoop(null); }
}