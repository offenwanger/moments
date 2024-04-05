export function AnnotationItemPanel(container) {
    let mAddCallback = async (parentId, itemClass, config) => { };
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mNavigationCallback = async (id) => { };
    let mScrollHeight = 0;

    // [Button] parent
    // [ButtonWithEdit] AssetName -> Click to open asset
    // [Offest Input] x, y
    // [Number Input] width
    // <if img> [Number Input] height
    // <if text> [Number Input] fontSize
    // <if text> [Number Input] font

    function show(annotationItem) {

    }

    function hide() {

    }

    this.show = show;
    this.hide = hide;
    this.setAddCallback = (func) => mAddCallback = func;
    this.setUpdateAttributeCallback = (func) => mUpdateAttributeCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}