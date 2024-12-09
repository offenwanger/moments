import * as THREE from "three";
import { CanvasUtil } from "../../utils/canvas_util.js";

export function HelperPointController(scene) {
    const mPrimaryPoint = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(CanvasUtil.generateDotCanvas()),
        sizeAttenuation: false,
        depthTest: false
    }));
    mPrimaryPoint.scale.set(0.015, 0.015, 1);
    mPrimaryPoint.renderOrder = Infinity;
    mPrimaryPoint.visible = false;
    scene.add(mPrimaryPoint);

    const mSecondaryPoint = mPrimaryPoint.clone();
    scene.add(mSecondaryPoint);

    function showPoint(isPrimary, worldPosition) {
        let point = isPrimary ? mPrimaryPoint : mSecondaryPoint;
        point.position.copy(worldPosition);
        point.visible = true;
    }

    function hidePoint(isPrimary) {
        let point = isPrimary ? mPrimaryPoint : mSecondaryPoint;
        point.visible = false;
    }

    this.showPoint = showPoint;
    this.hidePoint = hidePoint;
}
