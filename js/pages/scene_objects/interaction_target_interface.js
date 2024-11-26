import * as THREE from "three"

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
    highlight = () => { };
    select = () => { };
    idle = () => { };

    getIntersection = () => { return {} }
    getObject3D = () => { return null; }
    getParent = () => { return new InteractionTargetInterface(); }
    getRoot = () => { return new InteractionTargetInterface(); }
    getDepth = () => { return 0; }

    isButton = () => false;
}