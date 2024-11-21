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
                        return false;
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

    getIndex(index = {}) {
        if (this.id) {
            index[this.id] = this;
        } else return index;

        for (let key of Object.keys(this)) {
            let item = this[key];
            if (item instanceof DataItem) {
                item.getIndex(index);
            } else if (Array.isArray(item)) {
                item.forEach(i => {
                    if (i instanceof DataItem) i.getIndex(index)
                });
            }
        }

        return index;
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
                    if (o == null) { console.error("Invalid array item for: " + key); return o; }
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
    // An array of the file names 
    // that have been loaded into this story
    assets = []
    // base pose information for loaded 3D models
    baseAssetPoses = []
    moments = []
}

class Asset extends DataItem {
    name = "Asset";
    type = null;
    filename = null;
    // the default poses for the model.
    poseIds = []
}

class AssetPose extends DataItem {
    name = "Pose";
    parentPoseId = null;
    x = 0; y = 0; z = 0;
    orientation = [0, 0, 0, 1]; // quaternion
    scale = 1;
}

class Moment extends DataItem {
    // 3D models in the scenes
    gltfs = []
    // 2D imagry in the scenes
    pictures = []
    // points of spatial audio
    audios = []
    teleports = []
    photosphere = null;
}

class Photosphere extends DataItem {
    enabled = true;
    scale = 1;
    // the id of the photosphere image asset
    imageAssetId = null;
    // the id of the photosphere color annotations asset
    annotationAssetId = null;
    // the id of the photosphere blur asset
    blurMaskAssetId = null;
    points = [];
}

class PhotospherePoint extends DataItem {
    u = 0;
    v = 0;
    dist = 1;
}

class Gltf extends DataItem {
    name = "3D Model"
    assetId = null;
    poseIds = [];
}

class Picture extends DataItem {
    name = "Picture"
    x = 0; y = 0; z = 0;
    scale = 0.3;
    assetId = null;
}
class Audio extends DataItem {
    assetId = null;
    volume = 1;
    x = 0; y = 0; z = 0;
}

class Teleport extends DataItem {
    x = 0; y = 0; z = 0;
    sceneId = null;
    sceneX = 0; sceneY = 0; sceneZ = 0;
    sceneOrientation = [0, 0, 0, 1];
}

export const Data = {
    StoryModel,
    Asset,
    AssetPose,
    Moment,
    Photosphere,
    PhotospherePoint,
    Gltf,
    Picture,
    Audio,
    Teleport,
}