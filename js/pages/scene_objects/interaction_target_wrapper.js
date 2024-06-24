import * as THREE from "three"

export function InteractionTargetWrapper() {
    this.getTargetLocalPosition = () => { return new THREE.Vector3(); }
    this.getTargetWorldPosition = () => { return new THREE.Vector3(); }
    this.setTargetWorldPosition = (worldPosition) => { }
    this.getTargetLocalOrientation = () => { return new THREE.Quaternion() }
    this.highlight = () => { };
    this.unhighlight = () => { };
    this.getIntersection = () => { return {} }
    this.getObject3D = () => { return null; }
    this.getParent = () => { return new InteractionTargetWrapper(); }
    this.getRoot = () => { return new InteractionTargetWrapper(); }
}