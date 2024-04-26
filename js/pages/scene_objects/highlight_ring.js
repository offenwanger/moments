import * as THREE from 'three';

export function HighlightRing(parent, assetUtil) {
    const UP = new THREE.Vector3(0, 1, 0);

    const geometry = new THREE.CylinderGeometry(0.5, 0.4, 0.3, 32, 1, true)
    const texture = assetUtil.loadTextureSync('flat_halo_v1.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(4, 1);
    const alphatexture = assetUtil.loadTextureSync('halo_alphaMap_v1.png');
    alphatexture.wrapS = THREE.RepeatWrapping;
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        alphaMap: alphatexture,
        side: THREE.DoubleSide,
        transparent: true
    });
    const mRing = new THREE.Mesh(geometry, material);
    mRing.visible = false;
    parent.add(mRing);

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