import * as THREE from 'three';
import { Data } from "../../data.js";
import { SceneUtil } from '../../utils/scene_util.js';
import { AudioWrapper } from './audio_wrapper.js';
import { PhotosphereWrapper } from './photosphere_wrapper.js';
import { PictureWrapper } from "./picture_wrapper.js";
import { PoseableAssetWrapper } from "./poseable_asset_wrapper.js";
import { TeleportWrapper } from './teleport_wrapper.js';

export function MomentWrapper(parent, audioListener) {
    let mModel = new Data.StoryModel();

    let mStoryGroup = new THREE.Group();

    let mPhotosphereWrapper = new PhotosphereWrapper(mStoryGroup);
    let mPoseableAssetWrappers = [];
    let mPictureWrappers = [];
    let mAudioWrappers = [];
    let mTeleportWrappers = [];

    async function update(momentId, model, assetUtil) {
        mModel = model;

        if (!momentId) {
            parent.remove(mStoryGroup);
        } else {
            let moment = model.find(momentId);
            if (!moment) { console.error("Invalid moment!"); }

            parent.add(mStoryGroup);

            await mPhotosphereWrapper.update(moment.photosphereId, model, assetUtil);

            await SceneUtil.updateWrapperArray(mPoseableAssetWrappers,
                mModel.poseableAssets.filter(a => moment.poseableAssetIds.includes(a.id)),
                mModel,
                assetUtil,
                async (poseableAsset) => {
                    let newPoseableAssetWrapper = new PoseableAssetWrapper(mStoryGroup, audioListener);
                    return newPoseableAssetWrapper;
                });

            await SceneUtil.updateWrapperArray(mPictureWrappers,
                mModel.pictures.filter(p => moment.pictureIds.includes(p.id)),
                mModel,
                assetUtil,
                async (picture) => {
                    let newPictureWrapper = new PictureWrapper(mStoryGroup, audioListener);
                    return newPictureWrapper;
                });

            await SceneUtil.updateWrapperArray(mAudioWrappers,
                mModel.audios.filter(a => moment.audioIds.includes(a.id) && !a.attachedId),
                mModel,
                assetUtil,
                async (audio) => {
                    let newAudioWrapper = new AudioWrapper(mStoryGroup, audioListener);
                    return newAudioWrapper;
                });

            await SceneUtil.updateWrapperArray(mTeleportWrappers,
                mModel.teleports.filter(t => moment.teleportIds.includes(t.id) && !t.attachedId),
                mModel,
                assetUtil,
                async (teleport) => {
                    let newTeleportWrapper = new TeleportWrapper(mStoryGroup);
                    return newTeleportWrapper;
                });
        }
    }

    function render() {

    }

    function globalToLocalPosition(globalPosition) {
        return globalPosition;
    }

    function localToGlobalPosition(localPosition) {
        return localPosition;
    }

    function getTargets(ray, toolMode) {
        return [
            ...mPoseableAssetWrappers.map(w => w.getTargets(ray, toolMode)).flat(),
            ...mPictureWrappers.map(w => w.getTargets(ray, toolMode)).flat(),
            ...mTeleportWrappers.map(w => w.getTargets(ray, toolMode)).flat(),
            ...mAudioWrappers.map(w => w.getTargets(ray, toolMode)).flat(),
            ...mPhotosphereWrapper.getTargets(ray, toolMode),
        ]
    }

    this.update = update;
    this.render = render;
    this.getTargets = getTargets;
}