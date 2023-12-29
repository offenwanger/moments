import * as C from './constants.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Util } from './utility.js';

export function InputManager(camera, renderer) {
    const INTERACTION_DISTANCE = 10;
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
    let mDragCallback = () => { }
    let mDragEndCallback = () => { }
    let mCameraPositionChangeCallback = () => { };

    const mOrbitControls = new OrbitControls(camera, renderer.domElement);
    mOrbitControls.minDistance = 2;
    mOrbitControls.maxDistance = 2;
    mOrbitControls.target.set(0, 2, -2);
    mOrbitControls.update();
    mOrbitControls.addEventListener('change', () => {
        mCameraPositionChangeCallback();
    })

    function getLookTarget(camera, moments) {
        for (let i = 0; i < moments.length; i++) {
            if (moments[i].tDist > INTERACTION_DISTANCE) { break; }
            if (isTargeted(camera, moments[i])) {
                return {
                    type: C.LookTarget.MOMENT,
                    moment: moments[i]
                }
            }
        }

        // TODO: check for ground/hoizon/up

        return { type: C.LookTarget.NONE };
    }

    function isTargeted(camera, moment) {
        if (moment.getPosition().distanceTo(camera.position) > INTERACTION_DISTANCE) return false;
        return Util.hasSphereIntersection(camera.position, new THREE.Vector3(0, 0, - 1).applyQuaternion(camera.quaternion).add(camera.position),
            moment.getPosition(), moment.getSize())
    }

    renderer.xr.addEventListener('sessionstart', () => {
        mOrbitControls.enabled = false;
    })

    renderer.xr.addEventListener('sessionend', () => {
        mOrbitControls.enabled = true;
    })

    this.getLookTarget = getLookTarget;
    this.setClickCallback = (callback) => mClickCallback = callback;
    this.setDragStartCallback = (callback) => mDragStartCallback = callback;
    this.setDragCallback = (callback) => mDragCallback = callback;
    this.setDragEndCallback = (callback) => mDragEndCallback = callback;
    this.setCameraPositionChangeCallback = (callback) => mCameraPositionChangeCallback = callback;
}