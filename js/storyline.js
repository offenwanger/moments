
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
            m.setLocalPosition(mPathLine.getData(momentData.t, momentData.offset).position)

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

    function update(t, offsetX) {
        let lineData = mPathLine.getData(t, { x: offsetX, y: 0 });
        let upRotation = new THREE.Quaternion().setFromUnitVectors(lineData.normal, new THREE.Vector3(0, 1, 0))
        let currentForward = lineData.tangent.clone().applyQuaternion(upRotation);
        let forwardRotation = new THREE.Quaternion().setFromUnitVectors(currentForward, new THREE.Vector3(0, 0, -1))



        mGroup.position.copy(new THREE.Vector3());
        mGroup.position.sub(lineData.position);
        mGroup.position.applyQuaternion(upRotation).applyQuaternion(forwardRotation); // rotate the POSITION

        // mGroup.quaternion.copy(rotation)
        mGroup.rotation.copy(new THREE.Euler());
        mGroup.applyQuaternion(upRotation).applyQuaternion(forwardRotation); // rotate the OBJECT
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

    function localToWorldPosition(localPosition) {
        return mGroup.localToWorld(localPosition);
    }

    function localToWorldRotation(localRotation) {
        return localRotation.clone().applyQuaternion(mGroup.quaternion);
    }

    function worldToLocalRotation(worldRotation) {
        return worldRotation.clone().applyQuaternion(mGroup.quaternion.clone().invert());
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
    this.localToWorldPosition = localToWorldPosition;
    this.localToWorldRotation = localToWorldRotation;
    this.worldToLocalRotation = worldToLocalRotation;
    this.getMoments = () => mMoments;
    this.getPathLine = () => mPathLine;
}