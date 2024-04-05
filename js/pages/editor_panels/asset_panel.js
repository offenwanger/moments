export function AssetPanel(container) {
    let mAddCallback = async (parentId, itemClass, config) => { };
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mNavigationCallback = async (id) => { };

    let mScrollHeight = 0;

    // [Text Input] name
    // <if type text> [Text Input] text
    // <if type image or model> File selection
    // [Title] Used by
    // [arr][Button] AnnotationItem, Model3D

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