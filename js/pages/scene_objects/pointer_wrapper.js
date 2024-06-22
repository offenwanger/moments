import { Data } from "../../data_structs.js";

export function PointerWrapper(parent) {
    let mParent = parent;
    let mPointer = new Data.Pointer();

    console.error("Add Self to Scene")

    async function update(pointer, model, assetUtil) {
        mPointer = pointer;
    }

    function getId() {
        return mPointer.id;
    }

    function remove() {
        console.error("Remove Self from Scene")
    }

    function getIntersections(ray) {
        // probably check where in your plane we're pointed (or pointed through)
        return [];
    }

    this.update = update;
    this.getId = getId;
    this.remove = remove;
    this.getIntersections = getIntersections;
}