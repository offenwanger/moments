import * as THREE from 'three';
import { CCDIKHelper, CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { EditMode, XRInteraction } from '../../../constants.js';
import { GLTKUtil } from '../../../utils/gltk_util.js';
import { XRInputController } from './xr_input_controller.js';
import { XRPageInterfaceController } from './xr_page_interface_controller.js';

export function XRSessionController(mWebsocketController) {
    let mOnSessionStartCallback = () => { }
    let mOnSessionEndCallback = () => { }

    let mMoveCallback = async () => { }
    let mMoveChainCallback = async () => { }
    let mUpdateTimelineCallback = async () => { }

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

    let mMode = EditMode.MODEL;

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

    function setMode(mode) {
        mSceneController?.setMode(mode);
        mMode = mode;
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

        if (mSystemState.interactionType == XRInteraction.ONE_HAND_MOVE) {
            let controllerPos = mSystemState.interactionData.isLeft ?
                mXRInputController.getLeftControllerPosition() :
                mXRInputController.getRightControllerPosition()
            mSystemState.interactionData.rootTarget.setTargetWorldPosition(
                new THREE.Vector3().addVectors(controllerPos, mSystemState.interactionData.targetPositionOffset));
        } else if (mSystemState.interactionType == XRInteraction.TWO_HAND_MOVE) {
            console.error('impliment me!')
        } else if (mSystemState.interactionType == XRInteraction.TWO_HAND_POSE) {
            let anchorControllerPos = mSystemState.interactionData.isLeftAnchor ?
                mXRInputController.getLeftControllerPosition() :
                mXRInputController.getRightControllerPosition()
            mSystemState.interactionData.rootTarget.setTargetWorldPosition(
                new THREE.Vector3().addVectors(anchorControllerPos, mSystemState.interactionData.targetPositionOffset));

            let controllerPos = mSystemState.interactionData.isLeftAnchor ?
                mXRInputController.getRightControllerPosition() :
                mXRInputController.getLeftControllerPosition();
            let localPosition = mSystemState.interactionData.rootTarget.getObject3D()
                .worldToLocal(controllerPos);
            mSystemState.interactionData.controlBone.position.copy(localPosition);
            mIKSolver?.update();
        }

        await mXRInputController.updateInteractionState(mSystemState);

        if (mXRPageInterfaceController.isInteracting()) {
            await mXRPageInterfaceController.updateClickState(
                mXRInputController.getPrimaryRPressed());
        }
    }

    mXRInputController.onDragStarted(async (target, isLeft) => {
        let rootTarget = target.getRoot();

        let controllerStart = isLeft ?
            mXRInputController.getLeftControllerPosition() :
            mXRInputController.getRightControllerPosition();

        let targetPositionOffset = new THREE.Vector3().subVectors(
            rootTarget.getTargetWorldPosition(),
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
        let rightStart = mXRInputController.getRightControllerPosition()
        let leftStart = mXRInputController.getLeftControllerPosition()
        let midpoint = new Vector3().copy(rightPosition).add(leftPosition).multiplyScalar(0.5);

        mSystemState.interactionType = XRInteraction.TWO_HAND_MOVE;
        mSystemState.interactionData = {
            midpoint,
            rightStart,
            leftStart,
            originalRotation: target.getRotation(),
            originalScale: target.getScale(),
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
            rootTarget.getTargetWorldPosition(),
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
            let newPosition = data.target.getTargetLocalPosition();
            await mMoveCallback(data.target.getId(), newPosition);

        } else if (type == XRInteraction.TWO_HAND_MOVE) {
            let leftControllerPosition = XRInteraction.getLeftControllerPosition()
            let v1 = new THREE.Vector3().subVectors(data.leftStart, data.midpoint);
            let v2 = new THREE.Vector3().subVectors(leftControllerPosition, data.midpoint);
            let newScale = v2.length / v1.length() * data.originalScale;
            let controllerRotation = new THREE.Quaternion().setFromUnitVectors(v1, v2);
            let newRotation = data.originalRotation.applyQuaternion(controllerRotation);
            await mScaleRotateCallback(data.target.getId(), newRotation, newScale);

        } else if (type == XRInteraction.TWO_HAND_POSE) {
            let moveUpdates = data.affectedTargets.map(t => {
                return {
                    id: t.getId(),
                    position: t.getTargetLocalPosition(),
                    orientation: t.getTargetLocalOrientation(),
                }
            })

            if (data.affectedTargets[0]) {
                let root = data.affectedTargets[0].getRoot();
                moveUpdates.push({
                    id: root.getId(),
                    position: root.getTargetLocalPosition(),
                    orientation: root.getTargetLocalOrientation(),
                })
            }
            await mMoveChainCallback(moveUpdates);
            mIKSolver = null
        }

        if (mCCDIKHelper) {
            mSceneController.getContent().remove(mCCDIKHelper);
            mCCDIKHelper = null;
        }
    })

    this.onSessionStart = (func) => mOnSessionStartCallback = func;
    this.onSessionEnd = (func) => mOnSessionEndCallback = func;
    this.onMove = (func) => { mMoveCallback = func }
    this.onMoveChain = (func) => { mMoveChainCallback = func }
    this.onUpdateTimeline = (func) => { mUpdateTimelineCallback = func }
    this.setUserPositionAndDirection = mXRInputController.setUserPositionAndDirection;
    this.getUserPositionAndDirection = mXRInputController.getUserPositionAndDirection;

    this.startRendering = function () { mXRRenderer.setAnimationLoop(xrRender); }
    this.stopRendering = function () { mXRRenderer.setAnimationLoop(null); }
    this.setSceneController = setSceneController;
    this.setMode = setMode;
    this.getVRButton = () => vrButton;
}
