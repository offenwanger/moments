import * as THREE from "three";

export class InteractionTargetInterface {
    getId = () => { return "No ID" };

    getLocalPosition = () => { return new THREE.Vector3(); }
    getWorldPosition = () => { return new THREE.Vector3(); }
    setWorldPosition = (worldPosition) => { }
    getLocalOrientation = () => { return new THREE.Quaternion() }
    setLocalOrientation = (orientation) => { }

    getScale = () => { return 1 }
    setScale = (scale) => { }

    // update visual state
    highlight = (toolMode) => { };
    select = (toolMode) => { };
    idle = (toolMode) => { };

    getIntersection = () => { return {} }
    getObject3D = () => { return null; }
    getParent = () => { return null; }
    getRoot = function () { return this; }
    getDepth = () => { return 0; }

    isButton = () => false;
}