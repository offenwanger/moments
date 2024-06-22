import { AssetTypes } from "../../constants.js";
import { DataModel } from "../../data_model.js";
import { Data } from "../../data_structs.js";
import { IdUtil } from "../../utils/id_util.js";

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

    async function createMoment() {
        let newMoment = new Data.Moment();
        mModel.getStory().moments.push(newMoment);
        await mWorkspace.updateStory(mModel);
        return newMoment.id;
    }

    async function createModel3D(parentId, assetId = null) {
        let parent;
        if (IdUtil.getClass(parentId) == Data.Story) {
            parent = mModel.getStory();
        } else if (IdUtil.getClass(parentId) == Data.Moment) {
            parent = mModel.getMoment(parentId);
        } else { console.error("Parent id is not supported", parentId) }
        let newModel3D = new Data.Model3D();
        if (assetId) {
            let asset = mModel.getAsset(assetId);
            if (!asset) { console.error('invalid asset id', assetId); return; }
            newModel3D.assetId = assetId;
            newModel3D.name = asset.name;
            newModel3D.assetComponentPoses = asset.assetComponentPoses.map(
                (p) => DataModel.cloneItem(p, true));
        }
        parent.model3Ds.push(newModel3D);
        await mWorkspace.updateStory(mModel);
        return newModel3D.id;
    }

    async function createAnnotation(parentId) {
        let parent;
        if (IdUtil.getClass(parentId) == Data.Story) {
            parent = mModel.getStory();
        } else if (IdUtil.getClass(parentId) == Data.Moment) {
            parent = mModel.getMoment(parentId);
        } else { console.error("Parent id is not supported", parentId) }
        let newAnnotation = new Data.Annotation();
        parent.annotations.push(newAnnotation);
        await mWorkspace.updateStory(mModel);
        return newAnnotation.id;
    }

    async function setAttribute(id, attr, value) {
        let item = mModel.getById(id);
        if (!item) { console.error('Invalid id', id); return; }
        item[attr] = value;
        await mWorkspace.updateStory(mModel);
    }

    async function createAsset(name, filename, type, asset = null) {
        let newAsset = new Data.Asset(type);
        newAsset.filename = filename;
        newAsset.name = name;
        if (type == AssetTypes.MODEL) {
            asset.scene.traverse(child => {
                if (child.type == "Bone" || (child.type == "Mesh" && (!child.parent || child.parent.type != 'Bone'))) {
                    let pose = new Data.AssetComponentPose();
                    pose.type = child.type;
                    pose.name = child.name;
                    pose.x = child.position.x;
                    pose.y = child.position.y;
                    pose.z = child.position.z;
                    pose.orientation = child.quaternion.toArray();
                    newAsset.assetComponentPoses.push(pose);
                }
            })
        }
        mModel.getAssets().push(newAsset);
        await mWorkspace.updateStory(mModel);
        return newAsset.id;
    }

    async function updatePosition(id, position) {
        if (IdUtil.getClass(id) == Data.AssetComponentPose) {
            let pose = mModel.getAssetComponentPose(id);
            if (!pose) { console.error('Invalid id!', id); return; }
            pose.x = position.x;
            pose.y = position.y;
            pose.z = position.z;
        } else {
            console.error("Not handled", id);
        }
        await mWorkspace.updateStory(mModel);
    }

    return {
        init,
        createMoment,
        createModel3D,
        createAnnotation,
        setAttribute,
        createAsset,
        updatePosition,
        getModel: () => mModel.clone(),
    }
}