import { IdUtil } from "./utils/id_util.js";

function Story() {
    this.id = IdUtil.getUniqueId(Story);
    this.name = "A Story in Moments"

    this.path = [];
    this.moments = [];
    this.model3Ds = [];
    this.annotations = [];
    this.pointers = []
    this.assets = []
    // Asset
    this.background = null;
}

function Moment() {
    this.id = IdUtil.getUniqueId(Moment);
    this.name = "Moment"
    this.storyline = true;
    this.framed = true;

    this.x = 0;
    this.y = 0;
    this.t = 0;
    this.z = 0;

    this.orientation = [0, 0, 0, 1]; // quaternion
    this.scale = 1;
    this.size = 1;

    this.model3Ds = [];
    // framed moments just have the one annotation
    this.annotations = [];
}

function Model3D() {
    this.id = IdUtil.getUniqueId(Model3D);
    this.name = "Model"
    // takes it's name from it's asset
    this.assetId = null;
    this.assetComponentPoses = [];
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

function Pointer() {
    this.id = IdUtil.getUniqueId(Pointer);
    // Name is taken from it's targets.   
    this.fromId = null;
    this.fromX = 0;
    this.fromY = 0;
    this.fromZ = 0;
    this.toId = null;
    this.toX = 0;
    this.toY = 0;
    this.toZ = 0;
    // note: this might need an asset at some point for the line.
}

export const Data = {
    Story,
    Moment,
    Model3D,
    Annotation,
    AnnotationItem,
    Pointer,
    Asset,
    AssetComponentPose,
}