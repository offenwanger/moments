import { AssetExtensions } from "./constants.js";
import { IdUtil } from "./utils/id_util.js";

export function Story() {
    this.id = IdUtil.getUniqueId(Story);
    this.name = "A Story in Moments"
    this.storyline = new Storyline();
    this.models = [];
    this.annotations = [];
    this.background = null;
}

export function Storyline() {
    this.id = IdUtil.getUniqueId(Storyline);
    this.path = [];
    this.moments = [];
    this.annotations = [];
}

export function Moment() {
    this.id = IdUtil.getUniqueId(Moment);
    this.x = 0;
    this.y = 0;
    this.z = 0; // serves as T for Storyline moments
    this.orientation = [0, 0, 0, 1]; // quaternion
    this.annotation = new Annotation();
    this.models = [];
    this.scale = 1;
    this.size = 1;
    this.framed = true;
}

export function Model() {
    this.id = IdUtil.getUniqueId(Model);
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.orientation = [0, 0, 0, 1]; // quaternion
    this.size = 1;
    this.assetId = null;
}

export function Annotation() {
    this.id = IdUtil.getUniqueId(Annotation);
    this.x = 0;
    this.y = 0;
    this.z = 0; // serves as T for Storyline annotations
    this.texts = []
    this.images = []
    this.pointers = []
}

export function AnnotationText() {
    this.id = IdUtil.getUniqueId(AnnotationText);
    this.x = 0;
    this.y = 0;
    this.height = 1;
    this.width = 1;
    this.assetId = null;
}

export function AnnotationImage() {
    this.id = IdUtil.getUniqueId(AnnotationImage);
    this.x = 0;
    this.y = 0;
    this.height = 1;
    this.width = 1;
    this.assetId = null;
}

export function AnnotationPointer() {
    this.id = IdUtil.getUniqueId(AnnotationPointer);
    this.x = 0;
    this.y = 0;
    // target coords in story scene or inside moment
    this.targetX = 0;
    this.targetY = 0;
    this.targetZ = 0;
}

export function Asset(type) {
    this.id = IdUtil.getUniqueId(Asset);
    this.type = type;
    this.text = null;
    this.filename = null;
}