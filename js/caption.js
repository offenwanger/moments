import * as THREE from 'three';
import * as ThreeMeshUI from "three-mesh-ui";
import { Util } from './utility.js';

const UP = new THREE.Vector3(0, 1, 0);
export function Caption(parentScene) {
    let mTextString = "text";
    let mOffset = { x: 1, y: 1 };
    let mRoot = new THREE.Vector3();

    const mBubble = new ThreeMeshUI.Block({
        width: 1.7,
        height: 1,
        padding: 0.2,

        fontFamily: './assets/fonts/Roboto-msdf.json',
        fontTexture: './assets/fonts/Roboto-msdf.png',
        backgroundSize: "contain",
    });
    parentScene.add(mBubble);

    const mTextNode = new ThreeMeshUI.Text({
        content: mTextString,
        fontColor: new THREE.Color('black'),
        fontSize: 0.1
    });
    mBubble.add(mTextNode);

    const texttureLoader = new THREE.TextureLoader();
    texttureLoader.load('./assets/speech_bubble.png', (texture) => {
        mBubble.set({ backgroundTexture: texture });
    });

    const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(-10, 0, 0),
        new THREE.Vector3(-5, 15, 0),
        new THREE.Vector3(20, 15, 0),
        new THREE.Vector3(10, 0, 0)
    );
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: "black" });
    const curveObject = new THREE.Line(geometry, material);
    parentScene.add(curveObject)

    function update(momentPos, radius, cameraPos, tailEnd) {
        let normal = new THREE.Vector3().subVectors(cameraPos, momentPos).normalize();
        let position = Util.planeCoordsToWorldCoords(mOffset, normal, UP, momentPos);
        mBubble.position.copy(position);
        let rotationMatrix = new THREE.Matrix4().lookAt(cameraPos, momentPos, UP);
        let qt = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
        mBubble.quaternion.copy(qt);
        ThreeMeshUI.update();

        curve.v0 = position;
        curve.v1 = new THREE.Vector3().subVectors(tailEnd, momentPos).normalize().multiplyScalar(radius).add(position);
        curve.v2 = new THREE.Vector3().subVectors(tailEnd, momentPos).normalize().multiplyScalar(radius).add(tailEnd);
        curve.v3 = tailEnd;
        curveObject.geometry.setFromPoints(curve.getPoints(50));
        curveObject.geometry.verticesNeedUpdate = true;
    }

    function setText(text) {
        mTextString = text;
        mTextNode.content = text;
        // TODO: Set the size
    }

    this.update = update;
    this.setText = setText;
    this.getText = () => { return mTextString };
    this.setOffset = (offset) => { mOffset = offset };
    this.getOffset = () => { return mOffset; };
    this.setRoot = (root) => { mRoot = root };
    this.getRoot = () => { return mRoot; };
}