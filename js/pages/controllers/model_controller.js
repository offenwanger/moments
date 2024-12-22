import { ModelUpdateCommands } from "../../constants.js";
import { Data } from "../../data.js";
import { IdUtil } from "../../utils/id_util.js";

export function ModelController(story = new Data.StoryModel()) {
    let mModel = story;
    let mModelIndex = story.getIndex();
    let mUpdateListeners = [];

    async function applyUpdates(updates) {
        for (let update of updates) {
            if (!update) { console.error('Invalid update, no data'); continue; }
            if (update.command == ModelUpdateCommands.DELETE) {
                mModel.delete(update.data.id);
                delete mModelIndex[update.data.id];
            } else if (update.command == ModelUpdateCommands.CREATE_OR_UPDATE) {
                if (!update.data.id || !IdUtil.getClass(update.data.id)) { console.error('Invalid update, invalid id: ' + update.data.id); continue; }

                let item = mModelIndex[update.data.id];
                if (!item) {
                    let dataClass = IdUtil.getClass(update.data.id);
                    if (!dataClass) console.error("Invalid id: " + update.data.id);
                    _create(dataClass, update.data);
                } else {
                    _update(update.data.id, update.data);
                }
            } else {
                console.error("Invalid update: " + JSON.stringify(update));
            }
        }

        for (let callback of mUpdateListeners) await callback(updates, mModel);
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

    function _update(id, attrs) {
        let item = mModelIndex[id];
        if (!item) { console.error("Invalid id: " + id); return; };
        for (let key of Object.keys(attrs)) {
            if (!Object.hasOwn(item, key)) { console.error("Invalid attr: " + id + " - " + key); return; }
            item[key] = attrs[key];
        }
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
        } else if (cls == Data.PhotosphereSurface) {
            return mModel.surfaces;
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
        getModel: () => mModel.clone(),
        addUpdateListener: (callback) => mUpdateListeners.push(callback),
        removeUpdateListener: (callback) => mUpdateListeners = mUpdateListeners.filter(c => c != callback),
    }
}

export function ModelUpdate(data, command = ModelUpdateCommands.CREATE_OR_UPDATE) {
    this.command = command;
    this.data = data;
    if (!this.data.id) {
        // we alert here but don't terminate execution.
        console.error('Invalid data, no id: ' + data);
    }
}