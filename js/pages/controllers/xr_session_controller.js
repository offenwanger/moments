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
        hovered: [],
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
    mController1.addEventListener('connected', function (event) {
        this.add(buildController(event.data));
    });
    mController1.addEventListener('disconnected', function () {
        this.remove(this.children[0]);
    });

    controllerGroup.add(mController1);

    const mController2 = mXRRenderer.xr.getController(1);
    mController2.addEventListener('connected', function (event) {
        if (event.data.targetRayMode != 'tracked-pointer') {
            console.error("I have no idea why this connect is happening. No idea what device might cause it.", event.data.targetRayMode)
        }
    });
    mController2.addEventListener('disconnected', function () {
        this.remove(this.children[0]);
    });

    // Make controllers for if we have them
    let controllerGrip1 = mXRRenderer.xr.getControllerGrip(0);
    controllerGrip1.add(new XRControllerModelFactory().createControllerModel(controllerGrip1));
    controllerGroup.add(controllerGrip1);

    let controllerGrip2 = mXRRenderer.xr.getControllerGrip(1);
    controllerGrip2.add(new XRControllerModelFactory().createControllerModel(controllerGrip2));
    controllerGroup.add(controllerGrip2);

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

        let oldHovered = mSystemState.hovered;
        mSystemState.hovered = [];

        let controllerLPos = new THREE.Vector3();
        controllerGrip1.getWorldPosition(controllerLPos);

        let controllerRPos = new THREE.Vector3();
        controllerGrip2.getWorldPosition(controllerRPos);

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
            mSystemState.hovered.push(...mSceneController.getIntersections(getRay(cameraPosition, controllerLPos)));
        }
        if (rCalc) {
            mSystemState.hovered.push(...mSceneController.getIntersections(getRay(cameraPosition, controllerRPos)));
        }

        if (mSystemState.hovered.map(i => i.id).sort().join() != oldHovered.map(i => i.id).sort().join()) {
            oldHovered.forEach(item => item.wrapper.unhighlight());
            mSystemState.hovered.forEach(item => item.wrapper.highlight())
        }
    }

    function getRay(p1, p2) {
        let dir = new THREE.Vector3().copy(p2).sub(p1);
        let dist = dir.length();
        dir.normalize();

        return new THREE.Raycaster(p1, dir, 0, dist);
    }

    function buildController(data) {
        let geometry, material;
        switch (data.targetRayMode) {
            case 'tracked-pointer':
            case 'gaze':
                geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, - 1);
                material = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });
                return new THREE.Mesh(geometry, material);
        }
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
