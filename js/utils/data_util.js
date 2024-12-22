import { AssetTypes } from '../constants.js';
import { Data } from '../data.js';
import { ModelUpdate } from '../pages/controllers/model_controller.js';
import { GLTKUtil } from './gltk_util.js';
import { IdUtil } from './id_util.js';
import { Util } from './utility.js';

// This file contains helper functions for creating things
// which have to be created with many children. 

/**
 * Creates a set of updates to set up a new moment. 
 * @param {*} blurFileName filename to create specific asset for
 * @param {*} colorFileName filename to create specific asset for
 * @returns 
 */
async function getMomentCreationUpdates(model, blurFileName, colorFileName) {
    let updates = [];

    let blurUpdate = new ModelUpdate({
        id: IdUtil.getUniqueId(Data.Asset),
        name: blurFileName,
        filename: blurFileName,
        type: AssetTypes.PHOTOSPHERE_BLUR
    });
    let colorUpdate = new ModelUpdate({
        id: IdUtil.getUniqueId(Data.Asset),
        name: colorFileName,
        filename: colorFileName,
        type: AssetTypes.PHOTOSPHERE_COLOR
    });

    updates.push(blurUpdate, colorUpdate);

    let photosphereId = IdUtil.getUniqueId(Data.Photosphere);
    updates.push(new ModelUpdate({
        id: photosphereId,
        blurAssetId: blurUpdate.data.id,
        colorAssetId: colorUpdate.data.id,
    }))
    let momentId = IdUtil.getUniqueId(Data.Moment)
    let name = getNextName('Moment', model.moments.map(m => m.name))
    updates.push(new ModelUpdate({
        id: momentId,
        photosphereId,
        name
    }))

    return updates;
}

async function getPoseableAssetCreationUpdates(model, parentId, assetId = null) {
    let updates = [];

    let asset = model.find(assetId);
    if (!asset) { console.error('invalid asset id', assetId); return []; }

    let poses = model.assetPoses.filter(p => asset.poseIds.includes(p.id));
    let poseIds = poses.map(pose => {
        let attrs = pose.clone(true);
        attrs.id = IdUtil.getUniqueId(Data.AssetPose);
        updates.push(new ModelUpdate(attrs))
        return attrs.id;
    });

    let attrs = {
        id: IdUtil.getUniqueId(Data.PoseableAsset),
        assetId: assetId,
        name: asset.name,
        poseIds: poseIds,
    }

    updates.push(new ModelUpdate(attrs));

    let parent = model.find(parentId);
    parent.poseableAssetIds.push(attrs.id);
    updates.push(new ModelUpdate({ id: parentId, poseableAssetIds: parent.poseableAssetIds }));

    return updates;
}

async function getAssetCreationUpdates(id, name, filename, type, asset = null) {
    let updates = [];

    let poseIds = [];
    if (type == AssetTypes.MODEL) {
        let targets = GLTKUtil.getInteractionTargetsFromGTLKScene(asset.scene);

        if (Util.unique(targets.map(t => t.name)).length < targets.length) {
            console.error("Invalid asset, assets components must have unique names.");
            return null;
        }

        poseIds = targets.map(child => {
            let attrs = {
                id: IdUtil.getUniqueId(Data.AssetPose),
                name: child.name,
                isRoot: child.isRoot,
                x: child.position.x,
                y: child.position.y,
                z: child.position.z,
                orientation: child.quaternion.toArray(),
                scale: child.scale.x,
            };
            updates.push(new ModelUpdate(attrs));
            return attrs.id;
        });
    }

    updates.push(new ModelUpdate({
        id,
        name,
        filename,
        type,
        poseIds,
    }));

    return updates;
}

function getPictureCreationUpdates(model, parentId, assetId, position, orientation) {
    let parentMoment = model.moments.find(m => m.id == parentId);
    let id = IdUtil.getUniqueId(Data.Picture);
    parentMoment.pictureIds.push(id);
    let name = getNextName('Picture', model.pictures.map(m => m.name))
    return [
        new ModelUpdate({
            id,
            name,
            assetId,
            x: position.x, y: position.y, z: position.z,
            orientation: orientation.toArray(),
        }),
        new ModelUpdate({
            id: parentMoment.id,
            pictureIds: parentMoment.pictureIds,
        })
    ];
}

function getAudioCreationUpdates(model, parentId, assetId, position) {
    let parentMoment = model.moments.find(m => m.id == parentId);
    let name = getNextName('Audio', model.audios.map(m => m.name))

    let id = IdUtil.getUniqueId(Data.Audio);
    parentMoment.audioIds.push(id);

    return [
        new ModelUpdate({
            id,
            name,
            assetId,
            x: position.x, y: position.y, z: position.z,
        }),
        new ModelUpdate({
            id: parentMoment.id,
            audioIds: parentMoment.audioIds,
        }),
    ];
}

function getNextName(name, nameList) {
    let maxNumber = Math.max(0, ...nameList
        .filter(n => n.includes(name))
        .map(n => parseInt(n.split(name)[1]))
        .filter(n => !isNaN(n)));
    return name + (maxNumber + 1)
}

export const DataUtil = {
    getMomentCreationUpdates,
    getPoseableAssetCreationUpdates,
    getAssetCreationUpdates,
    getPictureCreationUpdates,
    getAudioCreationUpdates,
    getNextName,
}