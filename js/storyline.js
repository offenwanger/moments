
import * as THREE from 'three';
import * as C from './constants.js';
import { Moment } from "./moment.js";
import { Caption } from "./caption.js";
import { Util } from './utility.js';

export function Storyline(parentScene) {
    const mMoments = [];
    const mLinePoints = [];

    const mLine = new THREE.CatmullRomCurve3();
    let mLineLength = 1;
    let mLineWidth = 1;
    let mTimelineSurface = null;

    const mGroup = new THREE.Group();
    parentScene.add(mGroup);

    let mEnvironmentBox = getDefaultEnvBox();

    function loadFromObject(obj) {
        mMoments.splice(0, mMoments.length);
        mGroup.remove(...mGroup.children);

        mLinePoints.splice(0, mLinePoints.length, ...obj.line.map(p => new THREE.Vector3().fromArray(p)))
        mLine.points = mLinePoints;
        mLineLength = mLine.getLength();

        if (obj.envBox) {
            let cubeLoader = new THREE.CubeTextureLoader();
            mEnvironmentBox = cubeLoader.load(obj.envBox);
            parentScene.background = mEnvironmentBox;
        }

        obj.moments.forEach(momentData => {
            let m = new Moment(mGroup);
            m.setEnvBox(mEnvironmentBox);
            m.setT(momentData.t);
            m.setOffset(momentData.offset);
            m.setSize(momentData.size);
            m.setOrientation(new THREE.Quaternion().fromArray(momentData.orientation));
            m.setLocalPosition(Util.planeCoordsToWorldCoords(
                m.getOffset(),
                mLine.getTangentAt(m.getT()).multiplyScalar(-1),
                new THREE.Vector3(0, 1, 0),
                mLine.getPointAt(m.getT())))

            momentData.captions.forEach(captionData => {
                let caption = new Caption(mGroup);
                caption.setText(captionData.text);
                caption.setOffset(captionData.offset);
                caption.setRoot(new THREE.Vector3().fromArray(captionData.root));
                m.addCaption(caption);
            })
            mMoments.push(m);

            mLineWidth = Math.max(mLineWidth, Math.abs(momentData.offset.x) + momentData.size);
        })

        mTimelineSurface = new THREE.Mesh(new THREE.ExtrudeGeometry(
            new THREE.Shape([new THREE.Vector2(-mLineWidth, 0), new THREE.Vector2(mLineWidth, 0)]), {
            steps: 100,
            bevelEnabled: false,
            extrudePath: mLine
        }));
        mTimelineSurface.layers.set(C.CAST_ONLY_LAYER)
        mGroup.add(mTimelineSurface);
    }

    function getObject() {
        return JSON.stringify({})
    }

    function update(userT, offsetX) {
        let position = mLine.getPointAt(userT);
        let tangent = mLine.getTangentAt(userT);
        let forward = new THREE.Vector3(0, 0, -1);
        let angle = tangent.angleTo(forward);
        let axis = new THREE.Vector3().crossVectors(tangent, forward).normalize();

        mGroup.position.copy(new THREE.Vector3());
        mGroup.position.sub(position).sub(new THREE.Vector3(offsetX, 0, 0))
        mGroup.position.applyAxisAngle(axis, angle); // rotate the POSITION

        // mGroup.quaternion.copy(rotation)
        mGroup.rotation.copy(new THREE.Euler());
        mGroup.rotateOnAxis(axis, angle); // rotate the OBJECT
    }

    function sortMoments(userOffset) {
        // sort the moments by their distance to the user. 
        // from the time point the user is standing on. Only changes when the user moves
        // then we can just check the moments whose userDist places them in
        // the walking area
        mMoments.forEach(moment => {
            moment.userDist = userOffset.distanceTo(moment.getWorldPosition());
        })
        mMoments.sort((a, b) => a.userDist - b.userDist)
    }

    function worldToLocalPosition(worldPosition) {
        return mGroup.worldToLocal(worldPosition);
    }

    function localToWorldRotation(localRotation) {
        return localRotation.clone().applyQuaternion(mGroup.quaternion);
    }

    function getDefaultEnvBox() {
        let cubeLoader = new THREE.CubeTextureLoader();
        cubeLoader.setPath('assets/envbox/');
        return cubeLoader.load([
            'px.jpg', 'nx.jpg',
            'py.jpg', 'ny.jpg',
            'pz.jpg', 'nz.jpg'
        ]);
    }

    this.loadFromObject = loadFromObject;
    this.getObject = getObject;
    this.update = update;
    this.sortMoments = sortMoments;
    this.worldToLocalPosition = worldToLocalPosition;
    this.localToWorldRotation = localToWorldRotation;
    this.getLength = () => mLineLength;
    this.getLineWidth = () => mLineWidth;
    this.getMoments = () => mMoments;
    this.getLineSurface = () => mTimelineSurface;
    this.getLinePoints = () => mLinePoints;
}