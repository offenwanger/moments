import { Data } from "../../data.js";

export function AnnotationWrapper(parent) {
    let mParent = parent;
    let mAnnotation = new Data.Annotation();

    console.log("TODO: Add self to scene")

    async function update(annotation, model, assetUtil) {
        mAnnotation = annotation;
    }

    function getId() {
        return mAnnotation.id;
    }

    function remove() {
        console.log("TODO: remove self to scene")
    }

    function getTargets(ray) {
        // probably check where in your plane we're pointed (or pointed through)
        return [];
    }

    function setMode(mode) {

    }

    this.getTargets = getTargets;
    this.setMode = setMode;
    this.update = update;
    this.getId = getId;
    this.remove = remove;
}