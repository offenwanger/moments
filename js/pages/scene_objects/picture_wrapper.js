import * as THREE from 'three';
import { Data } from "../../data.js";
import { InteractionTargetInterface } from "./interaction_target_interface.js";
import { ToolButtons } from '../../constants.js';

export function PictureWrapper(parent) {
    let mParent = parent;
    let mPicture = new Data.Picture();
    let mInteractionTarget = createInteractionTarget();

    let mRatio = 1;

    const mGeometry = new THREE.PlaneGeometry(1, 1);
    const mFrontPlane = new THREE.Mesh(mGeometry,
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.FrontSide }));
    const mBackPlane = new THREE.Mesh(mGeometry,
        new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.BackSide }));

    const mTeleportMap = new THREE.TextureLoader().load('assets/images/teleportIcon.png');
    const mTeleportSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: mTeleportMap }));
    mTeleportSprite.position.x = 0.5;
    mTeleportSprite.position.y = 0.5;

    const mAudioMap = new THREE.TextureLoader().load('assets/images/audioIcon.png');
    const mAudioSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: mAudioMap }));
    mAudioSprite.position.x = -0.5;
    mAudioSprite.position.y = 0.5;

    const mPlanes = new THREE.Group();
    mPlanes.add(mFrontPlane, mBackPlane);
    mParent.add(mPlanes);

    async function update(picture, model, assetUtil) {
        let image = await assetUtil.loadImage(picture.assetId);
        if (!image || isNaN(image.height / image.width)) {
            console.error('Invalid image: ' + picture.assetId);
            mFrontPlane.material.map = null;
            mFrontPlane.material.needsUpdate = true;
            mRatio = 1;
            return;
        }
        let mRatio = image.height / image.width;
        mFrontPlane.material.map = new THREE.Texture(image);
        mFrontPlane.material.map.needsUpdate = true;
        mFrontPlane.material.needsUpdate = true;
        mPlanes.position.set(picture.x, picture.y, picture.z);
        mPlanes.setRotationFromQuaternion(new THREE.Quaternion().fromArray(picture.orientation));
        mPlanes.scale.set(picture.scale, picture.scale * mRatio, picture.scale)
        mTeleportSprite.scale.set(0.1 / picture.scale, 0.1 / (picture.scale * mRatio), 0.1 / picture.scale);
        mAudioSprite.scale.set(0.1 / picture.scale, 0.1 / (picture.scale * mRatio), 0.1 / picture.scale);
        mPlanes.userData.id = picture.id;

        let teleport = model.teleports.find(t => t.attachedId == picture.id);
        if (teleport) {
            mPlanes.add(mTeleportSprite);
            mInteractionTarget.isTeleport = () => true;
        } else {
            mPlanes.remove(mTeleportSprite);
            mInteractionTarget.isTeleport = () => false;
        }

        let audio = model.audios.find(a => a.attachedId == picture.id);
        if (audio) {
            mPlanes.add(mAudioSprite);
            mInteractionTarget.isAudio = () => true;
        } else {
            mPlanes.remove(mAudioSprite);
            mInteractionTarget.isAudio = () => false;
        }

        mPicture = picture;
    }

    function getId() {
        return mPicture.id;
    }

    function remove() {
        mParent.remove(mPlanes);
    }

    function getTargets(ray, toolMode) {
        if (toolMode.tool != ToolButtons.MOVE) return [];

        const intersect = ray.intersectObject(mPlanes);
        if (intersect.length > 0) {
            mInteractionTarget.getIntersection = () => { return intersect[0]; }
            return [mInteractionTarget];
        } else return [];
    }

    function createInteractionTarget() {
        let target = new InteractionTargetInterface();
        target.getLocalPosition = () => {
            let p = new THREE.Vector3();
            p.copy(mPlanes.position)
            return p;
        }
        target.getWorldPosition = () => {
            let worldPos = new THREE.Vector3();
            mPlanes.getWorldPosition(worldPos);
            return worldPos;
        }
        target.setWorldPosition = (worldPos) => {
            let localPosition = mPlanes.parent.worldToLocal(worldPos);
            mPlanes.position.copy(localPosition)
        }
        target.getLocalOrientation = () => {
            let q = new THREE.Quaternion();
            q.copy(mPlanes.quaternion);
            return q;
        }
        target.setLocalOrientation = (orientation) => {
            mPlanes.quaternion.copy(orientation)
        }
        target.getScale = () => {
            return mPlane.scale.x;
        }
        target.setScale = (scale) => {
            mPlanes.scale.set(scale, scale * mRatio, scale);
        }
        target.getParent = () => { return null; }
        target.getRoot = () => { return target; }
        target.getObject3D = () => { return mPlanes; }
        target.highlight = (toolMode) => {
            mFrontPlane.material.color.set(0x0000ff);
            mFrontPlane.material.needsUpdate = true;
            mBackPlane.material.color.set(0xaaaaff);
            mBackPlane.material.needsUpdate = true;
        };
        target.idle = (toolMode) => {
            mFrontPlane.material.color.set(0xffffff);
            mFrontPlane.material.needsUpdate = true;
            mBackPlane.material.color.set(0xaaaaaa);
            mBackPlane.material.needsUpdate = true;
        }
        target.getId = () => mPicture.id;
        return target;
    }

    this.getTargets = getTargets;
    this.update = update;
    this.getId = getId;
    this.remove = remove;
}