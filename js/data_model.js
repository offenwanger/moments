import { Data } from "./data_structs.js";
import { IdUtil } from "./utils/id_util.js";

export function DataModel() {
    let mStory = new Data.Story();

    function getMoment(id) {
        return mStory.moments.find(o => o.id == id);
    }

    function getMoments() {
        return [...mStory.moments];
    }

    function getModel3D(id) {
        return getModel3Ds().find(o => o.id == id);
    }

    function getModel3Ds() {
        let momentModel3Ds = mStory.moments.map(m => m.model3Ds).flat();
        return mStory.model3Ds.concat(momentModel3Ds);
    }

    function getAssetComponentPose(id) {
        return getAssetComponentPoses().find(o => o.id == id);
    }

    function getAssetComponentPoses() {
        return getModel3Ds().map(m => m.assetComponentPoses).flat();
    }

    function getModel3DParent(model3DId) {
        if (mStory.model3Ds.find(o => o.id == model3DId)) {
            return mStory;
        } else {
            return getMoments().find(m => m.model3Ds.find(o => o.id == model3DId));
        }
    }

    function getAnnotation(id) {
        return getAnnotations().find(o => o.id == id);
    }

    function getAnnotations() {
        return [
            ...mStory.annotations,
            ...getMoments().map(m => m.annotations).flat()
        ];
    }

    function getAnnotationItem(id) {
        return getAnnotationItems().find(o => o.id == id);
    }

    function getAnnotationItems() {
        return getAnnotations().map(o => o.items).flat();
    }

    function getAsset(id) {
        return getAssets().find(o => o.id == id);
    }

    function getAssets() {
        return mStory.assets;
    }

    function getItemsForAsset(id) {
        return [
            ...getAnnotationItems(),
            ...getModel3Ds()
        ].filter(item => item.assetId == id);
    }

    function getPointer(id) {
        return getPointers().find(o => o.id == id);
    }

    function getPointers() {
        return mStory.pointers;
    }

    function getPointersFor(itemId) {
        return getPointers().filter(p => p.fromId == itemId || p.toId == itemId);
    }

    function getById(id) {
        let itemClass = IdUtil.getClass(id);
        if (itemClass == Data.Story) {
            return mStory;
        } else if (itemClass == Data.Moment) {
            return getMoment(id);
        } else if (itemClass == Data.Model3D) {
            return getModel3D(id);
        } else if (itemClass == Data.Annotation) {
            return getAnnotation(id);
        } else if (itemClass == Data.AnnotationItem) {
            return getAnnotationItem(id)
        } else if (itemClass == Data.Pointer) {
            return getPointer(id);
        } else if (itemClass == Data.Asset) {
            return getAsset(id);
        } else {
            console.error('Invalid navigation!', id);
            return null;
        }

    }

    function clone() {
        let dataModel = new DataModel();
        dataModel.setStory(DataModel.cloneItem(mStory, true));
        return dataModel;
    }

    function toObject() {
        return {
            story: DataModel.cloneItem(mStory)
        }
    }

    this.setStory = (story) => mStory = story;
    this.getStory = () => mStory;
    this.getMoment = getMoment;
    this.getMoments = getMoments;
    this.getModel3D = getModel3D;
    this.getModel3Ds = getModel3Ds;
    this.getModel3DParent = getModel3DParent;
    this.getAssetComponentPose = getAssetComponentPose;
    this.getAssetComponentPoses = getAssetComponentPoses;
    this.getAnnotation = getAnnotation;
    this.getAnnotations = getAnnotations;
    this.getAnnotationItem = getAnnotationItem;
    this.getAnnotationItems = getAnnotationItems;
    this.getAsset = getAsset;
    this.getAssets = getAssets;
    this.getAssets = getAssets;
    this.getItemsForAsset = getItemsForAsset;
    this.getPointer = getPointer;
    this.getPointers = getPointers;
    this.getPointersFor = getPointersFor;
    this.getById = getById;
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
            if (item[key] != undefined && item[key] != null) {
                dataItem[key] = DataModel.cloneItem(item[key])
            }
        });
        return dataItem;
    } else {
        console.error("Invalid data item!", item);
    }
}


