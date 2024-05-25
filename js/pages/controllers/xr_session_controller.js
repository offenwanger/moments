import * as THREE from 'three';
import { USER_HEIGHT } from '../../constants.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

export function XRSessionController(parentContainer) {
    let mOnSessionStartCallback = () => { }
    let mOnSessionEndCallback = () => { }

    let mSceneController;

    const fov = 75, aspect = 2, near = 0.1, far = 200;
    const mXRCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    mXRCamera.position.set(0, USER_HEIGHT, 0);

    let mXRCanvas = document.createElement('canvas');
    mXRCanvas.height = 100;
    mXRCanvas.width = 100;

    let mXRRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: mXRCanvas });
    mXRRenderer.xr.enabled = true;
    mXRRenderer.xr.addEventListener('sessionstart', () => {
        mOnSessionStartCallback();
    })
    mXRRenderer.xr.addEventListener('sessionend', () => {
        mOnSessionEndCallback();
    })

    let vrButton = VRButton.createButton(mXRRenderer);

    let controllerGroup = new THREE.Group();

    const mController1 = mXRRenderer.xr.getController(0);
    mController1.addEventListener('selectstart', () => { console.error("Inpliment me!") });
    mController1.addEventListener('selectend', () => { console.error("Inpliment me!") });
    mController1.addEventListener('connected', function (event) {
        this.add(buildController(event.data));
    });
    mController1.addEventListener('disconnected', function () {
        this.remove(this.children[0]);
    });
    controllerGroup.add(mController1);

    const mController2 = mXRRenderer.xr.getController(1);
    mController2.addEventListener('selectstart', () => { console.error("Inpliment me!") });
    mController2.addEventListener('selectend', () => { console.error("Inpliment me!") });
    mController2.addEventListener('connected', function (event) {
        if (event.data.targetRayMode != 'tracked-pointer') {
            console.error("I have no idea why this connect is happening. No idea what device might cause it.", event.data.targetRayMode)
        }
    });
    mController2.addEventListener('disconnected', function () {
        this.remove(this.children[0]);
    });
    controllerGroup.add(mController2);

    // Make controllers for if we have them
    let controllerGrip1 = mXRRenderer.xr.getControllerGrip(0);
    controllerGrip1.add(new XRControllerModelFactory().createControllerModel(controllerGrip1));
    controllerGroup.add(controllerGrip1);

    let controllerGrip2 = mXRRenderer.xr.getControllerGrip(1);
    controllerGrip2.add(new XRControllerModelFactory().createControllerModel(controllerGrip2));
    controllerGroup.add(controllerGrip2);


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

    this.onSessionStart = (func) => mOnSessionStartCallback = func;
    this.onSessionEnd = (func) => mOnSessionEndCallback = func;

    this.startRendering = function () { mXRRenderer.setAnimationLoop(xrRender); }
    this.stopRendering = function () { mXRRenderer.setAnimationLoop(null); }
    this.setScene = setScene;
    this.getVRButton = () => vrButton;
}