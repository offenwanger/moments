export function Model3DPanel(container) {
    let mAddCallback = async (parentId, itemClass, config) => { };
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mNavigationCallback = async (id) => { };
    let mScrollHeight = 0;
    
    // [Button] parent
    // [ButtonWithEdit] Asset Name
    // [Position Input] x, y, z
    // [Orientations input] Orientation
    // [Number Input] size

    function show(model3D) {

    }

    function hide() {

    }

    this.show = show;
    this.hide = hide;
    this.setAddCallback = (func) => mAddCallback = func;
    this.setUpdateAttributeCallback = (func) => mUpdateAttributeCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}