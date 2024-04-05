export function PointerPanel(container) {
    let mAddCallback = async (parentId, itemClass, config) => { };
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mNavigationCallback = async (id) => { };
    let mScrollHeight = 0;
    // [ButtonWithEdit] fromItem 
    // <if from Moment or Story> [Position Input] x, y, z
    // <if from Annotation> [Offest Input] x, y
    // [ButtonWithEdit] toItem 
    // <if from Moment or Story> [Position Input] x, y, z
    // <if from Annotation> [Offest Input] x, y

    function show(asset) {

    }

    function hide() {

    }

    this.show = show;
    this.hide = hide;
    this.setAddCallback = (func) => mAddCallback = func;
    this.setUpdateAttributeCallback = (func) => mUpdateAttributeCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}