
import * as THREE from 'three';
import { MomentController } from "./moment_controller.js";
import { CaptionController } from "./caption_controller.js";
import { PathLineController } from './pathline_controller.js';
import { DataModel } from '../data_model.js';

export function StorylineController(parent) {
    let mModel = new DataModel();

    const mMomentContollers = [];

    const mGroup = new THREE.Group();
    parent.add(mGroup);

    const mPathLineController = new PathLineController(mGroup);

    async function updateModel(dataModel) {
        if (!dataModel) { console.error("Invalid model"); return; }
        mModel = dataModel;

        mMomentContollers.splice(0, mMomentContollers.length);
        mGroup.remove(...mGroup.children);

        let storyline = mModel.getStory().storyline;
        mPathLineController.updatePath(storyline.path);

        storyline.moments.forEach(momentData => {
            let pathLineData = mPathLineController.getData(momentData.t, momentData.offset);
            let m = new MomentController(mGroup);
            m.setEnvBox(mEnvironmentBox);
            m.setT(momentData.z);
            m.setOffset({ x: momentData.x, y: momentData.y });
            m.setSize(momentData.size);
            m.setOrientation(new THREE.Quaternion()
                .fromArray(momentData.orientation)
                .multiply(pathLineData.rotation.clone().invert()));
            m.setPosition(pathLineData.position);


            m.setModel(momentData.model);
            m.setImage(momentData.image);

            momentData.captions.forEach(captionData => {
                let caption = new Caption(mGroup);
                caption.setText(captionData.text);
                caption.setOffset(captionData.offset);
                caption.setRoot(new THREE.Vector3().fromArray(captionData.root));
                m.addCaption(caption);
            })
            mMomentContollers.push(m);
        })
    }

    function update(t, offsetX) {
        let lineData = mPathLineController.getData(t, { x: offsetX, y: 0 });

        mGroup.position.copy(new THREE.Vector3());
        mGroup.position.sub(lineData.position);
        mGroup.position.applyQuaternion(lineData.rotation); // rotate the POSITION

        // mGroup.quaternion.copy(rotation)
        mGroup.rotation.copy(new THREE.Euler());
        mGroup.applyQuaternion(lineData.rotation); // rotate the OBJECT
    }

    function sortMoments(userOffset) {
        // sort the moments by their distance to the user. 
        // from the time point the user is standing on. Only changes when the user moves
        // then we can just check the moments whose userDist places them in
        // the walking area.
        let sortArray = mMomentContollers.map(m => { return { dist: userOffset.distanceTo(m.getPosition()), m } });
        sortArray.sort((a, b) => a.dist - b.dist);
        mMomentContollers.splice(0, mMomentContollers.length, ...sortArray.map(i => i.m));
    }

    function worldToLocalPosition(worldPosition) {
        return mGroup.worldToLocal(worldPosition.clone());
    }

    function localToWorldPosition(localPosition) {
        return mGroup.localToWorld(localPosition.clone());
    }

    function localToWorldRotation(localRotation) {
        return localRotation.clone().applyQuaternion(mGroup.quaternion);
    }

    function worldToLocalRotation(worldRotation) {
        return worldRotation.clone().applyQuaternion(mGroup.quaternion.clone().invert());
    }

    this.updateModel = updateModel;
    this.update = update;
    this.sortMoments = sortMoments;
    this.worldToLocalPosition = worldToLocalPosition;
    this.localToWorldPosition = localToWorldPosition;
    this.localToWorldRotation = localToWorldRotation;
    this.worldToLocalRotation = worldToLocalRotation;
    this.getMoments = () => mMomentContollers;
    this.getPathLine = () => mPathLineController;
}