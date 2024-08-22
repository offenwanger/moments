import { AssetTypes } from "../../constants.js";
import { Data } from "../../data.js";
import { GLTKUtil } from "../../utils/gltk_util.js";
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

    async function createModel3D(parentId, assetId = null) {
        let newModel3D = new Data.Model3D();
        if (assetId) {
            let asset = mModel.find(assetId);
            if (!asset) { console.error('invalid asset id', assetId); return; }
            newModel3D.assetId = assetId;
            newModel3D.name = asset.name;
            newModel3D.assetComponentPoses = mModel.assetPoses
                .filter(p => asset.poseIds.includes(p.id))
                .map(p => p.clone(true));
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
            let targets = GLTKUtil.getInteractionTargetsFromGTLKScene(asset.scene);
            targets.forEach(child => {
                let pose = new Data.AssetComponentPose();
                pose.type = child.type;
                pose.name = child.name;
                pose.x = child.position.x;
                pose.y = child.position.y;
                pose.z = child.position.z;
                pose.orientation = child.quaternion.toArray();
                newAsset.components.push(pose);
            })
        }
        mModel.assets.push(newAsset);
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

    async function updatePositionsAndOrientations(items) {
        try {
            items.forEach(({ id, position, orientation }) => {
                if (IdUtil.getClass(id) == Data.AssetComponentPose) {
                    let pose = mModel.getAssetComponentPose(id);
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
        let type = IdUtil.getClass(id);
        if (type == Data.Asset) {
            let story = mModel;
            story.assets = story.assets.filter(o => o.id != id);
            let usingItems = mModel.getItemsForAsset(id);
            usingItems.forEach(item => deleteItem(item.id))
        } else {
            console.error("Delete not implimented!")
        }
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