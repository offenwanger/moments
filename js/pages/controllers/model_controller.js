import { Data } from "../../data.js";
import { IdUtil } from "../../utils/id_util.js";

export function ModelController(story = new Data.StoryModel()) {
    let mModel = story;
    let mModelIndex = story.getIndex();
    let mUpdateCallbacks = [];

    async function applyUpdates(updates) {
        for (let update of updates) {
            if (!update) { console.error('Invalid update, no data'); continue; }
            if (update.action == 'delete') {
                mModel.delete(update.id);
                delete mModelIndex[update.id];
            } else if (update.action == 'createOrUpdate') {
                if (!update.row) { console.error('Invalid update, no row'); continue; }
                if (!update.row.id || !IdUtil.getClass(update.row.id)) { console.error('Invalid update, invalid id: ' + update.row.id); continue; }

                let item = mModelIndex[update.row.id];
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

    /**
     * A function to create a new instance of an object. 
     * @param {Class} dataClass The class to be created. 
     * @param {Object} attrs The attributes and their names. Can include an id. 
     * @returns The new id, either a generated one or the one provided in attrs.
     */
    async function create(dataClass, attrs = {}) {
        let id = _create(dataClass, attrs)
        for (let callback of mUpdateCallbacks) await callback([{ action: 'createOrUpdate', row: { ...attrs, id } }], mModel);
        return id;
    }

    /**
     * 
     * @param {[{dataClass: Class, attrs: Object}]]} items 
     * @returns An array of the ids, either generated or the ones provided in attrs.
     */
    async function createMany(items) {
        let ids = items.map(({ dataClass, attrs = {} }) => _create(dataClass, attrs))
        for (let callback of mUpdateCallbacks) await callback(items.map((item, index) => {
            return { action: 'createOrUpdate', row: { ...item.attrs, id: ids[index] } }
        }), mModel);
        return ids;
    }

    function _create(dataClass, attrs) {
        let item = new dataClass();
        for (let key of Object.keys(attrs)) {
            if (!Object.hasOwn(item, key)) { console.error("Invalid attr: " + key); continue; }
            item[key] = attrs[key];
        }
        getTable(dataClass).push(item);
        mModelIndex[item.id] = item;
        return item.id;
    }

    async function update(id, attrs) {
        _update(id, attrs);
        for (let callback of mUpdateCallbacks) await callback([{ action: 'createOrUpdate', row: { ...attrs, id } }], mModel);
    }

    async function updateMany(items) {
        for (let { id, attrs } of items) { _update(id, attrs); }
        for (let callback of mUpdateCallbacks) await callback(items.map(({ id, attrs }) => {
            return { action: 'createOrUpdate', row: { ...attrs, id } }
        }), mModel);
    }

    function _update(id, attrs) {
        let item = mModelIndex[id];
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

    function getTable(cls) {
        if (cls == Data.Asset) {
            return mModel.assets;
        } else if (cls == Data.AssetPose) {
            return mModel.assetPoses;
        } else if (cls == Data.Moment) {
            return mModel.moments;
        } else if (cls == Data.Photosphere) {
            return mModel.photospheres;
        } else if (cls == Data.PhotospherePoint) {
            return mModel.photospherePoints;
        } else if (cls == Data.PoseableAsset) {
            return mModel.poseableAssets;
        } else if (cls == Data.Picture) {
            return mModel.pictures;
        } else if (cls == Data.Audio) {
            return mModel.audios;
        } else if (cls == Data.Teleport) {
            return mModel.teleports;
        } else {
            console.error('No array for class: ' + cls);
            return [];
        }
    }

    return {
        applyUpdates,
        update,
        updateMany,
        delete: deleteOne,
        deleteMany,
        getModel: () => mModel.clone(),
        addUpdateCallback: (callback) => mUpdateCallbacks.push(callback),
        removeUpdateCallback: (callback) => mUpdateCallbacks = mUpdateCallbacks.filter(c => c != callback),
    }
}