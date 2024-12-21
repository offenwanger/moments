import * as THREE from "three";

export class InteractionTargetInterface {
    getId = () => { return "No ID" };

    // For PosableAssets and Pictures, audio, etc. 
    getLocalPosition = () => { return new THREE.Vector3(); }
    getWorldPosition = () => { return new THREE.Vector3(); }
    setWorldPosition = (worldPosition) => { }
    getLocalOrientation = () => { return new THREE.Quaternion() }
    setLocalOrientation = (orientation) => { }

    getScale = () => { return 1 }
    setScale = (scale) => { }

    // For Photosphere
    getBlurCanvas = () => { return document.createElement('canvas'); }
    getColorCanvas = () => { return document.createElement('canvas'); }
    getDrawnPath = () => { return []; }
    getNormalAndDist = () => { return { normal: [0, 0, 1], dist: -1 } }
    setBlurCanvas = () => { }
    setColorCanvas = () => { }

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
    isTeleport = () => false;
    isAudio = () => false;
}