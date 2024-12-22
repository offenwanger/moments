import { IdUtil } from "./utils/id_util.js";

class DataItem {
    id = IdUtil.getUniqueId(this.constructor);

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

// Story model is the database, which stores the tables
// All other objects have arrays of pointers.
class StoryModel extends DataItem {
    name = "A Story in Moments"
    // An array of the file names 
    // that have been loaded into this story
    assets = [];
    // base pose information for loaded 3D models
    assetPoses = [];
    moments = [];
    photospheres = [];
    surfaces = []
    poseableAssets = [];
    pictures = [];
    audios = [];
    teleports = [];
}

class Asset extends DataItem {
    name = "Asset";
    type = null;
    filename = null;
    updated = Date.now();
    // the default poses for the model.
    poseIds = []
}

class AssetPose extends DataItem {
    name = "Pose";
    // indicates if this pose is relative, i.e. part of a chain,
    // or a root item
    isRoot = true;
    x = 0; y = 0; z = 0;
    orientation = [0, 0, 0, 1]; // quaternion
    scale = 1;
}

class Moment extends DataItem {
    name = "Moment"
    // 3D models in the scenes
    poseableAssetIds = []
    // 2D imagry in the scenes
    pictureIds = []
    // points of spatial audio
    audioIds = []
    teleportIds = []
    photosphereId = null;
}

class Photosphere extends DataItem {
    enabled = true;
    scale = 1;
    // the id of the original photosphere image asset
    imageAssetId = null;
    // the id of the photosphere blur asset, which is 
    // a mask specifying what of the image should be blurred
    colorAssetId = null;
    // the id of the photosphere color image asset, which is 
    // an image with the coloring that gets drawn on top of 
    // everything.
    blurAssetId = null;
    surfaceIds = []

    // We add this here as it's integral to the data structure. 
    // photosphere surface references these indices. Any changes
    // here will invalidate save models. 
    static get basePointUVs() {
        const segmentsDown = 16
        const segmentsAround = 32;

        let basePointUVs = [];
        for (let down = 0; down <= segmentsDown; ++down) {
            for (let across = 0; across <= segmentsAround; ++across) {
                let u = across / segmentsAround;
                let v = down / segmentsDown;
                basePointUVs.push(u, v);
            }
        }

        return basePointUVs;
    }
}

class PhotosphereSurface extends DataItem {
    // uv array of u,v. 
    points = []
    /**
     * array of basePoint indices. 
     * this relies on the assumption that all photospheres
     * will have the same number of base points.
     */
    basePointIndices = []
    normal = [0, 0, 1]
    dist = -1;

}

class PoseableAsset extends DataItem {
    name = "3D Model"
    assetId = null;
    poseIds = [];
}

class Picture extends DataItem {
    name = "Picture";
    x = 0; y = 0; z = 0;
    orientation = [0, 0, 0, 1];
    scale = 0.3;
    assetId = null;
}

class Audio extends DataItem {
    name = "Audio";
    assetId = null;
    x = 0; y = 0; z = 0;
    attachedId = null;
    volume = 1;
    ambient = false;
}

class Teleport extends DataItem {
    name = "Teleport";
    momentId = null;
    x = 0; y = 0; z = 0;
    attachedId = null;
    sceneX = 0;
    sceneY = 0;
    sceneZ = 0;
    sceneDirX = 0;
    sceneDirY = 0;
    sceneDirZ = -1;
}

export const Data = {
    StoryModel,
    Asset,
    AssetPose,
    Moment,
    Photosphere,
    PhotosphereSurface,
    PoseableAsset,
    Picture,
    Audio,
    Teleport,
}