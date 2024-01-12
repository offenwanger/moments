import * as THREE from 'three';

export function HighlightRing(parentScene) {
    const UP = new THREE.Vector3(0, 1, 0);

    const geometry = new THREE.CylinderGeometry(0.5, 0.4, 0.3, 32, 1, true)
    const texture = new THREE.TextureLoader().load('assets/flat_halo_v1.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(4, 1);
    const alphatexture = new THREE.TextureLoader().load('assets/halo_alphaMap_v1.png');
    alphatexture.wrapS = THREE.RepeatWrapping;
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        alphaMap: alphatexture,
        side: THREE.DoubleSide,
        transparent: true
    });
    const mRing = new THREE.Mesh(geometry, material);
    mRing.visible = false;
    parentScene.add(mRing);

    function show() {
        mRing.visible = true;
    }

    function hide() {
        mRing.visible = false;
    }

    function setPosition(pos) {
        mRing.position.copy(pos);
    }

    function rotateUp(upVector = UP) {
        mRing.quaternion.setFromUnitVectors(UP, upVector)
    }

    function animate(time) {
        texture.offset = new THREE.Vector2(time * 0.1, 0)
    }

    this.show = show;
    this.hide = hide;
    this.setPosition = setPosition;
    this.rotateUp = rotateUp;
    this.animate = animate;
}