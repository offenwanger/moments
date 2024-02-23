import * as THREE from 'three';
import * as ThreeMeshUI from "three-mesh-ui";
import { Util } from '../utils/utility.js';
import { AssetUtil } from '../utils/assets_util.js';

const UP = new THREE.Vector3(0, 1, 0);
export function CaptionController(parent) {
    let mTextString = "text";
    let mOffset = { x: 1, y: 1 };
    let mRoot = new THREE.Vector3();

    const mBubble = new ThreeMeshUI.Block({
        width: 1.7,
        height: 1,
        padding: 0.2,

        fontFamily: './css/fonts/Roboto-msdf.json',
        fontTexture: './css/fonts/Roboto-msdf.png',
        backgroundSize: "contain",
    });
    parent.add(mBubble);

    const mTextNode = new ThreeMeshUI.Text({
        content: mTextString,
        fontColor: new THREE.Color('black'),
        fontSize: 0.1
    });
    mBubble.add(mTextNode);

    AssetUtil.loadTexture('speech_bubble.png').then(image => {
        mBubble.set({ backgroundTexture: image });
    });

    let mComputedBounding = false;
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)]);
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({ color: "black" });
    const curveObject = new THREE.Line(geometry, material);
    parent.add(curveObject)

    function update(momentPos, radius, cameraPos, tailEnd) {
        let normal = new THREE.Vector3().subVectors(momentPos, cameraPos).normalize();
        let position = Util.planeCoordsToWorldCoords(mOffset, normal, UP, momentPos);
        mBubble.position.copy(position);
        let rotationMatrix = new THREE.Matrix4().lookAt(cameraPos, momentPos, UP);
        let qt = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
        mBubble.quaternion.copy(qt);
        ThreeMeshUI.update();

        let linkPoint = Util.planeCoordsToWorldCoords(getLinkPoint(), normal, UP, momentPos);
        let surfacePoint = Util.getSphereIntersection(linkPoint, tailEnd, momentPos, radius);

        let internalSegment = new THREE.Vector3().subVectors(surfacePoint, tailEnd);
        let angleA = 2 * Math.asin((internalSegment.length() / 2) / radius);
        let angleB = (Math.PI - angleA) / 2;
        let midpointCount = Math.floor(16 * internalSegment.length() / (radius * 2));
        curve.points = new Array(midpointCount).fill("").map((v, index) => {
            let angle = angleA * (index + 1) / midpointCount;
            let angleC = Math.PI - angle - angleB;
            let portionLength = radius * Math.sin(angle) / Math.sin(angleC);
            let internalPoint = internalSegment.clone().multiplyScalar(portionLength / internalSegment.length()).add(tailEnd);
            let externalPoint = new THREE.Vector3().subVectors(internalPoint, momentPos).normalize().multiplyScalar(radius * 1.1).add(momentPos);
            return externalPoint;
        });
        curve.points.unshift(tailEnd);
        curve.points.push(linkPoint);

        curveObject.geometry.setFromPoints(curve.getPoints(50));
        if (!mComputedBounding) {
            mComputedBounding = true;
            curveObject.geometry.computeBoundingSphere();
        }
        curveObject.geometry.verticesNeedUpdate = true;
    }

    function setText(text) {
        mTextString = text;
        mTextNode.content = text;
        // TODO: Set the size
    }

    function getLinkPoint() {
        if (Math.abs(mOffset.x) > Math.abs(mOffset.y)) {
            // we are father to one side
            if (mOffset.x > 0) {
                return { x: mOffset.x - mBubble.width / 2, y: mOffset.y }
            } else {
                return { x: mOffset.x + mBubble.width / 2, y: mOffset.y }
            }
        } else {
            // we are farther to the top or bottom
            if (mOffset.y > 0) {
                return { x: mOffset.x, y: mOffset.y - mBubble.height / 2 }
            } else {
                return { x: mOffset.x, y: mOffset.y + mBubble.height / 2 }
            }
        }
    }

    this.update = update;
    this.setText = setText;
    this.getText = () => { return mTextString };
    this.setOffset = (offset) => { mOffset = offset };
    this.getOffset = () => { return mOffset; };
    this.setRoot = (root) => { mRoot = root };
    this.getRoot = () => { return mRoot; };
}