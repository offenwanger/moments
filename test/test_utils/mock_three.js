import THREE from 'three';

export function mockOrbitControls() {
    this.minDistance = 0;
    this.maxDistance = 0;
    this.target = new THREE.Vector3();
    this.update = function () { };
    this.addEventListener = function () { };
    this.enabled = false;
}

export const mockVRButton = {
    createButton: function () {
        return d3.root.append('div').attr("id", "VRButton");
    }
}

export function mockGLTFLoader() {
    this.setDRACOLoader = () => { };
    this.loadAsync = () => { return { scene: new THREE.Scene() } };
}

export function mockDRACOLoader() {
    this.setDecoderPath = () => { };
}

export function mockXRControllerModelFactory() {
    this.createControllerModel = function () { return new THREE.Object3D() }
}
