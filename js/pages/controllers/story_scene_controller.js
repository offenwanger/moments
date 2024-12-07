import * as THREE from 'three';
import { EditMode } from '../../constants.js';
import { Data } from '../../data.js';
import { StoryWrapper } from '../scene_objects/story_wrapper.js';
import { OtherUserWrapper } from '../scene_objects/other_user_wrapper.js';

export function StorySceneController() {
    let mScene = new THREE.Scene();
    let mContent = new THREE.Group();
    mScene.add(mContent);
    let mStoryWrapper = new StoryWrapper(mContent);
    let mModel = new Data.StoryModel();

    let mCamera = new THREE.PerspectiveCamera(75, window.innerWidth/ window.innerHeight, 0.1, 1000);
    let mListener = new THREE.AudioListener();
    mCamera.add(mListener);
    let mSound = new THREE.PositionalAudio( mListener );

    let mAudioLoader = new THREE.AudioLoader();
    mAudioLoader.load('js/pages/controllers/sounds/ogg-baby-shark-122769.ogg', function( buffer ) {
        console.log("BABY SHARK")
        mSound.setBuffer( buffer );
        mSound.setLoop( true );
        mSound.setVolume( 0.5 );
        mSound.setRefDistance(20);
        mSound.play();
    });

    let mSphere = new THREE.SphereGeometry(0.1, 32, 16);
    let mMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
    let mMesh = new THREE.Mesh( mSphere, mMaterial);
    console.log("Red Sphere")
    mScene.add(mMesh);
    mMesh.add(mSound);

    let mOtherUsers = [];

    let mEnvironmentBox;

    function userMove(globalPosition) {
        mStoryWrapper.userMove(globalPosition)
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
        let oldModel = mModel;
        mModel = model;

        let story = mModel;
        let oldStory = oldModel;

        if (story.background != oldStory.background || !mScene.background) {
            if (story.background) {
                mEnvironmentBox = await assetUtil.loadEnvironmentCube(story.background);
            } else {
                mEnvironmentBox = await assetUtil.loadDefaultEnvironmentCube();
            }
            mScene.background = mEnvironmentBox;
        }

        await mStoryWrapper.updateModel(model, assetUtil);
    }

    function getTargets(ray) {
        return [...mStoryWrapper.getTargets(ray)]
    }

    function toSceneCoordinates(v) {
        let local = new THREE.Vector3().copy(v);
        mContent.worldToLocal(local)
        return local;
    }

    function setMode(mode) {
        if (mode == EditMode.MODEL) {
            setScale(1);
        } else if (mode == EditMode.WORLD) {
            setScale(0.5);
        } else if (mode == EditMode.TIMELINE) {
            setScale(0.1);
        }

        mStoryWrapper.setMode(mode);
    }

    function setScale(scale) {
        mContent.scale.set(scale, scale, scale);
    }

    this.updateModel = updateModel;
    this.getTargets = getTargets;
    this.userMove = userMove;
    this.toSceneCoordinates = toSceneCoordinates;
    this.setMode = setMode;
    this.setScale = setScale;
    this.updateOtherUser = updateOtherUser;
    this.removeOtherUser = removeOtherUser;
    this.addOtherUser = addOtherUser;
    this.getScene = () => mScene;
    this.getContent = () => mContent;
}