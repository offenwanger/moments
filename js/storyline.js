
import * as THREE from 'three';
import { Moment } from "./moment.js";
import { Caption } from "./caption.js";
import { PathLine } from './pathline.js';

export function Storyline(parentScene) {
    const mMoments = [];

    const mGroup = new THREE.Group();
    parentScene.add(mGroup);

    const mPathLine = new PathLine(mGroup);

    let mEnvironmentBox = getDefaultEnvBox();

    function loadFromObject(obj) {
        mMoments.splice(0, mMoments.length);
        mGroup.remove(...mGroup.children);
        mPathLine.loadFromObject(obj);

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
            m.setLocalPosition(mPathLine.getPosition(momentData.t, momentData.offset).position)

            momentData.captions.forEach(captionData => {
                let caption = new Caption(mGroup);
                caption.setText(captionData.text);
                caption.setOffset(captionData.offset);
                caption.setRoot(new THREE.Vector3().fromArray(captionData.root));
                m.addCaption(caption);
            })
            mMoments.push(m);
        })
    }

    function getObject() {
        return JSON.stringify({})
    }

    function update(userT, offsetX) {
        let linePosition = mPathLine.getPosition(userT, { x: offsetX, y: 0 });
        let forward = new THREE.Vector3(0, 0, -1);
        let angle = linePosition.tangent.angleTo(forward);
        let axis = new THREE.Vector3().crossVectors(linePosition.tangent, forward).normalize();

        mGroup.position.copy(new THREE.Vector3());
        mGroup.position.sub(linePosition.position);
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
    this.getMoments = () => mMoments;
    this.getPathLine = () => mPathLine;
}