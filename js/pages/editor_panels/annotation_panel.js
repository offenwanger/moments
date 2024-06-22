export function AnnotationPanel(container) {
    let mAddCallback = async (parentId, itemClass, config) => { };
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mDeleteCallback = async (id) => { };
    let mNavigationCallback = async (id) => { };
    let mScrollHeight = 0;

    // [Button] parent
    // [Name] name
    // [Position Input] x, y, z
    // [arr][Button] items
    // [Button] Pointers [+]
    // [arr][Button] pointers pointing here

    function show(annotation) {

    }

    function hide() {

    }

    this.show = show;
    this.hide = hide;
    this.setAddCallback = (func) => mAddCallback = func;
    this.setUpdateAttributeCallback = (func) => mUpdateAttributeCallback = func;
    this.setDeleteCallback = (func) => mDeleteCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}