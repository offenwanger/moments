import { IdUtil } from "./utils/id_util.js";

function Story() {
    this.id = IdUtil.getUniqueId(Story);
    this.name = "A Story in Moments"

    this.timeline = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -2 }];
    this.model3Ds = [];
    this.annotations = [];
    this.assets = []
    this.background = null; // Asset
}

function Model3D() {
    this.id = IdUtil.getUniqueId(Model3D);
    this.name = "Model"
    // takes it's name from it's asset
    this.assetId = null;
    this.assetComponentPoses = [];
    this.isWorld = false;
}

function AssetComponentPose() {
    this.id = IdUtil.getUniqueId(AssetComponentPose);
    this.name = "";
    this.type = "";
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.orientation = [0, 0, 0, 1]; // quaternion
    this.size = 1;
    this.type = null;
}

function Annotation() {
    this.id = IdUtil.getUniqueId(Annotation);
    this.name = "Annotation"

    // defines the center of rotation
    this.y = 0;
    this.x = 0;
    this.z = 0;

    this.items = [];
}

function AnnotationItem() {
    this.id = IdUtil.getUniqueId(AnnotationItem);
    // takes it's name from it's asset (text in this case)
    this.assetId = null;
    // the items offset from the annotation center
    this.x = 0;
    this.y = 0;
    this.width = 1;
    // for image items
    this.height = 1;
    // for text items
    this.fontSize = 1;
    this.font = 'Default Font'
}

function Asset(type) {
    this.id = IdUtil.getUniqueId(Asset);
    this.type = type;
    this.name = null
    this.text = null;
    this.filename = null;
    this.bones = []
    this.meshes = []
    this.baseAssetComponentPoses = [];
}

export const Data = {
    Story,
    Model3D,
    Annotation,
    AnnotationItem,
    Asset,
    AssetComponentPose,
}