import { IdUtil } from "./utils/id_util.js";

class DataItem {
    id = IdUtil.getUniqueId(this.constructor.name);

    find(childId) {
        if (childId == this.id) return this;
        for (let key of Object.keys(this)) {
            let item = this[key];
            if (!item) {
                continue;
            } else if (item instanceof DataItem) {
                let result = item.find(childId);
                if (result) return result;
            } else if (Array.isArray(item)) {
                for (let arrItem of item) {
                    if (arrItem instanceof DataItem) {
                        let result = arrItem.find(childId);
                        if (result) return result;
                    } else if (arrItem == null || arrItem == undefined) {
                        console.error('Invalid array item!');
                    } else {
                        // not an array of data items, skip it.
                        break;
                    }
                }
            } else {
                continue;
            }
        }
        // we iterated all the items and didn't find it.
        return null;
    }

    clone(newIds = false) {
        let c = new this.constructor();
        let id = newIds ? c.id : this.id;

        for (let key of Object.keys(this)) {
            if (!Object.hasOwn(c, key)) { console.error("Invalid property: " + this.id + " - " + key); continue; }
            let item = this[key];
            if (Array.isArray(item)) {
                c[key] = item.map(i => cloneItem(i, newIds));
            } else {
                c[key] = cloneItem(item, newIds);
            }
        }

        c.id = id;
        return c;
    }

    delete(id) {
        for (let key of Object.keys(this)) {
            if (!this[key]) {
                continue;
            } else if (typeof this[key] == 'string') {
                if (this[key] == id) this[key] = null;
            } else if (Array.isArray(this[key])) {
                this[key] = this[key].filter(item => {
                    if (typeof item == 'number') return true;
                    if (typeof item == 'string') return item != id;
                    if (!item) {
                        console.error('Removing invalid item: ' + this.id + " - " + key + " - " + item);
                    }
                    return !item instanceof DataItem || item.id != id;
                })
                for (let item of this[key]) {
                    if (item instanceof DataItem) {
                        item.delete(id);
                    } else {
                        break;
                    }
                }
            } else if (this[key] instanceof DataItem) {
                if (this[key].id == id) {
                    this[key] = null;
                } else {
                    this[key].delete(id);
                }
            } else {
                continue;
            }
        }
    }

    static fromObject(ob) {
        let c = new this();
        for (let key of Object.keys(ob)) {
            if (!Object.hasOwn(c, key)) { console.error("Invalid attribute on object:" + this.name + " - " + key); continue; }
            let item = ob[key];
            if (item == null) {
                continue;
            } else if (Array.isArray(item)) {
                c[key] = item.map(o => {
                    let obClass = o.id ? IdUtil.getClass(o.id) : false;
                    if (obClass) {
                        return obClass.fromObject(o);
                    } else {
                        return o;
                    }
                })
            } else {
                let itemClass = item.id ? IdUtil.getClass(item.id) : false;
                if (itemClass) {
                    c[key] = itemClass.fromObject(item)
                } else {
                    c[key] = item;
                }
            }
        }
        return c;
    }
}

function cloneItem(item, newIds) {
    if (item instanceof DataItem) {
        return item.clone(newIds);
    } else if (item == null || item == undefined) {
        return item;
    } else if (typeof item == 'object') {
        return Object.assign({}, item);
    } else if (typeof item == 'number') {
        return item;
    } else if (typeof item == 'string') {
        return item;
    } else if (typeof item == 'boolean') {
        return item;
    } else {
        console.error("Unhandled item type", item);
        return item;
    }
}

class StoryModel extends DataItem {
    name = "A Story in Moments"
    timeline = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -2 }];
    backgroundId = null; // Asset

    assets = []
    assetPoses = []
    model3Ds = []
    annotations = []
    annotationItems = []
}

class Asset extends DataItem {
    name = "Asset";
    type = null;
    filename = null;
    // the default poses for the model.
    poseIds = []
}

class AssetComponentPose extends DataItem {
    name = "Pose";
    type = null;
    x = 0;
    y = 0;
    z = 0;
    orientation = [0, 0, 0, 1]; // quaternion
    size = 1;
    type = null;
}

class Model3D extends DataItem {
    name = "Model"
    isWorld = false;
    assetId = null;
    poseIds = [];
}

class Annotation extends DataItem {
    name = "Annotation"
    y = 0;
    x = 0;
    z = 0;
    itemIds = [];
}

class AnnotationItem extends DataItem {
    x = 0;
    y = 0;
    width = 1;
    height = 1;
}

class AnnotationImage extends AnnotationItem {
    assetId = null;
}

class AnnotationText extends AnnotationItem {
    text = ""
    fontSize = 1;
    font = 'Default Font'
}

export const Data = {
    StoryModel,
    Asset,
    AssetComponentPose,
    Model3D,
    Annotation,
    AnnotationItem,
    AnnotationImage,
    AnnotationText,
}