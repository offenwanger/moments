export function PictureEditorController(parentContainer) {
    let mSaveCallback = async () => { }

    let mPictureId = null;

    let mIFrame = parentContainer.append('iframe')
        .attr('id', 'picture-editor-iframe')
        .attr('src', 'lib/fabricjs-image-editor-origin/index.html')
        .style('display', 'none')
        .style('position', 'absolute')
        .style('top', '0')
        .style('left', '0')
        .style('z-index', '1000')

    async function show(id, json) {
        mPictureId = id;
        mIFrame.style('display', '')
        mIFrame.node().contentWindow.setPictureEditorJson(json);
    }

    async function hide() {
        mIFrame.style('display', 'none')
        let event = new CustomEvent('set-picture', { json: {} })
        await mIFrame.node().contentDocument.dispatchEvent(event);
    }

    function resize(width, height) {
        mIFrame.attr('width', width);
        mIFrame.attr('height', height);
    }

    window.savePicture = async (json, dataUrl) => {
        await mSaveCallback(mPictureId, json, dataUrl);
    };

    this.show = show;
    this.hide = hide;
    this.resize = resize;
    this.onSave = (func) => mSaveCallback = func;
}