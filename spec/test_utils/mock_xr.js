
import * as THREE from 'three';

export function mockXR() {
    let session = new mockSession();
    let controller0 = new mockController();
    controller0.handedness = 'left';
    let controller1 = new mockController();
    controller1.handedness = 'right';
    let controllerGrip0 = new mockController();
    let controllerGrip1 = new mockController();

    session.inputSources.push(controller0, controller1);

    return {
        eventListeners: {},
        enabled: false,
        addEventListener: function (event, func) { this.eventListeners[event] = func },
        getController: (index) => {
            if (index === 0) return controller0;
            if (index === 1) return controller1;
        },
        getControllerGrip: (index) => {
            if (index === 0) return controllerGrip0;
            if (index === 1) return controllerGrip1;
        },
        getSession: () => session,
        isSessionSupported: async () => true,
        requestSession: async () => { return session },
        setSession: () => { session = session }
    }
}

export function mockXRControllerModelFactory() {
    this.createControllerModel = function () { return new THREE.Object3D() }
}

export function mockSession() {
    this.eventListeners = {}
    this.addEventListener = function (event, func) {
        this.eventListeners[event] = func
    }
    this.inputSources = [];
}

export function mockController() {
    let controller = new THREE.Object3D();
    controller.eventListeners = {};
    controller.addEventListener = function (event, func) {
        this.eventListeners[event] = func
    }
    controller.gamepad = {
        buttons: [{ pressed: false }, { pressed: false }],
        axes: [0, 0, 0, 0]
    }
    return controller;
}
