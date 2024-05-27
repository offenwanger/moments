import * as THREE from "three"

export function InteractionTargetWrapper() {
    this.getPosition = () => { return new THREE.Vector3(); }
    this.setPosition = (position) => { }
    this.getOrientation = () => { return new THREE.Quaternion() }
    this.setOrientation = (quaternion) => { }
    this.highlight = () => { };
    this.unhighlight = () => { };
}