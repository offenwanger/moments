export function MomentPanel(container) {
    let mAddCallback = async (parentId, itemClass, config) => { };
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mNavigationCallback = async (id) => { };
    let mScrollHeight = 0;

    // [Button] Story
    // [Text Input] Name
    // [Toggle Input] Framed
    // [Toggle Input] Storyline
    // <is storyline> [Offset Input] x, y
    // <is storyline> [Number Input] t
    // <not storyline> [Position Input] x, y, z
    // [Orientations input] Orientation
    // [Number Input] size
    // <is framed> [Number Input] scale
    // [Button] 3D models [+]
    // [arr][Button] Models
    // [Button] Annotations [+]
    // <is framed> [Button] Annotation
    // <not framed> [Button] Annotations [+]
    // <not framed> [arr][Button] Annotations
    // [Button] Pointers [+]
    // [arr][Button] pointers pointing here


    function show(moment) {

    }

    function hide() {

    }

    this.show = show;
    this.hide = hide;
    this.setAddCallback = (func) => mAddCallback = func;
    this.setUpdateAttributeCallback = (func) => mUpdateAttributeCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}