export function PictureEditorController(parentContainer) {
    // TODO: Replace with this: https://github.com/img-js/mini-canvas-editor/tree/main
    let mSaveCallback = async () => { }

    let mPictureId = null;

    let mIFrame = document.createElement('iframe');
    mIFrame.setAttribute('id', 'picture-editor-iframe')
    mIFrame.setAttribute('src', 'lib/fabricjs-image-editor-origin/index.html')
    mIFrame.style['display'] = 'none';
    mIFrame.style['position'] = 'absolute';
    mIFrame.style['top'] = '0';
    mIFrame.style['left'] = '0';
    mIFrame.style['z-index'] = '1000';
    parentContainer.appendChild(mIFrame);

    async function show(id, json) {
        mPictureId = id;
        mIFrame.style['display'] = ''
        mIFrame.contentWindow.setPictureEditorJson(json);
    }

    async function hide() {
        mIFrame.style['display'] = 'none';
        let event = new CustomEvent('set-picture', { json: {} })
        await mIFrame.contentDocument.dispatchEvent(event);
    }

    function resize(width, height) {
        mIFrame.setAttribute('width', width);
        mIFrame.setAttribute('height', height);
    }

    window.savePicture = async (json, dataUrl) => {
        await mSaveCallback(mPictureId, json, dataUrl);
    };

    this.show = show;
    this.hide = hide;
    this.resize = resize;
    this.onSave = (func) => mSaveCallback = func;
}