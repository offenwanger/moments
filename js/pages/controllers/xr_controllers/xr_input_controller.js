import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { UP, USER_HEIGHT, XRInteraction } from "../../../constants.js";
import { CanvasUtil } from '../../../utils/canvas_util.js';
import { Util } from "../../../utils/utility.js";

export function XRInputController() {
    let mInteractionEndCallback = async () => { }
    let mDragStartedCallback = async (target, isLeft) => { }
    let mTwoHandDragStartedCallback = async (target) => { }
    let mTwoHandPoseStartedCallback = async (lTarget, rTarget) => { }

    let mMoved = false;
    let mPrimaryLPressed = false;
    let mPrimaryRPressed = false;
    let mGripLPressed = false;
    let mGripRPressed = false;
    let mLHovered = [];
    let mRHovered = [];

    let mSceneController;
    let mMenuController;

    const fov = 75, aspect = 2, near = 0.1, far = 200;
    const mXRCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    mXRCamera.position.set(0, USER_HEIGHT, 0);

    const mUserGroup = new THREE.Group()
    mUserGroup.add(mXRCamera)

    const mRaycaster = new THREE.Raycaster();

    let mLeftController;
    let mRightController;

    const mPoint = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(CanvasUtil.generateDotCanvas()),
        sizeAttenuation: false,
        depthTest: false
    }));
    mPoint.scale.set(0.015, 0.015, 1);
    mPoint.renderOrder = Infinity;


    const mControllerRayMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        alphaMap: new THREE.CanvasTexture(CanvasUtil.generateWhiteGradient()),
        transparent: true
    });
    const mControllerRayGeometry = new THREE.BoxGeometry(0.004, 0.004, 0.35);
    mControllerRayGeometry.translate(0, 0, -0.15);
    mControllerRayGeometry.attributes.uv.set([1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]);
    const mLinesHelper = new THREE.Mesh(mControllerRayGeometry, mControllerRayMaterial);

    const mControllerOuterMaterial = new THREE.MeshBasicMaterial({
        opacity: 0.5,
        transparent: true
    });
    const mControllerInnerMaterial = new THREE.MeshBasicMaterial({
        opacity: 0.5,
        transparent: true,
        depthTest: false,
        depthWrite: false,
    });

    const mControllerRTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.01, 0.02, 3).rotateX(-Math.PI / 2),
        mControllerOuterMaterial);
    mControllerRTip.position.set(-0.005, 0, -0.03);
    const mControllerRInnerTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.007, 0.015, 3).rotateX(-Math.PI / 2),
        mControllerInnerMaterial);
    mControllerRInnerTip.position.set(-0.005, 0, -0.03);

    const mControllerLTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.01, 0.02, 3).rotateX(-Math.PI / 2), mControllerOuterMaterial);
    mControllerLTip.position.set(0.005, 0, -0.03);
    const mControllerLInnerTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.007, 0.015, 3).rotateX(-Math.PI / 2), mControllerInnerMaterial);
    mControllerLInnerTip.position.set(0.005, 0, -0.03);

    const mLeftMenuContainer = new THREE.Group();
    mLeftMenuContainer.scale.set(0.1, 0.1, 0.1)
    mLeftMenuContainer.position.set(-0.075, 0, 0.1);
    mLeftMenuContainer.rotateX(-Math.PI / 4);
    const mRightMenuContainer = new THREE.Group();


    function setupControllers(xr) {
        setupController(0, xr)
        setupController(1, xr);
    }

    function setupController(index, xr) {
        let controller = xr.getController(index);
        const ray = mLinesHelper.clone();
        const point = mPoint.clone();

        controller.add(ray, point);
        controller.ray = ray;
        controller.point = point;

        let grip = xr.getControllerGrip(index);

        controller.addEventListener('connected', function (event) {
            addTip(event.data.handedness == "left", controller);
            controller.userData.handedness = event.data.handedness;
            grip.add(new XRControllerModelFactory()
                .createControllerModel(grip));

            controller.add(event.data.handedness == "left" ?
                mLeftMenuContainer : mRightMenuContainer);
            if (event.data.handedness == "left") {
                mLeftController = controller;
            } else {
                mRightController = controller;
            }
        });
        controller.addEventListener('disconnected', function (event) {
            removeTip(controller.userData.handedness == "left", controller);
        });

        mUserGroup.add(controller);
        mUserGroup.add(grip);
    }

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

    async function updateInteractionState(systemState) {
        updateHoverArray(systemState);

        let axes = getRightGamePad(systemState);
        if (!mMoved && Math.abs(axes[3]) > 0.5) {
            let add = new THREE.Vector3();
            mXRCamera.getWorldDirection(add);
            let sign = -axes[3] / Math.abs(axes[3])

            moveUser(add, 0.5 * sign)

            mMoved = true;
        } else if (!mMoved && Math.abs(axes[2]) > 0.5) {
            let cameraPos = new THREE.Vector3();
            mXRCamera.getWorldPosition(cameraPos);

            let sign = -axes[2] / Math.abs(axes[2])
            let angle = Math.PI / 4 * sign;
            let rotation = new THREE.Quaternion().setFromAxisAngle(UP, angle);
            let pos = Util.pivot(mUserGroup.position, cameraPos, rotation);

            mUserGroup.position.copy(pos);
            mUserGroup.applyQuaternion(rotation);

            mMoved = true;
        } else if (mMoved && axes.every(v => v == 0)) {
            mMoved = false;
        }

        updateControllerState(systemState);
        if (systemState.interactionType == XRInteraction.NONE) {
            if (nothingIsPressed()) {
                // no transition. 
            } else {
                if (mLHovered[0] && mPrimaryLPressed) {
                    let target = getClosestTarget(mLHovered, getLeftControllerPosition());
                    await mDragStartedCallback(target, true);
                } else if (mRHovered[0] && mPrimaryRPressed) {
                    let target = getClosestTarget(mRHovered, getRightControllerPosition());
                    await mDragStartedCallback(target, false);
                }
            }
        } else {
            if (nothingIsPressed()) {
                await mInteractionEndCallback();
            } else if (systemState.interactionType == XRInteraction.ONE_HAND_MOVE && systemState.interactionData.isLeft) {
                // If we are already moving something with the left, we can transition to 
                // a two hand move or pose. 
                if (mRHovered[0] && mPrimaryRPressed) {
                    let rTarget = getClosestTarget(mRHovered, getRightControllerPosition());
                    if (rTarget.getId() == systemState.interactionData.target.getId()) {
                        await mInteractionEndCallback();
                        await mTwoHandDragStartedCallback(rTarget);
                    } else {
                        let lTarget = systemState.interactionData.target;
                        await mInteractionEndCallback();
                        await mTwoHandPoseStartedCallback(lTarget, rTarget);
                    }
                } else {
                    // if primary R is not pressed or isn't hovering, no transition.
                }
            } else if (systemState.interactionType == XRInteraction.ONE_HAND_MOVE && !systemState.interactionData.isLeft) {
                // If we are already moving something with the right, we can transition to 
                // a two hand move or pose. 
                if (mLHovered[0] && mPrimaryLPressed) {
                    let lTarget = getClosestTarget(mLHovered, getLeftControllerPosition());
                    if (lTarget.getId() == systemState.interactionData.target.getId()) {
                        await mInteractionEndCallback();
                        await mTwoHandDragStartedCallback(lTarget);
                    } else {
                        let rTarget = systemState.interactionData.target;
                        await mInteractionEndCallback();
                        await mTwoHandPoseStartedCallback(lTarget, rTarget);
                    }
                } else {
                    // if primary L is not pressed or isn't hovering, no transition. 
                }
            } else if (systemState.interactionType == XRInteraction.TWO_HAND_MOVE ||
                systemState.interactionType == XRInteraction.TWO_HAND_POSE) {
                // Both two handed interactions can only transition to a one handed interaction.
                if (!mPrimaryLPressed) {
                    // transition to r drag. 
                    let rTarget = systemState.interactionType == XRInteraction.TWO_HAND_POSE ?
                        systemState.interactionData.rTarget :
                        systemState.interactionData.target;
                    await mInteractionEndCallback();
                    await mDragStartedCallback(rTarget, false);
                } else if (!mPrimaryRPressed) {
                    // transition to l drag. 
                    let lTarget = systemState.interactionType == XRInteraction.TWO_HAND_POSE ?
                        systemState.interactionData.lTarget :
                        systemState.interactionData.target;
                    await mInteractionEndCallback();
                    await mDragStartedCallback(lTarget, true);
                } else {
                    // Triggers are pressed, nothing to do. 
                }
            }
        }
    }

    function updateControllerState(systemState) {
        mPrimaryLPressed = false;
        mPrimaryRPressed = false;
        mGripLPressed = false;
        mGripRPressed = false;

        if (!systemState.session) return;
        if (!systemState.session.inputSources) return;

        let leftController, rightController;
        for (let source of systemState.session.inputSources) {
            if (source.handedness == 'left') leftController = source;
            if (source.handedness == 'right') rightController = source;
        }

        if (leftController && leftController.gamepad) {
            // trigger button
            mPrimaryLPressed = leftController.gamepad.buttons[0]
                && leftController.gamepad.buttons[0].pressed;
            // grip button
            mGripLPressed = leftController.gamepad.buttons[1]
                && leftController.gamepad.buttons[1].pressed;
        }

        if (rightController && rightController.gamepad) {
            // trigger button
            mPrimaryRPressed = rightController.gamepad.buttons[0]
                && rightController.gamepad.buttons[0].pressed;
            // grip button
            mGripRPressed = rightController.gamepad.buttons[1]
                && rightController.gamepad.buttons[1].pressed;
        }
    }

    function moveUser(direction, distance) {
        let dir = new THREE.Vector3();
        dir.copy(direction).normalize()
        mUserGroup.position.addScaledVector(dir, distance);
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

    function getUserPosition() {
        let headPos = getHeadPosition();
        let handRPos = getRightControllerPosition();
        let handLPos = getLeftControllerPosition();
        return {
            head: {
                x: headPos.x,
                y: headPos.y,
                z: headPos.z,
                orientation: getHeadOrientation().toArray()
            },
            handR: {
                x: handRPos.x,
                y: handRPos.y,
                z: handRPos.z,
                orientation: getRightControllerOrientation().toArray()
            },
            handL: {
                x: handLPos.x,
                y: handLPos.y,
                z: handLPos.z,
                orientation: getLeftControllerOrientation().toArray()
            },
        }
    }

    function nothingIsPressed() {
        return !(mPrimaryLPressed || mPrimaryRPressed ||
            mGripLPressed || mGripRPressed);
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

    function updateHoverArray(systemState) {
        if (!mSceneController) return;

        hidePoints();

        if (systemState.interactionType != XRInteraction.NONE &&
            systemState.interactionType != XRInteraction.ONE_HAND_MOVE) {
            // nothing to hover. 
            return;
        }

        let oldHovered = mLHovered.concat(mRHovered);

        mXRCamera.updateMatrix();
        mXRCamera.updateMatrixWorld();

        let frustum = new THREE.Frustum();
        let projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(mXRCamera.projectionMatrix, mXRCamera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(
            mXRCamera.projectionMatrix, mXRCamera.matrixWorldInverse));
        let cameraPosition = new THREE.Vector3(); mXRCamera.getWorldPosition(cameraPosition);

        // Left hand
        if (!mLeftController) {
            // no controller, do nothing.
        } else if (systemState.interactionType == XRInteraction.ONE_HAND_MOVE &&
            systemState.interactionData.isLeft) {
            // left hand is dragging, no need to update hover array.
        } else {
            mLHovered = [];
            let controllerLPos = getLeftControllerPosition();
            if (frustum.containsPoint(controllerLPos)) {
                setRay(mLeftController, mRaycaster);
                let targets = mMenuController.getTargets(mRaycaster);
                if (targets.length == 0) targets = mSceneController.getTargets(mRaycaster);
                mLHovered.push(getClosestTarget(targets, controllerLPos));
                if (mLHovered[0]) {
                    placePoint(mLeftController, mLHovered[0].getIntersection().point);
                }
            };
            // not sure why we need this but sure.
            mLHovered = mLHovered.filter(t => t);

            if (systemState.interactionType == XRInteraction.ONE_HAND_MOVE) {
                // Right hand is dragging, filter the valid targets. 
                mLHovered = mLHovered.filter(t => {
                    // Must be the same mesh or a bone on the same mesh
                    // A meshes root is itself, so this will work.
                    if (t.getRoot().getId() == systemState.interactionData.target.getRoot().getId()) {
                        return true;
                    } else return false;
                });
            }
        }

        // Right hand
        if (!mRightController) {
            // no controller, do nothing.
        } else if (systemState.interactionType == XRInteraction.ONE_HAND_MOVE && !systemState.interactionData.isLeft) {
            // right hand is dragging, no need to update hover array.
        } else {
            mRHovered = [];
            let controllerRPos = getRightControllerPosition();
            if (frustum.containsPoint(controllerRPos)) {
                setRay(mRightController, mRaycaster);
                let targets = mMenuController.getTargets(mRaycaster);
                if (targets.length == 0) targets = mSceneController.getTargets(mRaycaster);
                mRHovered.push(getClosestTarget(targets, controllerRPos));
                if (mRHovered[0]) {
                    placePoint(mLeftController, mRHovered[0].getIntersection().point);
                }
            };
            mRHovered = mRHovered.filter(t => t);

            if (systemState.interactionType == XRInteraction.ONE_HAND_MOVE) {
                // Left hand is dragging, filter the valid targets. 
                mRHovered = mRHovered.filter(t => {
                    // Must be the same mesh or a bone on the same mesh
                    // A meshes root is itself, so this will work.
                    if (t.getRoot().getId() == systemState.interactionData.target.getRoot().getId()) {
                        return true;
                    } else return false;
                });
            }
        }

        let newHovered = mLHovered.concat(mRHovered);
        let newHoveredIds = Util.unique(newHovered.map(t => t.getId()));
        let oldHoveredIds = Util.unique(oldHovered.map(t => t.getId()));

        for (let t of newHovered) {
            if (!oldHoveredIds.includes(t.getId())) {
                // Add the id to the array so it only gets highlighted once
                oldHoveredIds.push(t.getId());
                t.highlight();
            }
        }

        for (let t of oldHovered) {
            if (oldHoveredIds.includes(t.getId()) && !newHoveredIds.includes(t.getId())) {
                // Remove so it only gets set to idle once. 
                oldHoveredIds.filter(id => id != t.getId());
                t.idle();
            }
        }
    }

    function getRightGamePad(systemState) {
        if (!systemState.session) return [0, 0, 0, 0];
        let rightController;
        // input sources is not an array, but is iterable
        for (let source of systemState.session.inputSources) {
            if (source.handedness == 'right') rightController = source;
        }
        if (!rightController || !rightController.gamepad ||
            !Array.isArray(rightController.gamepad.axes)) {
            return [0, 0, 0, 0];
        } else {
            return rightController.gamepad.axes
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

    function setSceneController(sceneController) {
        mSceneController?.getScene().remove(mUserGroup);
        mSceneController = sceneController;
        mSceneController.getScene().add(mUserGroup);
    }

    function setMenuController(controller) {
        mMenuController = controller;
        mMenuController.setContainer(mLeftMenuContainer, mRightMenuContainer);
    }

    const dummyMatrix = new THREE.Matrix4();
    function setRay(controller, raycaster) {
        dummyMatrix.identity().extractRotation(controller.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(dummyMatrix);
    }

    function placePoint(controller, vec) {
        const localVec = controller.worldToLocal(vec);
        controller.point.position.copy(localVec);
        controller.point.visible = true;
    }

    function hidePoints() {
        mLeftController.point.visible = false;
        mRightController.point.visible = false;
    }

    this.getCamera = () => mXRCamera;
    this.getGroup = () => mUserGroup;
    this.getPrimaryRPressed = () => mPrimaryRPressed;
    this.getUserPositionAndDirection = () => { return { pos: getHeadPosition(), dir: getHeadDirection() } };
    this.getHeadPosition = getHeadPosition;
    this.getHeadDirection = getHeadDirection;
    this.getHeadOrientation = getHeadOrientation;
    this.getLeftControllerPosition = getLeftControllerPosition;
    this.getLeftControllerOrientation = getLeftControllerOrientation;
    this.getRightControllerPosition = getRightControllerPosition;
    this.getRightControllerOrientation = getRightControllerOrientation;
    this.getUserPosition = getUserPosition;


    this.setupControllers = setupControllers;
    this.updateInteractionState = updateInteractionState;
    this.setUserPositionAndDirection = setUserPositionAndDirection;
    this.setSceneController = setSceneController;
    this.setMenuController = setMenuController;

    this.onInteractionEnd = (func) => mInteractionEndCallback = func;
    this.onDragStarted = (func) => mDragStartedCallback = func;
    this.onTwoHandDragStarted = (func) => mTwoHandDragStartedCallback = func;
    this.onTwoHandPoseStarted = (func) => mTwoHandPoseStartedCallback = func;

}