import * as C from './constants.js';
import { Util } from './utility.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export function InputManager(camera, renderer, parentScene) {
    const INTERACTION_DISTANCE = 10;
    const MODE_CARDBOARD = 'cardboard';
    const MODE_SCREEN = 'screen';
    const MODE_HEADSET = 'headset';
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
    let mCameraPositionChangeCallback = () => { };

    let mMode = MODE_SCREEN;
    let mLastLookTarget;

    const mOrbitControls = new OrbitControls(camera, renderer.domElement);
    mOrbitControls.minDistance = 2;
    mOrbitControls.maxDistance = 2;
    mOrbitControls.target.set(0, 2, -2);
    mOrbitControls.update();
    mOrbitControls.addEventListener('change', () => {
        mCameraPositionChangeCallback();
    })

    renderer.xr.addEventListener('sessionstart', () => {
        mOrbitControls.enabled = false;
    })

    renderer.xr.addEventListener('sessionend', () => {
        mOrbitControls.enabled = true;
    })

    const mController1 = renderer.xr.getController(0);
    mController1.addEventListener('selectstart', onSelectStart);
    mController1.addEventListener('selectend', onSelectEnd);
    mController1.addEventListener('connected', function (event) {
        if (event.data.targetRayMode == 'gaze') {
            // we now know we are in Cardboard mode, hooray!
            mMode = MODE_CARDBOARD;
        } else if (event.data.targetRayMode == 'tracked-pointer') {
            // We don't do any pointing pointing, just grabbing. 
            mMode = MODE_HEADSET;
        } else if (event.data.targetRayMode == 'screen') {
            console.error("I don't even know what kind of device results in screen...")
        } else {
            console.error("This shouldn't happen.", event.data.targetRayMode)
        }
        this.add(buildController(event.data));
    });
    mController1.addEventListener('disconnected', function () {
        this.remove(this.children[0]);
    });
    parentScene.add(mController1);

    let mController2 = renderer.xr.getController(1);
    mController2.addEventListener('selectstart', onSelectStart);
    mController2.addEventListener('selectend', onSelectEnd);
    mController2.addEventListener('connected', function (event) {
        if (event.data.targetRayMode != 'tracked-pointer') {
            console.error("I have no idea why this is happening.", event.data.targetRayMode)
        }

        // This we will need for the authoring system, not the viewer.
    });
    mController2.addEventListener('disconnected', function () {
        this.remove(this.children[0]);
    });
    parentScene.add(mController2);

    // Make controllers for if we have them
    let controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(new XRControllerModelFactory().createControllerModel(controllerGrip1));
    parentScene.add(controllerGrip1);

    let controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(new XRControllerModelFactory().createControllerModel(controllerGrip2));
    parentScene.add(controllerGrip2);

    function getLookTarget(camera, moments) {
        for (let i = 0; i < moments.length; i++) {
            if (moments[i].tDist > INTERACTION_DISTANCE) { break; }
            if (isTargeted(camera, moments[i])) {
                mLastLookTarget = {
                    type: C.LookTarget.MOMENT,
                    moment: moments[i]
                };
                return mLastLookTarget;
            }
        }

        let lookAngles = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
        // X => Pi/2 = straight up, -PI/2 straight down, 0 = horizon
        // Y => 0 = neg Z, Pi/-Pi = pos Z
        let downAngle = -Math.PI / 8;
        let horizonTop = Math.PI / 4;
        let upAngle = Math.PI * 7 / 8;
        if (lookAngles.x < horizonTop && lookAngles.x > downAngle) {
            if (Math.abs(lookAngles.y) < Math.PI / 4) {
                mLastLookTarget = { type: C.LookTarget.HORIZON_FORWARD };
                return mLastLookTarget;
            } else if (Math.abs(lookAngles.y) > Math.PI * 3 / 4) {
                mLastLookTarget = { type: C.LookTarget.HORIZON_BACKWARD };
                return mLastLookTarget;
            }
        } else if (lookAngles.x < downAngle) {
            let lookDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            mLastLookTarget = {
                type: C.LookTarget.GROUND,
                position: Util.planeIntersection(camera.position, lookDirection, new THREE.Vector3(0, 1, 0), new THREE.Vector3())
            };
            return mLastLookTarget;
        } else if (lookAngles.x > upAngle) {
            mLastLookTarget = { type: C.LookTarget.UP };
            return mLastLookTarget;
        }

        mLastLookTarget = { type: C.LookTarget.NONE };
        return mLastLookTarget;
    }

    function onSelectStart() {
        if (mLastLookTarget.type = C.LookTarget.MOMENT && mMode == MODE_CARDBOARD) {
            mDragStartCallback(mLastLookTarget.moment);
        }
    }

    function onSelectEnd() {
        if (mLastLookTarget.type = C.LookTarget.MOMENT && mMode == MODE_CARDBOARD) {
            mDragEndCallback();
        }
    }

    function isTargeted(camera, moment) {
        if (moment.getPosition().distanceTo(camera.position) > INTERACTION_DISTANCE) return false;
        return Util.hasSphereIntersection(camera.position, new THREE.Vector3(0, 0, - 1).applyQuaternion(camera.quaternion).add(camera.position),
            moment.getPosition(), moment.getSize())
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

    this.getLookTarget = getLookTarget;
    this.setClickCallback = (callback) => mClickCallback = callback;
    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setDragCallback = (callback) => mDragCallback = callback;
    this.setDragEndCallback = (callback) => mDragEndCallback = callback;
    this.setCameraPositionChangeCallback = (callback) => mCameraPositionChangeCallback = callback;
}