import * as THREE from "three"

export function InteractionTargetWrapper() {
    this.getLocalPosition = () => { return new THREE.Vector3(); }

    this.getWorldPosition = () => { return new THREE.Vector3(); }
    this.setWorldPosition = (worldPosition) => { }

    this.getLocalOrientation = () => { return new THREE.Quaternion() }
    this.setLocalOrientation = (orientation) => { }

    this.getScale = () => { return 1 }
    this.setScale = (scale) => { }

    this.highlight = () => { };
    this.unhighlight = () => { };

    this.getIntersection = () => { return {} }
    this.getObject3D = () => { return null; }
    this.getParent = () => { return new InteractionTargetWrapper(); }
    this.getRoot = () => { return new InteractionTargetWrapper(); }
    this.getDepth = () => { return 0; }
}