import { Data } from "../../data_structs.js";

export function AnnotationScene(parent) {
    let mParent = parent;
    let mAnnotation = new Data.Annotation();

    console.log("Add Self to Scene")

    async function update(annotation,  model, assetUtil) {
        mAnnotation = annotation;
    }

    function getId() {
        return mAnnotation.id;
    }

    function remove() {
        console.log("Remove Self from Scene")
    }

    this.update = update;
    this.getId = getId;
    this.remove = remove;
}