import * as THREE from 'three';
import { CCDIKHelper, CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { EditMode, USER_HEIGHT } from '../../constants.js';
import { GLTKUtil } from '../../utils/gltk_util.js';
import { XRPageInterfaceController } from './xr_page_interface_controller.js';

const LEFT_DRAG = 'leftHandedDragMove'
const RIGHT_DRAG = 'rightHandedDragMove'
const TWO_HAND_DRAG = 'twoHandedGrabMove'
const KINEMATIC_DRAG = 'twoHandedKinematicMove'

export function XRSessionController() {
    let mOnSessionStartCallback = () => { }
    let mOnSessionEndCallback = () => { }

    let mMoveCallback = async () => { }
    let mMoveChainCallback = async () => { }
    let mUpdateTimelineCallback = async () => { }

    let mSystemState = {
        primaryLPressed: false,
        primaryRPressed: false,
        gripLPressed: false,
        gripRPressed: false,
        interaction: false,
        lHovered: [],
        rHovered: [],
        teleporting: false,
        mousePosition: null,
        mouseDown: false,
    }

    let mSceneController;
    let mXRPageInterfaceController = new XRPageInterfaceController();
    let mSession;

    let mMode = EditMode.MODEL;

    let mIKSolver
    let mCCDIKHelper

    const fov = 75, aspect = 2, near = 0.1, far = 200;
    const mXRCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    mXRCamera.position.set(0, USER_HEIGHT, 0);

    const mUserGroup = new THREE.Group()
    mUserGroup.add(mXRCamera)

    let mXRCanvas = document.createElement('canvas');
    mXRCanvas.height = 100;
    mXRCanvas.width = 100;

    let mXRRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: mXRCanvas });
    mXRRenderer.xr.enabled = true;
    mXRRenderer.xr.addEventListener('sessionstart', () => {
        mSession = mXRRenderer.xr.getSession();

        setupListeners();

        mXRPageInterfaceController.renderWebpage();

        mOnSessionStartCallback();
    })
    mXRRenderer.xr.addEventListener('sessionend', () => {
        mSession = null;
        mOnSessionEndCallback();
    })
    // Dumb bug workaround, makes it more convinient to enter XR
    mXRCanvas.addEventListener("webglcontextlost", async function (event) {
        (console).log("Terminating the failed session");
        mXRRenderer.xr.getSession().end();
    }, false);

    let vrButton = VRButton.createButton(mXRRenderer);

    const mControllerOuterMaterial = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });
    const mControllerInnerMaterial = new THREE.MeshBasicMaterial({
        opacity: 0.5,
        transparent: true,
        depthTest: false,
        depthWrite: false,
    });

    const mControllerRTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.01, 0.02, 3).rotateX(-Math.PI / 2), mControllerOuterMaterial);
    mControllerRTip.position.set(-0.005, 0, -0.03);
    const mControllerRInnerTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.007, 0.015, 3).rotateX(-Math.PI / 2), mControllerInnerMaterial);
    mControllerRInnerTip.position.set(-0.005, 0, -0.03);

    const mControllerLTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.01, 0.02, 3).rotateX(-Math.PI / 2), mControllerOuterMaterial);
    mControllerLTip.position.set(0.005, 0, -0.03);
    const mControllerLInnerTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.007, 0.015, 3).rotateX(-Math.PI / 2), mControllerInnerMaterial);
    mControllerLInnerTip.position.set(0.005, 0, -0.03);

    const mController0 = mXRRenderer.xr.getController(0);
    mUserGroup.add(mController0);
    const mControllerGrip0 = mXRRenderer.xr.getControllerGrip(0);
    mUserGroup.add(mControllerGrip0);
    const mController1 = mXRRenderer.xr.getController(1);
    mUserGroup.add(mController1);
    const mControllerGrip1 = mXRRenderer.xr.getControllerGrip(1);
    mUserGroup.add(mControllerGrip1);

    function addTip(left, controller) {
        if (left) {
            controller.add(mControllerLTip);
            controller.add(mControllerLInnerTip);
        } else {
            controller.add(mControllerRTip);
            controller.add(mControllerRInnerTip);
        }
    }
    function removeTip(left, controller) {
        if (left) {
            controller.remove(mControllerLTip);
            controller.remove(mControllerLInnerTip);
        } else {
            controller.remove(mControllerRTip);
            controller.remove(mControllerRInnerTip);
        }
    }
    mController0.addEventListener('connected', function (event) {
        addTip(event.data.handedness == "left", mController0);
        mControllerGrip0.add(new XRControllerModelFactory().createControllerModel(mControllerGrip0));
    });
    mController0.addEventListener('disconnected', function (event) {
        removeTip(event.data.handedness == "left", mController0);
    });

    mController1.addEventListener('connected', function (event) {
        addTip(event.data.handedness == "left", mController1);
        mControllerGrip1.add(new XRControllerModelFactory().createControllerModel(mControllerGrip1));
    });
    mController1.addEventListener('disconnected', function (event) {
        removeTip(event.data.handedness == "left", mController1);
    });


    function setupListeners() {
        if (!mSession) return;

        mSession.addEventListener('selectstart', updateInteractionState);
        mSession.addEventListener('selectend', updateInteractionState);
        mSession.addEventListener('squeezestart', updateInteractionState);
        mSession.addEventListener('squeezeend', updateInteractionState);
    }

    function setScene(scene) {
        if (mSceneController) {
            mSceneController.getScene().remove(mUserGroup);
        }
        mSceneController = scene;
        mSceneController.getScene().add(mXRPageInterfaceController.getGroup())
        mSceneController.getScene().add(mUserGroup);
    }

    function setMode(mode) {
        mSceneController.setMode(mode);
        mMode = mode;
    }


    function xrRender(time) {
        if (time < 0) return;
        if (!mSceneController) return;

        mXRPageInterfaceController.userMoved(
            getHeadPosition(),
            getHeadDirection(),
            getLeftControllerPosition(),
            getLeftControllerOrientation(),
            getRightControllerPosition(),
            getRightControllerOrientation())
        mXRRenderer.render(mSceneController.getScene(), mXRCamera);

        if (mSystemState.interaction) {
            if (mSystemState.interaction.type == LEFT_DRAG || mSystemState.interaction.type == RIGHT_DRAG) {
                mSystemState.interaction.target.setTargetWorldPosition(new THREE.Vector3().addVectors(
                    mSystemState.interaction.type == LEFT_DRAG ? getLeftControllerPosition() : getRightControllerPosition(),
                    mSystemState.interaction.positionDiff));
            } else if (mSystemState.interaction.type == KINEMATIC_DRAG) {
                let freezeControllerPos = mSystemState.interaction.freezeLeft ?
                    getLeftControllerPosition() : getRightControllerPosition();
                mSystemState.interaction.rootTarget.setTargetWorldPosition(
                    new THREE.Vector3().addVectors(freezeControllerPos, mSystemState.interaction.positionDiff));

                let movingcontrollerPos = mSystemState.interaction.freezeLeft ?
                    getRightControllerPosition() : getLeftControllerPosition();
                let localPosition = mSystemState.interaction.rootTarget.getObject3D()
                    .worldToLocal(movingcontrollerPos);
                mSystemState.interaction.controlBone.position.copy(localPosition);
                mIKSolver?.update();
            }
        }

        updateInputState();
    }

    async function updateInteractionState() {
        let leftController = getLeftContoller();
        let rightController = getRightController();

        mSystemState.primaryLPressed = false;
        mSystemState.primaryRPressed = false;
        mSystemState.gripLPressed = false;
        mSystemState.gripRPressed = false;

        if (leftController && leftController.gamepad) {
            // trigger button
            mSystemState.primaryLPressed = leftController.gamepad.buttons[0]
                && leftController.gamepad.buttons[0].pressed;
            // grip button
            mSystemState.gripLPressed = leftController.gamepad.buttons[1]
                && leftController.gamepad.buttons[1].pressed;
        }

        if (rightController && rightController.gamepad) {
            // trigger button
            mSystemState.primaryRPressed = rightController.gamepad.buttons[0]
                && rightController.gamepad.buttons[0].pressed;
            // grip button
            mSystemState.gripRPressed = rightController.gamepad.buttons[1]
                && rightController.gamepad.buttons[1].pressed;
        }

        if (endInteractionState()) {
            endInteraction();
        }

        if (mXRPageInterfaceController.isInteracting()) {
            await mXRPageInterfaceController.updateSystemState(mSystemState);
        } else if (leftHandDragState()) {
            if (!mSystemState.interaction || mSystemState.interaction.type != LEFT_DRAG) {
                endInteraction();
                let target = getClosestLeftTarget();
                let rootTarget = target.getRoot();
                startDrag(LEFT_DRAG, getLeftControllerPosition(), rootTarget);
            }
        } else if (rightHandDragState()) {
            if (!mSystemState.interaction || mSystemState.interaction.type != RIGHT_DRAG) {
                endInteraction();
                let target = getClosestRightTarget();
                let rootTarget = target.getRoot();
                startDrag(RIGHT_DRAG, getRightControllerPosition(), rootTarget);
            }
        } else if (kinematicDragState()) {
            if (!mSystemState.interaction || mSystemState.interaction.type != KINEMATIC_DRAG) {
                let left = mSystemState.interaction && mSystemState.interaction.type == LEFT_DRAG;
                endInteraction();
                startKinimaticDrag(left);
            }
        } else if (twoHandDragState()) {
            if (!mSystemState.interaction || mSystemState.interaction.type != TWO_HAND_DRAG) {
                endInteraction();
                console.error("TODO: The two controllers should create a node between them that rotates with the controller orientation. The grabbed object sticks to that. ");
            }
        }
    }

    function startDrag(type, startPos, target) {
        let positionDiff = new THREE.Vector3().subVectors(
            target.getTargetWorldPosition(),
            startPos);
        mSystemState.interaction = {
            type,
            target,
            positionDiff,
        }
    }

    function leftHandDragState() {
        if (mSystemState.primaryRPressed && mSystemState.rHovered[0]) return false;
        if (mSystemState.primaryLPressed && mSystemState.lHovered[0]) return true;
    }

    function rightHandDragState() {
        if (mSystemState.primaryLPressed && mSystemState.lHovered[0]) return false;
        if (mSystemState.primaryRPressed && mSystemState.rHovered[0]) return true;
    }

    function kinematicDragState() {
        if (!mSystemState.primaryLPressed || !mSystemState.primaryRPressed) return false;
        if (!mSystemState.lHovered[0] || !mSystemState.rHovered[0]) return false;
        if (getKinematicDragTargets()) return true;
        return false;
    }

    function getKinematicDragTargets() {
        if (!mSystemState.lHovered[0] || !mSystemState.rHovered[0]) return null;

        let leftTarget = getClosestLeftTarget();
        let dragRoot = leftTarget.getRoot();
        let validRightTargets = mSystemState.rHovered.filter(t => t.getRoot().getId() == dragRoot.getId())
        let rightTarget = validRightTargets.length > 0 ? getClosestTarget(validRightTargets, getRightControllerPosition()) : null;
        if (!rightTarget) {
            rightTarget = getClosestRightTarget();
            dragRoot = rightTarget.getRoot();
            let validLeftTargets = mSystemState.lHovered.filter(t => t.getRoot().getId() == dragRoot.getId())
            leftTarget = getClosestTarget(validLeftTargets, getLeftControllerPosition());
        }
        if (leftTarget && rightTarget) {
            return { leftTarget, rightTarget };
        } else return null;
    }

    function twoHandDragState() {
        if (!mSystemState.primaryLPressed || !mSystemState.primaryRPressed) return false;
        if (!mSystemState.lHovered[0] || !mSystemState.rHovered[0]) return false;
        if (getTwoHandDragTarget()) return true;
        return false;
    }

    function getTwoHandDragTarget() {
        if (!mSystemState.lHovered[0] || !mSystemState.rHovered[0]) return null;
        let lTarget = getClosestLeftTarget();
        let rTarget = mSystemState.rHovered.find(h => h.getId() == lTarget.getId());
        if (!rTarget) {
            rTarget = getClosestRightTarget()
            lTarget = mSystemState.lHovered.find(h => h.getId() == rTarget.getId());
        }
        return lTarget;
    }

    function startKinimaticDrag(freezeLeft) {
        let targets = getKinematicDragTargets();
        let movingTarget = freezeLeft ? targets.rightTarget : targets.leftTarget;
        let anchorTarget = freezeLeft ? targets.leftTarget : targets.rightTarget;
        let rootTarget = movingTarget.getRoot();

        let { mesh, iks, affectedTargets, controlBone } = GLTKUtil.createIK(anchorTarget, movingTarget)

        mIKSolver = new CCDIKSolver(mesh, iks);
        mCCDIKHelper = new CCDIKHelper(mesh, iks, 0.01);
        mSceneController.getContent().add(mCCDIKHelper);

        let positionDiff = new THREE.Vector3().subVectors(
            rootTarget.getTargetWorldPosition(),
            freezeLeft ? getLeftControllerPosition() : getRightControllerPosition());

        mSystemState.interaction = {
            type: KINEMATIC_DRAG,
            controlBone,
            rootTarget,
            freezeLeft,
            affectedTargets,
            positionDiff,
        }
    }

    function endInteractionState() {
        return !(mSystemState.primaryLPressed || mSystemState.primaryRPressed ||
            mSystemState.gripLPressed || mSystemState.gripRPressed);
    }

    async function endInteraction() {
        let interaction = mSystemState.interaction;
        mSystemState.interaction = null;

        if (mSystemState.interaction && (mSystemState.interaction.type == LEFT_DRAG ||
            mSystemState.interaction.type == RIGHT_DRAG)) {
            let newPosition = interaction.target.getTargetLocalPosition();
            await mMoveCallback(interaction.target.getId(), newPosition);
        } else if (interaction && interaction.type == KINEMATIC_DRAG) {
            let moveUpdates = interaction.affectedTargets.map(t => {
                return {
                    id: t.getId(),
                    position: t.getTargetLocalPosition(),
                    orientation: t.getTargetLocalOrientation(),
                }
            })
            if (interaction.affectedTargets[0]) {
                let root = interaction.affectedTargets[0].getRoot();
                moveUpdates.push({
                    id: root.getId(),
                    position: root.getTargetLocalPosition(),
                    orientation: root.getTargetLocalOrientation(),
                })
            }
            await mMoveChainCallback(affectedTargets);

            mIKSolver = null
        }

        if (mCCDIKHelper) {
            mSceneController.getContent().remove(mCCDIKHelper);
            mCCDIKHelper = null;
        }

    }

    let mMoved = false;
    function updateInputState() {
        let rightController = getRightController();
        let axes = rightController && rightController.gamepad && Array.isArray(rightController.gamepad.axes) ?
            rightController.gamepad.axes : [0, 0, 0, 0];
        if (!mMoved && Math.abs(axes[3]) > 0.5) {
            let add = new THREE.Vector3();
            mXRCamera.getWorldDirection(add);
            let sign = -axes[3] / Math.abs(axes[3])
            mUserGroup.position.addScaledVector(add, 0.5 * sign);
            mMoved = true;
        } else if (!mMoved && Math.abs(axes[2]) > 0.5) {
            let cameraPos = new THREE.Vector3();
            mXRCamera.getWorldPosition(cameraPos);
            let sign = -axes[2] / Math.abs(axes[2])
            rotateAboutPoint(mUserGroup, cameraPos, new THREE.Vector3(0, 1, 0), Math.PI / 4 * sign);

            mMoved = true;
        } else if (mMoved && axes.every(v => v == 0)) {
            mMoved = false;
        }

        updateHoverArray();
    }

    function setUserPositionAndDirection(worldPosition, unitDirection) {
        mUserGroup.position.copy(worldPosition);
        let dir = new THREE.Vector3();
        mXRCamera.getWorldDirection(dir);

        dir.y = 0;
        unitDirection.y = 0;

        let rotation = new THREE.Quaternion()
        rotation.setFromUnitVectors(dir, unitDirection)
        mUserGroup.applyQuaternion(rotation);
    }

    function rotateAboutPoint(obj, point, axis, theta, pointIsWorld = true) {
        if (pointIsWorld) {
            obj.parent.localToWorld(obj.position); // compensate for world coordinate
        }

        obj.position.sub(point); // remove the offset
        obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
        obj.position.add(point); // re-add the offset

        if (pointIsWorld) {
            obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
        }

        obj.rotateOnAxis(axis, theta); // rotate the OBJECT
    }

    function updateHoverArray() {
        if (!mSceneController) return;

        if ((mSystemState.primaryLPressed || mSystemState.gripLPressed) &&
            (mSystemState.primaryRPressed || mSystemState.gripRPressed)) {
            // both remotes interacting, no update needed.
            return;
        }

        let oldHovered = mSystemState.lHovered.concat(mSystemState.rHovered);

        mXRCamera.updateMatrix();
        mXRCamera.updateMatrixWorld();
        let frustum = new THREE.Frustum();
        let projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(mXRCamera.projectionMatrix, mXRCamera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(
            mXRCamera.projectionMatrix, mXRCamera.matrixWorldInverse));
        let cameraPosition = new THREE.Vector3(); mXRCamera.getWorldPosition(cameraPosition);

        if (!mSystemState.primaryLPressed && !mSystemState.gripLPressed) {
            mSystemState.lHovered = [];
            let controllerLPos = getLeftControllerPosition();
            if (frustum.containsPoint(controllerLPos)) {
                let targets = mSceneController.getTargets(getRay(cameraPosition, controllerLPos));
                mSystemState.lHovered.push(getClosestTarget(targets, controllerLPos));
            };
            mSystemState.lHovered = mSystemState.lHovered.filter(t => t);
        }

        if (!mSystemState.primaryRPressed && !mSystemState.gripRPressed) {
            mSystemState.rHovered = [];
            let controllerRPos = getRightControllerPosition();
            if (frustum.containsPoint(controllerRPos)) {
                let targets = mSceneController.getTargets(getRay(cameraPosition, controllerRPos))
                mSystemState.rHovered.push(getClosestTarget(targets, controllerRPos));
            };
            mSystemState.rHovered = mSystemState.rHovered.filter(t => t);
        }

        if (mSystemState.lHovered.concat(mSystemState.rHovered).map(i => i.getId()).sort()
            .join() != oldHovered.map(i => i.getId()).sort().join()) {
            oldHovered.forEach(item => item.unhighlight());
            mSystemState.lHovered.concat(mSystemState.rHovered).forEach(item => item.highlight())
        }
    }

    function getRay(p1, p2) {
        let dir = new THREE.Vector3().copy(p2).sub(p1);
        let dist = dir.length();
        dir.normalize();

        let rayCaster = new THREE.Raycaster(p1, dir, 0, dist * 1.1);
        rayCaster.camera = mXRCamera;
        return rayCaster;
    }

    function getLeftContoller() {
        if (!mSession) return;
        for (let source of mSession.inputSources) {
            if (source.handedness == 'left') return source;
        }
    }

    function getRightController() {
        if (!mSession) return;
        for (let source of mSession.inputSources) {
            if (source.handedness == 'right') return source;
        }
    }

    function getClosestTarget(targets, pointerCoords) {
        if (targets.length == 0) return null;
        if (targets.length == 1) return targets[0];

        let sortation = targets.map(t => {
            return { t, distance: pointerCoords.distanceTo(t.getIntersection().point) }
        })

        sortation.sort((a, b) => a.distance - b.distance)

        return sortation[0].t;
    }

    function getClosestLeftTarget() {
        return getClosestTarget(mSystemState.lHovered, getLeftControllerPosition());
    }

    function getClosestRightTarget() {
        return getClosestTarget(mSystemState.rHovered, getRightControllerPosition());
    }

    function getHeadPosition() {
        let pos = new THREE.Vector3();
        mXRCamera.getWorldPosition(pos);
        return pos;
    }

    function getHeadDirection() {
        let pos = new THREE.Vector3();
        mXRCamera.getWorldDirection(pos);
        return pos;
    }

    function getHeadOrientation() {
        let rot = new THREE.Quaternion();
        mXRCamera.getWorldQuaternion(rot);
        return rot;
    }

    function getLeftControllerPosition() {
        let pos = new THREE.Vector3();
        mControllerLTip.getWorldPosition(pos);
        return pos;
    }

    function getLeftControllerOrientation() {
        let rot = new THREE.Quaternion();
        mControllerLTip.getWorldQuaternion(rot);
        return rot;
    }

    function getRightControllerPosition() {
        let pos = new THREE.Vector3();
        mControllerRTip.getWorldPosition(pos);
        return pos;
    }

    function getRightControllerOrientation() {
        let rot = new THREE.Quaternion();
        mControllerRTip.getWorldQuaternion(rot);
        return rot;
    }

    this.onSessionStart = (func) => mOnSessionStartCallback = func;
    this.onSessionEnd = (func) => mOnSessionEndCallback = func;
    this.onMove = (func) => { mMoveCallback = func }
    this.onMoveChain = (func) => { mMoveChainCallback = func }
    this.onUpdateTimeline = (func) => { mUpdateTimelineCallback = func }
    this.setUserPositionAndDirection = setUserPositionAndDirection;
    this.getUserPositionAndDirection = () => { return { pos: getHeadPosition(), dir: getHeadDirection() } };

    this.startRendering = function () { mXRRenderer.setAnimationLoop(xrRender); }
    this.stopRendering = function () { mXRRenderer.setAnimationLoop(null); }
    this.setScene = setScene;
    this.setMode = setMode;
    this.getVRButton = () => vrButton;
}
