export function AnnotationEditorController(parentContainer) {
    let mSaveCallback = async () => { }

    let mAnnotationId = null;

    let mIFrame = parentContainer.append('iframe')
        .attr('id', 'annotation-editor-iframe')
        .attr('src', 'lib/fabricjs-image-editor-origin/index.html')
        .style('display', 'none')
        .style('position', 'absolute')
        .style('top', '0')
        .style('left', '0')
        .style('z-index', '1000')

    async function show(id, json) {
        mAnnotationId = id;
        let event = new CustomEvent('set-annotation', { json })
        mIFrame.style('display', '')
        await mIFrame.node().contentDocument.dispatchEvent(event);
    }

    async function hide() {
        mIFrame.style('display', 'none')
        let event = new CustomEvent('set-annotation', { json: {} })
        await mIFrame.node().contentDocument.dispatchEvent(event);
    }

    function resize(width, height) {
        mIFrame.attr('width', width);
        mIFrame.attr('height', height);
    }

    window.addEventListener('save-annotation', async (e) => {
        await mSaveCallback(mAnnotationId, e.json);
    })

    this.show = show;
    this.hide = hide;
    this.resize = resize;
    this.onSave = (func) => mSaveCallback = func;
}