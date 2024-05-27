import * as THREE from 'three';
import { USER_HEIGHT } from '../../constants.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Util } from '../../utils/utility.js';

const ONE_HAND_GRAB_MOVE = 'oneHandedGrabMove'
const TWO_HAND_GRAB_MOVE = 'twoHandedGrabMove'
const LEFT = 'left'
const RIGHT = 'right'

export function XRSessionController() {
    let mOnSessionStartCallback = () => { }
    let mOnSessionEndCallback = () => { }

    let mSystemState = {
        interaction: false,
        lHovered: [],
        rHovered: [],
        teleporting: false,
    }

    let mSceneController;
    let mSession;

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
            if (mSystemState.interaction.type == ONE_HAND_GRAB_MOVE) {
                let controller = mSystemState.interaction.hand == LEFT ? mControllerLTip : mControllerRTip;
                let controllerPos = controller.getWorldPosition(new THREE.Vector3());
                console.log(controllerPos, mSystemState.interaction.positionDiff, new THREE.Vector3().addVectors(controllerPos, mSystemState.interaction.positionDiff))
                mSystemState.interaction.target.setPosition(
                    new THREE.Vector3().addVectors(controllerPos, mSystemState.interaction.positionDiff));

            }
        }

        updateInputState();
    }

    function updateInteractionState() {
        let leftController = getLeftContoller();
        let rightController = getRightController();

        let primaryLPressed = false;
        let primaryRPressed = false;
        let gripLPressed = false;
        let gripRPressed = false;

        if (leftController && leftController.gamepad) {
            // trigger button
            primaryLPressed = leftController.gamepad.buttons[0]
                && leftController.gamepad.buttons[0].pressed;
            // grip button
            gripLPressed = leftController.gamepad.buttons[1]
                && leftController.gamepad.buttons[1].pressed;
        }

        if (rightController && rightController.gamepad) {
            // trigger button
            primaryRPressed = rightController.gamepad.buttons[0]
                && rightController.gamepad.buttons[0].pressed;
            // grip button
            gripRPressed = rightController.gamepad.buttons[1]
                && rightController.gamepad.buttons[1].pressed;
        }

        if (!(primaryLPressed || primaryRPressed || gripLPressed || gripRPressed)) {
            endInteraction();
        } else if ((primaryLPressed && mSystemState.lHovered.length > 0) ||
            (primaryRPressed && mSystemState.rHovered.length > 0)) {
            if (!mSystemState.interaction) {
                let hand = (primaryLPressed && mSystemState.lHovered.length) ? LEFT : RIGHT;
                let controller = hand == LEFT ? mControllerLTip : mControllerRTip;
                let target = hand == LEFT ? mSystemState.lHovered[0] : mSystemState.rHovered[0];
                startDrag(hand, controller, target);
            }
        }


        if (!mSystemState.interaction && mSystemState.lHovered.length > 0) {
            let target = mSystemState.lHovered[0];
        }
    }

    function startDrag(hand, controller, target) {
        let positionDiff = new THREE.Vector3().subVectors(
            target.getPosition(),
            controller.getWorldPosition(new THREE.Vector3()));
        let startRemoteOrientation = controller.quaternion;
        let startItemOrientation = target.getOrientation();
        mSystemState.interaction = {
            type: ONE_HAND_GRAB_MOVE,
            hand,
            target,
            positionDiff,
            startRemoteOrientation,
            startItemOrientation,
        }
    }

    function dragToTwoHandDrag() {

    }

    function twoHandDragToOneHandDrag() {

    }

    async function endInteraction() {
        let interaction = mSystemState.interaction;
        mSystemState.interaction = null;

        if (interaction && interaction.type == ONE_HAND_GRAB_MOVE) {
            console.log("set values!")
        }
    }

    function updateInputState() {
        // check Axis for forward push
        // if so, teleporting

        if (!mSystemState.interaction && !mSystemState.teleporting) {
            updateHoverArray();
        }

        if (mSystemState.teleporting) {

        }
    }

    function updateHoverArray() {
        if (!mSceneController) return;

        let oldHovered = mSystemState.lHovered.concat(mSystemState.rHovered);
        mSystemState.lHovered = [];
        mSystemState.rHovered = [];

        let controllerLPos = mControllerLTip.getWorldPosition(new THREE.Vector3());
        let controllerRPos = mControllerRTip.getWorldPosition(new THREE.Vector3());

        let rCalc = false;
        let lCalc = false;
        // first check if controller is in view. 
        // TODO: CHeck if remote is even connected...
        mXRCamera.updateMatrix();
        mXRCamera.updateMatrixWorld();
        var frustum = new THREE.Frustum();
        var projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(mXRCamera.projectionMatrix, mXRCamera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(mXRCamera.projectionMatrix, mXRCamera.matrixWorldInverse));
        if (frustum.containsPoint(controllerLPos)) { lCalc = true; };
        if (frustum.containsPoint(controllerRPos)) { rCalc = true; };

        // if we can't see either remote, no calcs needed. 
        if (!rCalc && !lCalc) return;

        let cameraPosition = new THREE.Vector3(); mXRCamera.getWorldPosition(cameraPosition);
        if (lCalc) {
            mSystemState.lHovered.push(...mSceneController.getIntersections(getRay(cameraPosition, controllerLPos)));
        }
        if (rCalc) {
            mSystemState.rHovered.push(...mSceneController.getIntersections(getRay(cameraPosition, controllerRPos)));
        }

        if (mSystemState.lHovered.concat(mSystemState.rHovered).map(i => i.getId()).sort().join() != oldHovered.map(i => i.getId()).sort().join()) {
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

    this.onSessionStart = (func) => mOnSessionStartCallback = func;
    this.onSessionEnd = (func) => mOnSessionEndCallback = func;

    this.startRendering = function () { mXRRenderer.setAnimationLoop(xrRender); }
    this.stopRendering = function () { mXRRenderer.setAnimationLoop(null); }
    this.setScene = setScene;
    this.getVRButton = () => vrButton;
}
