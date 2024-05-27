import * as THREE from 'three';
import { USER_HEIGHT } from '../../constants.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Util } from '../../utils/utility.js';

export function XRSessionController() {
    let mOnSessionStartCallback = () => { }
    let mOnSessionEndCallback = () => { }

    let mSystemState = {
        interacting: false,
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

    const mController1 = mXRRenderer.xr.getController(0);
    const mControllerGrip1 = mXRRenderer.xr.getControllerGrip(0);
    const mController1Tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.01, 0.02, 3).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true }));
    mController1Tip.position.set(-0.005, 0, -0.03);
    mController1.addEventListener('connected', function (event) {
        this.add(mController1Tip);
        mControllerGrip1.add(new XRControllerModelFactory().createControllerModel(mControllerGrip1));
    });
    mController1.addEventListener('disconnected', function () {
        this.remove(mController1Tip);
    });

    controllerGroup.add(mController1);
    controllerGroup.add(mControllerGrip1);

    const mController2 = mXRRenderer.xr.getController(1);
    const mControllerGrip2 = mXRRenderer.xr.getControllerGrip(1);
    const mController2Tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.01, 0.02, 3).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true }));
    mController2Tip.position.set(0.005, 0, -0.03);
    mController2.addEventListener('connected', function (event) {
        this.add(mController2Tip);
        mControllerGrip2.add(new XRControllerModelFactory().createControllerModel(mControllerGrip2));
    });
    mController2.addEventListener('disconnected', function () {
        this.remove(mController2Tip);
    });

    controllerGroup.add(mController2);
    controllerGroup.add(mControllerGrip2);

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

        updateInputState();
    }

    function updateInteractionState() {
        let leftController = getLeftContoller();
        let rightContoller = getRightController();

        if (leftController && leftController.gamepad) {
            // trigger button
            let primaryButton = leftController.gamepad.buttons[0];
            if (primaryButton && primaryButton.pressed) {

            } else {

            }

            // grip button
            let secondaryButton = leftController.gamepad.buttons[1]
            if (secondaryButton && secondaryButton) {

            } else {

            }
        }

        if (rightContoller && rightContoller.gamepad) {
            // trigger button
            let primaryButton = leftController.gamepad.buttons[0];
            if (primaryButton && primaryButton.pressed) {

            } else {

            }

            // grip button
            let secondaryButton = leftController.gamepad.buttons[1]
            if (secondaryButton && secondaryButton) {

            } else {

            }
        }

    }

    function updateInputState() {
        // check Axis for forward push
        // if so, teleporting

        if (!mSystemState.interacting && !mSystemState.teleporting) {
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

        let controllerLPos = mController1Tip.getWorldPosition(new THREE.Vector3());
        let controllerRPos = mController2Tip.getWorldPosition(new THREE.Vector3());

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

        if (mSystemState.lHovered.concat(mSystemState.rHovered).map(i => i.id).sort().join() != oldHovered.map(i => i.id).sort().join()) {
            oldHovered.forEach(item => item.wrapper.unhighlight());
            mSystemState.lHovered.concat(mSystemState.rHovered).forEach(item => item.wrapper.highlight())
        }
        // mSystemState.lHovered.sort((a, b) => )
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
