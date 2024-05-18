import * as THREE from 'three';
import { USER_HEIGHT } from '../../constants.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

export function XRSessionController(parentContainer, mScene) {
    const INTERACTION_DISTANCE = 10;
    const MODE_CARDBOARD = 'cardboard';
    const MODE_SCREEN = 'screen';
    const MODE_HEADSET = 'headset';

    const fov = 75, aspect = 2, near = 0.1, far = 200;

    let mOnSessionStartCallback = () => { }
    let mOnSessionEndCallback = () => { }

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

    function xrRender(time) {
        if (time < 0) return;
        mXRRenderer.render(mScene, mXRCamera);
    }

    let vrButton = VRButton.createButton(mXRRenderer);
    let vrButtonDiv = parentContainer.append("div")
        .style('position', 'absolute')
        .style('top', '40px')
        .style('left', '20px')
    vrButtonDiv.node().appendChild(vrButton);
    d3.select(vrButton).style("position", "relative")

    let controllerGroup = new THREE.Group();
    mScene.add(controllerGroup)

    const mController1 = mXRRenderer.xr.getController(0);
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
    controllerGroup.add(mController1);

    const mController2 = mXRRenderer.xr.getController(1);
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
    controllerGroup.add(mController2);

    // Make controllers for if we have them
    let controllerGrip1 = mXRRenderer.xr.getControllerGrip(0);
    controllerGrip1.add(new XRControllerModelFactory().createControllerModel(controllerGrip1));
    controllerGroup.add(controllerGrip1);

    let controllerGrip2 = mXRRenderer.xr.getControllerGrip(1);
    controllerGrip2.add(new XRControllerModelFactory().createControllerModel(controllerGrip2));
    controllerGroup.add(controllerGrip2);


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

    function onSelectStart() {
        if (mLastLookTarget.type == LookTarget.MOMENT &&
            (mMode == MODE_CARDBOARD || mMode == MODE_SCREEN)) {
            mDragStartCallback(mLastLookTarget.moment);
            mDragging = true;
        }
    }

    function onSelectEnd() {
        if (mDragging) {
            mDragging = false;
            mDragEndCallback();
        } else if (mLastLookTarget.type == LookTarget.LINE_SURFACE ||
            mLastLookTarget.type == LookTarget.UP) {
            mClickCallback();
        }
    }

    this.onSessionStart = (func) => mOnSessionStartCallback = func;
    this.onSessionEnd = (func) => mOnSessionEndCallback = func;

    this.startRendering = function () { mXRRenderer.setAnimationLoop(xrRender); }
    this.stopRendering = function () { mXRRenderer.setAnimationLoop(null); }
}