import * as THREE from 'three';
import { Data } from '../../data.js';
import { OtherUserWrapper } from '../scene_objects/other_user_wrapper.js';
import { MomentWrapper } from '../scene_objects/moment_wrapper.js';

export function SceneController() {
    let mScene = new THREE.Scene();
    let mContent = new THREE.Group();
    mScene.add(mContent);
    let mCurrentMomentId = null;
    let mMomentWrapper = new MomentWrapper(mContent);
    let mModel = new Data.StoryModel();
    let mAssetUtil = null;

    let mOtherUsers = [];

    mScene.add(new THREE.AmbientLight(0xffffff));
    mScene.add(new THREE.DirectionalLight(0xffffff, 0.9));

    let mEnvironmentBox;

    function userMove(globalPosition) {
        mMomentWrapper.userMove(globalPosition)
    }

    function updateOtherUser(id, head, handR, handL) {
        let otherUser = mOtherUsers.find(o => o.getId() == id);
        if (!otherUser) console.error("User not found!", id);
        otherUser.update(head, handR, handL);
    }

    function removeOtherUser(id) {
        let otherUser = mOtherUsers.find(o => o.getId() == id);
        mOtherUsers = mOtherUsers.filter(o => o.getId() != id);
        otherUser.remove();
    }

    function addOtherUser(id, head, handR, handL) {
        let otherUser = new OtherUserWrapper(mScene, id);
        otherUser.update(head, handR, handL);
        mOtherUsers.push(otherUser);
    }


    async function updateModel(model, assetUtil) {
        if (!mEnvironmentBox) {
            mEnvironmentBox = await assetUtil.loadDefaultEnvironmentCube();
            mScene.background = mEnvironmentBox;
        }
        mModel = model;
        mAssetUtil = assetUtil;

        if (!mCurrentMomentId || !mModel.find(mCurrentMomentId)) {
            mCurrentMomentId = null;
        }

        await mMomentWrapper.update(mCurrentMomentId, model, assetUtil);
    }

    async function setCurrentMoment(momentId) {
        mCurrentMomentId = momentId;
        if (mAssetUtil) await updateModel(mModel, mAssetUtil);
    }

    function getTargets(ray) {
        return [...mMomentWrapper.getTargets(ray)]
    }

    function toSceneCoordinates(v) {
        let local = new THREE.Vector3().copy(v);
        mContent.worldToLocal(local)
        return local;
    }

    function setScale(scale) {
        mContent.scale.set(scale, scale, scale);
    }

    this.updateModel = updateModel;
    this.setCurrentMoment = setCurrentMoment;
    this.getTargets = getTargets;
    this.userMove = userMove;
    this.toSceneCoordinates = toSceneCoordinates;
    this.setScale = setScale;
    this.updateOtherUser = updateOtherUser;
    this.removeOtherUser = removeOtherUser;
    this.addOtherUser = addOtherUser;
    this.getScene = () => mScene;
    this.getContent = () => mContent;
}