import * as C from '../constants.js';
import { Util } from '../utils/utility.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export function InputController(camera, renderer, parent) {
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
    let mDragging = false;

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
    parent.add(mController1);

    const mController2 = renderer.xr.getController(1);
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
    parent.add(mController2);

    // Make controllers for if we have them
    let controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(new XRControllerModelFactory().createControllerModel(controllerGrip1));
    parent.add(controllerGrip1);

    let controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(new XRControllerModelFactory().createControllerModel(controllerGrip2));
    parent.add(controllerGrip2);

    document.addEventListener('keydown', event => {
        if (event.code === 'Space' && !event.repeat) {
            onSelectStart()
        }
    })

    document.addEventListener('keyup', event => {
        if (event.code === 'Space') {
            onSelectEnd();
        }
    })

    function getLookTarget(camera, storyController) {
        let moments = storyController.getMoments();
        let origin = storyController.worldToLocalPosition(camera.position);
        let lookDirection = storyController.worldToLocalRotation(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)).add(origin);
        for (let i = 0; i < moments.length; i++) {
            if (origin.distanceTo(moments[i].getPosition()) > INTERACTION_DISTANCE) { break; }
            let targeted = Util.hasSphereIntersection(origin, lookDirection, moments[i].getPosition(), moments[i].getSize());
            if (targeted) {
                mLastLookTarget = {
                    type: C.LookTarget.MOMENT,
                    moment: moments[i]
                };
                return mLastLookTarget;
            }
        }

        let lookAngles = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
        // X => Pi/2 = straight up, -PI/2 straight down, 0 = horizon
        let upAngle = Math.PI * 7 / 8;

        if (lookAngles.x > upAngle) {
            mLastLookTarget = { type: C.LookTarget.UP };
            return mLastLookTarget;
        } else {
            let userPosition = storyController.worldToLocalPosition(camera.position);
            let userLookDirection = storyController.worldToLocalRotation(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion));
            let pathLineIntersection = pathLineTarget(userPosition, userLookDirection, storyController.getPathLine())
            if (pathLineIntersection.distance < INTERACTION_DISTANCE) {
                mLastLookTarget = {
                    type: C.LookTarget.LINE_SURFACE,
                    position: storyController.localToWorldPosition(pathLineIntersection.position),
                    normal: storyController.localToWorldRotation(pathLineIntersection.normal),
                };
            } else {
                mLastLookTarget = { type: C.LookTarget.NONE };
            }

            return mLastLookTarget;
        }
    }

    function onSelectStart() {
        if (mLastLookTarget.type == C.LookTarget.MOMENT &&
            (mMode == MODE_CARDBOARD || mMode == MODE_SCREEN)) {
            mDragStartCallback(mLastLookTarget.moment);
            mDragging = true;
        }
    }

    function onSelectEnd() {
        if (mDragging) {
            mDragging = false;
            mDragEndCallback();
        } else if (mLastLookTarget.type == C.LookTarget.LINE_SURFACE ||
            mLastLookTarget.type == C.LookTarget.UP) {
            mClickCallback();
        }
    }

    function pathLineTarget(origin, direction, pathLine) {
        let points = pathLine.getPoints();
        let ray = new THREE.Line3(origin, origin.clone().add(direction));

        let closestPoint = ray.closestPointToPoint(points[0], false, new THREE.Vector3());
        let minDist = closestPoint.distanceTo(points[0]);
        let minIndex = 0;
        for (let i = 1; i < points.length; i++) {
            let point = ray.closestPointToPoint(points[i], false, new THREE.Vector3());
            let dist = point.distanceTo(points[i]);
            if (dist < minDist) {
                closestPoint = point;
                minDist = dist;
                minIndex = i;
            }
        }

        let linePoint = pathLine.getClosestPoint(closestPoint);
        let xVector = new THREE.Vector3().crossVectors(linePoint.tangent, linePoint.normal);
        let xProjection = closestPoint.clone().sub(linePoint.position).projectOnVector(xVector).add(linePoint.position);

        return {
            position: xProjection,
            linePosition: linePoint.position,
            tangent: linePoint.tangent,
            normal: linePoint.normal,
            xOffset: -xProjection.dot(xVector),
            distance: xProjection.distanceTo(linePoint.position),
        }
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
    this.setDragEndCallback = (callback) => mDragEndCallback = callback;
    this.setCameraPositionChangeCallback = (callback) => mCameraPositionChangeCallback = callback;
}