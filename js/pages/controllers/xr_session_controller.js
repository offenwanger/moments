import * as THREE from 'three';
import { CCDIKHelper, CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { USER_HEIGHT } from '../../constants.js';

const LEFT_DRAG = 'leftHandedDragMove'
const RIGHT_DRAG = 'rightHandedDragMove'
const TWO_HAND_DRAG = 'twoHandedGrabMove'
const KINEMATIC_DRAG = 'twoHandedKinematicMove'

export function XRSessionController() {
    let mOnSessionStartCallback = () => { }
    let mOnSessionEndCallback = () => { }

    let mMoveCallback = async () => { }
    let mMoveChainCallback = async () => { }

    let mSystemState = {
        primaryLPressed: false,
        primaryRPressed: false,
        gripLPressed: false,
        gripRPressed: false,
        interaction: false,
        lHovered: [],
        rHovered: [],
        teleporting: false,
    }

    let mSceneController;
    let mSession;

    let mIKSolver
    let mCCDIKHelper

    const fov = 75, aspect = 2, near = 0.1, far = 200;
    const mXRCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    mXRCamera.position.set(0, USER_HEIGHT, 0);

    let mXRCanvas = document.createElement('canvas');
    mXRCanvas.height = 100;
    mXRCanvas.width = 100;

    let mXRRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: mXRCanvas });
    mXRRenderer.xr.enabled = true;
    mXRRenderer.xr.addEventListener('sessionstart', () => {
        mSession = mXRRenderer.xr.getSession();

        setupListeners();

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

    let controllerGroup = new THREE.Group();

    const mControllerR = mXRRenderer.xr.getController(1);
    const mControllerGripR = mXRRenderer.xr.getControllerGrip(1);
    const mControllerRTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.01, 0.02, 3).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true }));
    mControllerRTip.position.set(-0.005, 0, -0.03);
    mControllerR.addEventListener('connected', function (event) {
        this.add(mControllerRTip);
        mControllerGripR.add(new XRControllerModelFactory().createControllerModel(mControllerGripR));
    });
    mControllerR.addEventListener('disconnected', function () {
        this.remove(mControllerRTip);
    });

    controllerGroup.add(mControllerR);
    controllerGroup.add(mControllerGripR);

    const mControllerL = mXRRenderer.xr.getController(0);
    const mControllerGripL = mXRRenderer.xr.getControllerGrip(0);
    const mControllerLTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.01, 0.02, 3).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true }));
    mControllerLTip.position.set(0.005, 0, -0.03);
    mControllerL.addEventListener('connected', function (event) {
        this.add(mControllerLTip);
        mControllerGripL.add(new XRControllerModelFactory().createControllerModel(mControllerGripL));
    });
    mControllerL.addEventListener('disconnected', function () {
        this.remove(mControllerLTip);
    });

    controllerGroup.add(mControllerL);
    controllerGroup.add(mControllerGripL);

    function setupListeners() {
        if (!mSession) return;

        mSession.addEventListener('selectstart', updateInteractionState);
        mSession.addEventListener('selectend', updateInteractionState);
        mSession.addEventListener('squeezestart', updateInteractionState);
        mSession.addEventListener('squeezeend', updateInteractionState);
    }

    function setScene(scene) {
        if (mSceneController) {
            mSceneController.getScene().remove(controllerGroup);
        }
        mSceneController = scene;
        // Maybe do this on session start?
        mSceneController.getScene().add(controllerGroup);
    }

    function xrRender(time) {
        if (time < 0) return;
        if (!mSceneController) return;
        mXRRenderer.render(mSceneController.getScene(), mXRCamera);

        if (mSystemState.interaction) {
            if (mSystemState.interaction.type == LEFT_DRAG || mSystemState.interaction.type == RIGHT_DRAG) {
                let controller = mSystemState.interaction.type == LEFT_DRAG ? mControllerLTip : mControllerRTip;
                let controllerPos = new THREE.Vector3();
                controller.getWorldPosition(controllerPos);
                mSystemState.interaction.target.setTargetWorldPosition(
                    new THREE.Vector3().addVectors(controllerPos, mSystemState.interaction.positionDiff));
            } else if (mSystemState.interaction.type == KINEMATIC_DRAG) {
                let freezeController = mSystemState.interaction.freezeLeft ? mControllerLTip : mControllerRTip;
                let freezeControllerPos = new THREE.Vector3();
                freezeController.getWorldPosition(freezeControllerPos);
                mSystemState.interaction.rootTarget.setTargetWorldPosition(
                    new THREE.Vector3().addVectors(freezeControllerPos, mSystemState.interaction.positionDiff));

                let movingController = mSystemState.interaction.freezeLeft ? mControllerRTip : mControllerLTip;
                let movingcontrollerPos = new THREE.Vector3();
                movingController.getWorldPosition(movingcontrollerPos);
                let localPosition = mSystemState.interaction.rootBone.worldToLocal(movingcontrollerPos);
                mSystemState.interaction.controlBone.position.copy(localPosition);
                mIKSolver?.update();
            }
        }

        updateInputState();
    }

    function updateInteractionState() {
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
        } else if (leftHandDragState()) {
            if (!mSystemState.interaction || mSystemState.interaction.type != LEFT_DRAG) {
                endInteraction();
                let target = mSystemState.lHovered[0];
                let rootTarget = target.getRoot();
                startDrag(LEFT_DRAG, mControllerLTip, rootTarget);
            }
        } else if (rightHandDragState()) {
            if (!mSystemState.interaction || mSystemState.interaction.type != RIGHT_DRAG) {
                endInteraction();
                let target = mSystemState.rHovered[0];
                let rootTarget = target.getRoot();
                startDrag(RIGHT_DRAG, mControllerRTip, rootTarget);
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

    function startDrag(type, controller, target) {
        let controllerPos = new THREE.Vector3();
        controller.getWorldPosition(controllerPos)
        let positionDiff = new THREE.Vector3().subVectors(
            target.getTargetWorldPosition(),
            controllerPos);
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

        let leftTarget = mSystemState.lHovered[0];
        let dragRoot = leftTarget.getRoot();
        let rightTarget = mSystemState.rHovered.find(t => t.getRoot().getId() == dragRoot.getId());
        if (!rightTarget) {
            rightTarget = mSystemState.rHovered[0]
            dragRoot = rightTarget.getRoot();
            leftTarget = mSystemState.lHovered.find(t => t.getRoot().getId() == dragRoot.getId());
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
        let target = mSystemState.rHovered.find(h => h.getId() == mSystemState.lHovered[0].getId());
        if (!target) {
            target = mSystemState.lHovered.find(h => h.getId() == mSystemState.rHovered[0].getId());
        }
        return target;
    }

    function startKinimaticDrag(freezeLeft) {
        let targets = getKinematicDragTargets();

        let movingTarget = freezeLeft ? targets.rightTarget : targets.leftTarget;

        let rootTarget = movingTarget.getRoot();
        let targetBone = movingTarget.getObject3D();
        let rootBone = rootTarget.getObject3D();

        let intersection = movingTarget.getIntersection();
        let controlBone = new THREE.Bone();

        let targetChild = targetBone.children.find(b => b.type == "Bone");
        let localPosition = targetChild.worldToLocal(intersection.point);

        controlBone.position.copy(localPosition)
        rootBone.add(controlBone);

        let bones = []
        rootBone.traverse(b => {
            if (b.type == "Bone") bones.push(b);
        })

        const skeleton = new THREE.Skeleton(bones);
        const mesh = new THREE.SkinnedMesh();
        mesh.bind(skeleton);

        let freezeChain = []
        let freezeTarget = freezeLeft ? targets.leftTarget : targets.rightTarget;
        let freezeParent = freezeTarget;
        while (freezeParent && freezeParent.getId() != rootTarget.getId()) {
            freezeChain.push(freezeParent);
            freezeParent = freezeParent.getParent();
        }

        let affectedTargets = [movingTarget]
        let affectedParent = movingTarget.getParent();
        while (affectedParent.getId() != rootTarget.getId() &&
            !freezeChain.find(i => i.getId() == affectedParent.getId())) {
            affectedTargets.push(affectedParent);
            affectedParent = affectedParent.getParent();
        }

        let links = affectedTargets.map(t => {
            return { index: bones.indexOf(t.getObject3D()) };
        })
        links.unshift({ index: bones.indexOf(movingTarget.getObject3D()) })

        const iks = [{
            target: bones.indexOf(controlBone),
            effector: bones.indexOf(targetChild),
            links,
        }];
        mIKSolver = new CCDIKSolver(mesh, iks);
        mCCDIKHelper = new CCDIKHelper(mesh, iks, 0.01);
        mSceneController.getScene().add(mCCDIKHelper);

        let controller = freezeLeft ? mControllerLTip : mControllerRTip;
        let controllerPos = new THREE.Vector3();
        controller.getWorldPosition(controllerPos);

        let positionDiff = new THREE.Vector3().subVectors(
            rootTarget.getTargetWorldPosition(), controllerPos);

        mSystemState.interaction = {
            type: KINEMATIC_DRAG,
            movingTarget,
            freezeTarget,
            rootTarget,
            rootBone,
            freezeLeft,
            controlBone,
            targetChild,
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
            mMoveChainCallback(interaction.affectedTargets.map(t => {
                return {
                    id: t.getId(),
                    position: t.getTargetLocalPosition(),
                    orientation: t.getTargetLocalOrientation(),
                }
            }))

            mIKSolver = null
        }

        if (mCCDIKHelper) {
            mSceneController.getScene().remove(mCCDIKHelper);
            mCCDIKHelper = null;
        }

    }

    function updateInputState() {
        // check Axis for forward push
        // if so, teleporting

        if (mSystemState.teleporting) {

        } else {
            updateHoverArray();
        }
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
            let controllerLPos = new THREE.Vector3();
            mControllerLTip.getWorldPosition(controllerLPos);
            if (frustum.containsPoint(controllerLPos)) {
                mSystemState.lHovered.push(...mSceneController.getIntersections(getRay(cameraPosition, controllerLPos)));
            };
        }

        if (!mSystemState.primaryRPressed && !mSystemState.gripRPressed) {
            mSystemState.rHovered = [];
            let controllerRPos = new THREE.Vector3();
            mControllerRTip.getWorldPosition(controllerRPos);
            if (frustum.containsPoint(controllerRPos)) {
                mSystemState.rHovered.push(...mSceneController.getIntersections(getRay(cameraPosition, controllerRPos)));
            };
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

        return new THREE.Raycaster(p1, dir, 0, dist);
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

    function getOneHandDragStartTarget() {
        // we only return a valid target if we're not already interacting.
        if (mSystemState.interaction && (mSystemState.interaction.type == LEFT_DRAG ||
            mSystemState.interaction.type == RIGHT_DRAG)) return false;
        if (mSystemState.primaryLPressed && mSystemState.lHovered.length > 0) {
            return mSystemState.lHovered[0];
        } else if (mSystemState.primaryRPressed && mSystemState.rHovered.length > 0) {
            return mSystemState.rHovered[0];
        };
    }

    function getTwoHandDragStartTarget() {
        if (!mSystemState.interaction || !(mSystemState.interaction.type == LEFT_DRAG ||
            mSystemState.interaction.type == RIGHT_DRAG)) {
            return false;
        }

        let dragRoot = mSystemState.interaction.target.getRoot();
        let otherHandTargets = mSystemState.interaction.type == LEFT_DRAG ?
            mSystemState.rHovered : mSystemState.lHovered;
        let validTarget = otherHandTargets.find(t => t.getRoot().getId() == dragRoot.getId());
        if (validTarget) {
            return validTarget;
        }

        return false;
    }

    this.onSessionStart = (func) => mOnSessionStartCallback = func;
    this.onSessionEnd = (func) => mOnSessionEndCallback = func;
    this.onMove = (func) => { mMoveCallback = func }
    this.onMoveChain = (func) => { mMoveChainCallback = func }

    this.startRendering = function () { mXRRenderer.setAnimationLoop(xrRender); }
    this.stopRendering = function () { mXRRenderer.setAnimationLoop(null); }
    this.setScene = setScene;
    this.getVRButton = () => vrButton;
}
