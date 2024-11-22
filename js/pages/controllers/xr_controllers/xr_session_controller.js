import * as THREE from 'three';
import { CCDIKHelper, CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRInteraction } from '../../../constants.js';
import { GLTKUtil } from '../../../utils/gltk_util.js';
import { Util } from '../../../utils/utility.js';
import { XRInputController } from './xr_input_controller.js';
import { XRPageInterfaceController } from './xr_page_interface_controller.js';

export function XRSessionController(mWebsocketController) {
    let mOnSessionStartCallback = () => { }
    let mOnSessionEndCallback = () => { }

    let mTransformCallback = async () => { }
    let mTransformManyCallback = async () => { }

    let mSystemState = {
        interactionType: XRInteraction.NONE,
        interactionData: {},
        mousePosition: null,
        mouseDown: false,
        session: null,
    }

    let mSceneController;
    let mXRPageInterfaceController = new XRPageInterfaceController();
    let mXRInputController = new XRInputController();

    let mIKSolver
    let mCCDIKHelper

    let mXRCanvas = document.createElement('canvas');
    mXRCanvas.height = 100;
    mXRCanvas.width = 100;

    let mXRRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: mXRCanvas });
    mXRRenderer.xr.enabled = true;
    mXRRenderer.xr.addEventListener('sessionstart', async () => {
        mSystemState.session = mXRRenderer.xr.getSession();
        setupListeners();
        mOnSessionStartCallback();

        await mXRPageInterfaceController.renderWebpage();
    })
    mXRRenderer.xr.addEventListener('sessionend', () => {
        mSystemState.session = null;
        mOnSessionEndCallback();
    })
    // Dumb bug workaround, makes it more convinient to enter XR
    mXRCanvas.addEventListener("webglcontextlost", async function (event) {
        (console).log("Terminating the failed session");
        mXRRenderer.xr.getSession().end();
    }, false);

    let vrButton = VRButton.createButton(mXRRenderer);

    mXRInputController.setupControllers(mXRRenderer.xr);

    function setSceneController(scene) {
        mSceneController = scene;
        mXRInputController.setSceneController(scene)
        mXRPageInterfaceController.setSceneController(scene)
    }

    function setupListeners() {
        if (!mSystemState.session) return;

        mSystemState.session.addEventListener('selectstart', async () => await mXRInputController.updateInteractionState(mSystemState));
        mSystemState.session.addEventListener('selectend', async () => await mXRInputController.updateInteractionState(mSystemState));
        mSystemState.session.addEventListener('squeezestart', async () => await mXRInputController.updateInteractionState(mSystemState));
        mSystemState.session.addEventListener('squeezeend', async () => await mXRInputController.updateInteractionState(mSystemState));
    }

    let lastSend = Date.now();
    async function xrRender(time) {
        if (time < 0) return;
        if (!mSceneController) return;

        mXRPageInterfaceController.userMoved(
            mXRInputController.getHeadPosition(),
            mXRInputController.getHeadDirection(),
            mXRInputController.getLeftControllerPosition(),
            mXRInputController.getLeftControllerOrientation(),
            mXRInputController.getRightControllerPosition(),
            mXRInputController.getRightControllerOrientation())

        mXRRenderer.render(mSceneController.getScene(), mXRInputController.getCamera());

        if (Date.now() - lastSend > 1000) {
            let pos = mXRInputController.getUserPosition();
            mWebsocketController.updateParticipant(pos.head, pos.handR, pos.handL);
        }

        if (mSystemState.interactionType != XRInteraction.NONE) updateInteractionObjects();
        await mXRInputController.updateInteractionState(mSystemState);

        if (mXRPageInterfaceController.isInteracting()) {
            await mXRPageInterfaceController.updateClickState(
                mXRInputController.getPrimaryRPressed());
        }
    }

    function updateInteractionObjects() {
        if (mSystemState.interactionType == XRInteraction.ONE_HAND_MOVE) {
            let controllerPos = mSystemState.interactionData.isLeft ?
                mXRInputController.getLeftControllerPosition() :
                mXRInputController.getRightControllerPosition()
            mSystemState.interactionData.rootTarget.setWorldPosition(
                new THREE.Vector3().addVectors(controllerPos, mSystemState.interactionData.targetPositionOffset));
        } else if (mSystemState.interactionType == XRInteraction.TWO_HAND_MOVE) {
            let left = mXRInputController.getLeftControllerPosition();
            let right = mXRInputController.getRightControllerPosition();
            let midpoint = new THREE.Vector3().addVectors(left, right).multiplyScalar(0.5);

            let newDirection = new THREE.Vector3().subVectors(left, right).normalize();
            let rotation = new THREE.Quaternion().setFromUnitVectors(mSystemState.interactionData.direction, newDirection);


            let newOrienatation = new THREE.Quaternion().multiplyQuaternions(rotation, mSystemState.interactionData.originalRotation)
            mSystemState.interactionData.rootTarget.setLocalOrientation(newOrienatation);

            let dist = new THREE.Vector3().subVectors(left, right).length();
            let newScale = mSystemState.interactionData.originalScale * (dist / mSystemState.interactionData.dist)
            mSystemState.interactionData.rootTarget.setScale(newScale);

            // the original position, translated by the change in the position of the midpoint, 
            // translated to offset the scale
            // and then rotated around the midpoint

            let newPosition = new THREE.Vector3().copy(midpoint)
            newPosition.addScaledVector(mSystemState.interactionData.targetMidpointOffset, newScale);
            newPosition = Util.pivot(newPosition, midpoint, rotation);
            mSystemState.interactionData.rootTarget.setWorldPosition(newPosition);

        } else if (mSystemState.interactionType == XRInteraction.TWO_HAND_POSE) {
            let anchorControllerPos = mSystemState.interactionData.isLeftAnchor ?
                mXRInputController.getLeftControllerPosition() :
                mXRInputController.getRightControllerPosition()
            mSystemState.interactionData.rootTarget.setWorldPosition(
                new THREE.Vector3().addVectors(anchorControllerPos, mSystemState.interactionData.targetPositionOffset));

            let controllerPos = mSystemState.interactionData.isLeftAnchor ?
                mXRInputController.getRightControllerPosition() :
                mXRInputController.getLeftControllerPosition();
            let localPosition = mSystemState.interactionData.rootTarget.getObject3D()
                .worldToLocal(controllerPos);
            mSystemState.interactionData.controlBone.position.copy(localPosition);
            mIKSolver?.update();
        }
    }

    mXRInputController.onDragStarted(async (target, isLeft) => {
        let rootTarget = target.getRoot();

        let controllerStart = isLeft ?
            mXRInputController.getLeftControllerPosition() :
            mXRInputController.getRightControllerPosition();

        let targetPositionOffset = new THREE.Vector3().subVectors(
            rootTarget.getWorldPosition(),
            controllerStart);

        mSystemState.interactionType = XRInteraction.ONE_HAND_MOVE;
        mSystemState.interactionData = {
            target,
            rootTarget,
            targetPositionOffset,
            isLeft,
        }
    })

    mXRInputController.onTwoHandDragStarted((target) => {
        let rootTarget = target.getRoot();

        let rightStart = mXRInputController.getRightControllerPosition()
        let leftStart = mXRInputController.getLeftControllerPosition()
        let midpoint = new THREE.Vector3().addVectors(leftStart, rightStart).multiplyScalar(0.5);

        let direction = new THREE.Vector3().subVectors(leftStart, rightStart).normalize();
        let dist = new THREE.Vector3().subVectors(leftStart, rightStart).length();

        let targetMidpointOffset = new THREE.Vector3().subVectors(
            rootTarget.getWorldPosition(),
            midpoint);

        mSystemState.interactionType = XRInteraction.TWO_HAND_MOVE;
        mSystemState.interactionData = {
            target,
            rootTarget,
            midpoint,
            rightStart,
            leftStart,
            direction,
            dist,
            targetMidpointOffset,
            originalRotation: rootTarget.getLocalOrientation(),
            originalScale: rootTarget.getScale(),
        }
    })

    mXRInputController.onTwoHandPoseStarted((lTarget, rTarget) => {
        let rootTarget = lTarget.getRoot();
        let lDepth = lTarget.getDepth();
        let rDepth = rTarget.getDepth();

        let isLeftAnchor = lDepth < rDepth;
        let anchorTarget = isLeftAnchor ? lTarget : rTarget;
        let movingTarget = !isLeftAnchor ? lTarget : rTarget;

        let anchorControllerPosition = isLeftAnchor ?
            mXRInputController.getLeftControllerPosition() :
            mXRInputController.getRightControllerPosition();

        let { mesh, iks, affectedTargets, controlBone } = GLTKUtil.createIK(
            anchorTarget, movingTarget)

        mIKSolver = new CCDIKSolver(mesh, iks);
        mCCDIKHelper = new CCDIKHelper(mesh, iks, 0.01);
        mSceneController.getContent().add(mCCDIKHelper);

        let targetPositionOffset = new THREE.Vector3().subVectors(
            rootTarget.getWorldPosition(),
            anchorControllerPosition);

        mSystemState.interactionType = XRInteraction.TWO_HAND_POSE;
        mSystemState.interactionData = {
            lTarget,
            rTarget,
            isLeftAnchor,
            controlBone,
            rootTarget,
            affectedTargets,
            targetPositionOffset,
        }
    })


    mXRInputController.onInteractionEnd(async () => {
        let type = mSystemState.interactionType;
        let data = mSystemState.interactionData;

        mSystemState.interactionType = XRInteraction.NONE;
        mSystemState.interactionData = {};

        if (type == XRInteraction.ONE_HAND_MOVE) {
            if (Array.isArray(data.rootTarget.getId())) {
                await mTransformManyCallback(data.rootTarget.getPointPositions());
            } else {
                let newPosition = data.rootTarget.getLocalPosition();
                await mTransformCallback(data.rootTarget.getId(), newPosition);
            }
        } else if (type == XRInteraction.TWO_HAND_MOVE) {
            let newPostion = data.rootTarget.getLocalPosition();
            let newOrientation = data.rootTarget.getLocalOrientation();
            let newScale = data.rootTarget.getScale();
            await mTransformCallback(data.rootTarget.getId(), newPostion, newOrientation, newScale);

        } else if (type == XRInteraction.TWO_HAND_POSE) {
            let moveUpdates = data.affectedTargets.map(t => {
                return {
                    id: t.getId(),
                    position: t.getLocalPosition(),
                    orientation: t.getLocalOrientation(),
                }
            })

            if (data.affectedTargets[0]) {
                let root = data.affectedTargets[0].getRoot();
                moveUpdates.push({
                    id: root.getId(),
                    position: root.getLocalPosition(),
                    orientation: root.getLocalOrientation(),
                })
            }
            await mTransformManyCallback(moveUpdates);
            mIKSolver = null
        }

        if (mCCDIKHelper) {
            mSceneController.getContent().remove(mCCDIKHelper);
            mCCDIKHelper = null;
        }
    })

    this.onSessionStart = (func) => mOnSessionStartCallback = func;
    this.onSessionEnd = (func) => mOnSessionEndCallback = func;
    this.onTransform = (func) => { mTransformCallback = func }
    this.onTransformMany = (func) => { mTransformManyCallback = func }
    this.setUserPositionAndDirection = mXRInputController.setUserPositionAndDirection;
    this.getUserPositionAndDirection = mXRInputController.getUserPositionAndDirection;

    this.startRendering = function () { mXRRenderer.setAnimationLoop(xrRender); }
    this.stopRendering = function () { mXRRenderer.setAnimationLoop(null); }
    this.setSceneController = setSceneController;
    this.getVRButton = () => vrButton;
}
