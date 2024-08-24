import { AssetTypes } from "../../constants.js";
import { Data } from "../../data.js";
import { GLTKUtil } from "../../utils/gltk_util.js";
import { IdUtil } from "../../utils/id_util.js";
import { Util } from '../../utils/utility.js';

export function ModelController(storyId, workspace) {
    let mModel;
    let mStoryId = storyId;
    let mWorkspace = workspace;

    async function init() {
        if (!mModel) {
            mModel = await mWorkspace.getStory(mStoryId);
            if (!mModel) throw Error("Invalid workspace!");
        }
    }

    async function createModel3D(assetId = null) {
        let newModel3D = new Data.Model3D();
        if (assetId) {
            let asset = mModel.find(assetId);
            if (!asset) { console.error('invalid asset id', assetId); return; }
            newModel3D.assetId = assetId;
            newModel3D.name = asset.name;
            let newPoses = mModel.assetPoses
                .filter(p => asset.poseIds.includes(p.id))
                .map(p => p.clone(true));
            mModel.assetPoses.push(...newPoses);
            newModel3D.poseIds = newPoses.map(p => p.id);
        }
        mModel.model3Ds.push(newModel3D);
        await mWorkspace.updateStory(mModel);
        return newModel3D.id;
    }

    async function createAnnotation() {
        let newAnnotation = new Data.Annotation();
        mModel.annotations.push(newAnnotation);
        await mWorkspace.updateStory(mModel);
        return newAnnotation.id;
    }

    async function setAttribute(id, attr, value) {
        let item = mModel.find(id);
        if (!item) { console.error('Invalid id', id); return; }
        item[attr] = value;
        await mWorkspace.updateStory(mModel);
    }

    async function createAsset(name, filename, type, asset = null) {
        let newAsset = new Data.Asset(type);
        newAsset.filename = filename;
        newAsset.name = name;
        newAsset.type = type;
        if (type == AssetTypes.MODEL) {
            let targets = GLTKUtil.getInteractionTargetsFromGTLKScene(asset.scene);

            if (Util.unique(targets.map(t => t.name)).length < targets.length) {
                console.error("Invalid asset, assets components must have unique names.");
                return null;
            }

            targets.forEach(child => {
                let pose = new Data.AssetComponentPose();
                pose.type = child.type;
                pose.name = child.name;
                pose.x = child.position.x;
                pose.y = child.position.y;
                pose.z = child.position.z;
                pose.orientation = child.quaternion.toArray();
                mModel.assetPoses.push(pose);
                newAsset.poseIds.push(pose.id);
            })
        }
        mModel.assets.push(newAsset);
        await mWorkspace.updateStory(mModel);
        return newAsset.id;
    }

    async function updatePosition(id, position) {
        let item = mModel.find(id);
        if (Object.hasOwn(item, 'x')) item.x = position.x;
        if (Object.hasOwn(item, 'y')) item.y = position.y;
        if (Object.hasOwn(item, 'z')) item.z = position.z;
        await mWorkspace.updateStory(mModel);
    }

    async function updatePositionsAndOrientations(items) {
        try {
            items.forEach(({ id, position, orientation }) => {
                if (IdUtil.getClass(id) == Data.AssetComponentPose) {
                    let pose = mModel.find(id);
                    if (!pose) { console.error('Invalid id!', id); return; }
                    pose.x = position.x;
                    pose.y = position.y;
                    pose.z = position.z;
                    pose.orientation = orientation.toArray();
                } else {
                    console.error("Not handled", id);
                }
            });
        } catch (e) { console.error(e); }
        await mWorkspace.updateStory(mModel);
    }

    async function deleteItem(id) {
        if (IdUtil.getClass(id) == Data.Asset) {
            let usingItems = mModel.model3Ds.filter(m => m.assetId == id);
            usingItems.forEach(item => mModel.delete(item.id));
        }
        mModel.delete(id);
        await mWorkspace.updateStory(mModel);
    }

    async function updateTimeline(line) {
        mModel.timeline = line;
        await mWorkspace.updateStory(mModel);
    }

    return {
        init,
        createModel3D,
        createAnnotation,
        setAttribute,
        createAsset,
        updatePosition,
        updatePositionsAndOrientations,
        deleteItem,
        updateTimeline,
        getModel: () => mModel.clone(),
    }
}