import { AssetTypes } from "../../constants.js";
import { Data } from "../../data.js";
import { GLTKUtil } from "../../utils/gltk_util.js";
import { IdUtil } from "../../utils/id_util.js";
import { Util } from '../../utils/utility.js';

export function ModelController(story = new Data.StoryModel()) {
    let mModel = story;
    let mUpdateCallbacks = [];

    async function applyUpdates(updates) {
        for (let update of updates) {
            if (update.action == 'delete') {
                _delete(update.id);
            } else if (update.action == 'update') {
                let item = mModel.find(update.row.id);
                if (!item) {
                    let dataClass = IdUtil.getClass(update.row.id);
                    if (!dataClass) console.error("Invalid id: " + update.row.id);
                    _create(dataClass, update.row);
                } else {
                    _update(update.row.id, update.row);
                }
            } else {
                console.error("Invalid update: " + update);
            }
        }

        for (let callback of mUpdateCallbacks) await callback(updates, mModel);
    }

    async function create(dataClass, attrs = {}) {
        let id = _create(dataClass, attrs)
        for (let callback of mUpdateCallbacks) await callback([{ action: 'update', row: { ...attrs, id } }], mModel);
        return id;
    }

    async function createMany(items) {
        let ids = items.map(({ dataClass, attrs = {} }) => _create(dataClass, attrs))
        for (let callback of mUpdateCallbacks) await callback(items.map((item, index) => {
            return { action: 'update', row: { ...item.attrs, id: ids[index] } }
        }), mModel);
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

    async function update(id, attrs) {
        _update(id, attrs);
        for (let callback of mUpdateCallbacks) await callback([{ action: 'update', row: { ...attrs, id } }], mModel);
    }

    async function updateMany(items) {
        for (let { id, attrs } of items) { _update(id, attrs); }
        for (let callback of mUpdateCallbacks) await callback(items.map(({ id, attrs }) => {
            return { action: 'update', row: { ...attrs, id } }
        }), mModel);
    }

    function _update(id, attrs) {
        let item = mModel.find(id);
        if (!item) { console.error("Invalid id: " + id); return; };
        for (let key of Object.keys(attrs)) {
            if (!Object.hasOwn(item, key)) { console.error("Invalid attr: " + id + " - " + key); return; }
            item[key] = attrs[key];
        }
    }

    async function deleteOne(id) {
        mModel.delete(id)
        for (let callback of mUpdateCallbacks) await callback([{ action: "delete", id }], mModel);
    }

    async function deleteMany(ids) {
        for (let id of ids) mModel.delete(id);
        for (let callback of mUpdateCallbacks) await callback(ids.map(id => { return { action: "delete", id } }), mModel);
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
        let updates = [];

        if (assetId) {
            let asset = mModel.find(assetId);
            if (!asset) { console.error('invalid asset id', assetId); return; }
            let poses = mModel.assetPoses.filter(p => asset.poseIds.includes(p.id));
            let poseIds = poses.map(p => {
                let poseAttrs = p.clone(true);
                let poseId = _create(Data.AssetComponentPose, poseAttrs)
                updates.push({ action: 'update', row: { ...poseAttrs, id: poseId } })
                return poseId;
            });

            attrs.assetId = assetId;
            attrs.name = asset.name;
            attrs.poseIds = poseIds;
        }

        let modelId = _create(Data.Model3D, attrs);
        updates.push({ action: 'update', row: { ...attrs, id: modelId } })

        for (let callback of mUpdateCallbacks) await callback(updates, mModel.clone());
        return modelId;
    }

    async function createAsset(name, filename, type, asset = null) {
        let updates = [];

        let attrs = { name, filename, type }
        if (type == AssetTypes.MODEL) {
            let targets = GLTKUtil.getInteractionTargetsFromGTLKScene(asset.scene);

            if (Util.unique(targets.map(t => t.name)).length < targets.length) {
                console.error("Invalid asset, assets components must have unique names.");
                return null;
            }

            attrs.poseIds = targets.map(child => {
                let poseAttrs = {
                    type: child.type,
                    name: child.name,
                    x: child.position.x,
                    y: child.position.y,
                    z: child.position.z,
                    orientation: child.quaternion.toArray()
                };
                let poseId = _create(Data.AssetComponentPose, poseAttrs)
                updates.push({ action: 'update', row: { ...poseAttrs, id: poseId } });
                return poseId;
            });

        }

        let assetId = _create(Data.Asset, attrs);
        updates.push({ action: 'update', row: { ...attrs, id: assetId } })

        for (let callback of mUpdateCallbacks) await callback(updates, mModel.clone());
        return assetId;
    }

    return {
        applyUpdates,
        create,
        createMany,
        update,
        updateMany,
        delete: deleteOne,
        deleteMany,
        createModel3D,
        createAsset,
        getModel: () => mModel.clone(),
        addUpdateCallback: (callback) => mUpdateCallbacks.push(callback),
        removeUpdateCallback: (callback) => mUpdateCallbacks = mUpdateCallbacks.filter(c => c != callback),
    }
}