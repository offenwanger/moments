import { AssetTypes } from '../constants.js';
import { Data } from '../data.js';
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
async function getMomentCreationUpdates(blurFileName, colorFileName) {
    let updates = [];

    let blurUpdate = (await getAssetCreationUpdates(blurFileName, blurFileName, AssetTypes.PHOTOSPHERE_BLUR))[0];
    let colorUpdate = (await getAssetCreationUpdates(colorFileName, colorFileName, AssetTypes.PHOTOSPHERE_COLOR))[0];

    updates.push(blurUpdate, colorUpdate);

    const segmentsDown = 16
    const segmentsAround = 32;

    let pointIds = []
    for (let down = 0; down <= segmentsDown; ++down) {
        for (let across = 0; across <= segmentsAround; ++across) {
            let attrs = {
                id: IdUtil.getUniqueId(Data.PhotospherePoint),
                u: across / segmentsAround,
                v: down / segmentsDown,
                dist: 1,
            }
            pointIds.push(attrs.id);
            updates.push({ action: 'createOrUpdate', row: attrs })
        }
    }
    let photosphereId = IdUtil.getUniqueId(Data.Photosphere);
    updates.push({
        action: 'createOrUpdate', row: {
            id: photosphereId,
            pointIds,
            blurAssetId: blurUpdate.row.id,
            colorAssetId: colorUpdate.row.id,
        }
    })
    let momentId = IdUtil.getUniqueId(Data.Moment)
    updates.push({
        action: 'createOrUpdate', row: {
            id: momentId,
            photosphereId,
        }
    })

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
        updates.push({ action: 'createOrUpdate', row: attrs })
        return attrs.id;
    });

    let attrs = {
        id: IdUtil.getUniqueId(Data.PoseableAsset),
        assetId: assetId,
        name: asset.name,
        poseIds: poseIds,
    }

    updates.push({ action: 'createOrUpdate', row: attrs });

    let parent = model.find(parentId);
    parent.poseableAssetIds.push(attrs.id);
    updates.push({ action: 'createOrUpdate', row: { id: parentId, poseableAssetIds: parent.poseableAssetIds } });

    return updates;
}

async function getAssetCreationUpdates(name, filename, type, asset = null) {
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
            updates.push({ action: 'createOrUpdate', row: attrs });
            return attrs.id;
        });
    }

    updates.push({
        action: 'createOrUpdate', row: {
            id: IdUtil.getUniqueId(Data.Asset),
            name,
            filename,
            type,
            poseIds,
        }
    })

    return updates;
}

export const DataUtil = {
    getMomentCreationUpdates,
    getPoseableAssetCreationUpdates,
    getAssetCreationUpdates,
}