import * as Data from "./data_structs.js";
import { IdUtil } from "./utils/id_util.js";

export function DataModel() {
    let mStory = new Data.Story();
    let mAssets = []

    function getItemsForAsset(assetId) {
        return [].concat(
            mStory.models,
            mStory.annotations.map(a => a.texts).flat().filter(text => text.assetId == assetId),
            mStory.annotations.map(a => a.images).flat(),
            mStory.storyline.moments.map(m => m.annotation.texts).flat(),
            mStory.storyline.moments.map(m => m.annotation.images).flat(),
            mStory.storyline.moments.map(m => m.models).flat(),
        ).filter(item => item.assetId == assetId);
    }

    function clone() {
        let dataModel = new DataModel();
        dataModel.setStory(DataModel.cloneItem(mStory, true));
        mAssets.forEach(asset => {
            let assetItems = dataModel.getItemsForAsset(asset.id);
            let newAsset = DataModel.cloneItem(asset, true);
            assetItems.assetId = newAsset.id;
            dataModel.getAssets().push(newAsset);
        })
        return dataModel;
    }

    function toObject() {
        return {
            story: DataModel.cloneItem(mStory),
            assets: DataModel.cloneItem(mAssets)
        }
    }

    this.setStory = (story) => mStory = story;
    this.getStory = () => mStory;
    this.getAssets = () => mAssets;
    this.getItemsForAsset = getItemsForAsset;
    this.clone = clone;
    this.toObject = toObject;
}

DataModel.fromObject = function (item) {
    let dataModel = new DataModel();

    if (!item.story) {
        console.error("Invalid data model object!", item);
        return null;
    }

    dataModel.setStory(DataModel.cloneItem(item.story));
    return dataModel;
}

DataModel.cloneItem = function (item, newIds = false) {
    if (Array.isArray(item)) {
        return item.map(o => DataModel.cloneItem(o));
    } else if (typeof item == 'string' || typeof item == 'number' || typeof item == 'boolean') {
        return item;
    } else if (item.id) {
        let ObjClass = IdUtil.getClass(item.id);
        if (!ObjClass) { console.error("Invalid data item!", item); return null; }

        let dataItem = new ObjClass();
        Object.keys(dataItem).forEach(key => {
            if (newIds && key == 'id') return;

            if (item[key]) {
                dataItem[key] = DataModel.cloneItem(item[key])
            }
        });
        return dataItem;
    } else {
        console.error("Invalid data item!", item);
    }
}


