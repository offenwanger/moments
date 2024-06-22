import * as THREE from "three"

export function InteractionTargetWrapper() {
    this.getPosition = () => { return new THREE.Vector3(); }
    // Returns the world position in local coords.
    this.setPosition = (position) => { return new THREE.Vector3(); }
    this.getOrientation = () => { return new THREE.Quaternion() }
    this.setOrientation = (quaternion) => { }
    this.highlight = () => { };
    this.unhighlight = () => { };
    this.getIntersection = () => { return {} }
}