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

    async function create(dataClass, attrs = {}) {
        let id = _create(dataClass, attrs)
        await mWorkspace.updateStory(mModel);
        return id;
    }

    async function createMany(items) {
        let ids = items.map(({ dataClass, attrs = {} }) => _create(dataClass, attrs))
        await mWorkspace.updateStory(mModel);
        return ids;
    }

    function _create(dataClass, attrs) {
        let item = new dataClass();
        for (let key of Object.keys(attrs)) {
            if (!Object.hasOwn(item, key)) { console.error("Invalid attr: " + key); continue; }
            item[key] = attrs[key];
        }
        getTableForClass(dataClass).push(item);
        return item.id;
    }

    async function update(id, attr, value) {
        _update(id, attr, value);
        await mWorkspace.updateStory(mModel);
    }

    async function updateMany(items) {
        for (let { id, attr, value } of items) { _update(id, attr, value); }
        await mWorkspace.updateStory(mModel);
    }

    function _update(id, attr, value) {
        let item = mModel.find(id);
        if (!item) { console.error("Invalid id: " + id); return; };
        if (!Object.hasOwn(item, attr)) { console.error("Invalid attr: " + id + " - " + attr); return; }
        item[attr] = value;
    }

    async function deleteOne(id) {
        mModel.delete(id)
        await mWorkspace.updateStory(mModel);
    }

    async function deleteMany(ids) {
        for (let id of ids) mModel.delete(id);
        await mWorkspace.updateStory(mModel);
    }

    function getTableForClass(cls) {
        if (cls == Data.Asset) {
            return mModel.assets;
        } else if (cls == Data.AssetComponentPose) {
            return mModel.assetPoses;
        } else if (cls == Data.Model3D) {
            return mModel.model3Ds;
        } else if (cls == Data.Annotation) {
            return mModel.annotations;
        } else {
            console.error('No array for class: ' + cls);
        }
    }

    async function createModel3D(assetId = null) {
        let attrs = {};

        if (assetId) {
            let asset = mModel.find(assetId);
            if (!asset) { console.error('invalid asset id', assetId); return; }
            let poses = mModel.assetPoses.filter(p => asset.poseIds.includes(p.id));
            let poseIds = poses.map(p => _create(Data.AssetComponentPose, p.clone(true)));

            attrs.assetId = assetId;
            attrs.name = asset.name;
            attrs.poseIds = poseIds;
        }

        let modelId = _create(Data.Model3D, attrs);
        await mWorkspace.updateStory(mModel);
        return modelId;
    }

    async function createAsset(name, filename, type, asset = null) {
        let attrs = { name, filename, type }
        if (type == AssetTypes.MODEL) {
            let targets = GLTKUtil.getInteractionTargetsFromGTLKScene(asset.scene);

            if (Util.unique(targets.map(t => t.name)).length < targets.length) {
                console.error("Invalid asset, assets components must have unique names.");
                return null;
            }

            attrs.poseIds = targets.map(child => _create(Data.AssetComponentPose, {
                type: child.type,
                name: child.name,
                x: child.position.x,
                y: child.position.y,
                z: child.position.z,
                orientation: child.quaternion.toArray()
            }));
        }

        let assetId = _create(Data.Asset, attrs);
        await mWorkspace.updateStory(mModel);
        return assetId;
    }

    return {
        init,
        create,
        createMany,
        update,
        updateMany,
        delete: deleteOne,
        deleteMany,
        createModel3D,
        createAsset,
        getModel: () => mModel.clone(),
    }
}