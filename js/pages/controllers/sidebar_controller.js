import { Data } from '../../data.js';
import { AnnotationPanel } from '../editor_panels/annotation_panel.js';
import { AssetPanel } from '../editor_panels/asset_panel.js';
import { Model3DPanel } from '../editor_panels/model3D_panel.js';
import { StoryPanel } from '../editor_panels/story_panel.js';

export function SidebarController(container) {
    let mShownItem = null;
    let mModel = null;

    const mStoryPanel = new StoryPanel(container);
    const mModel3DPanel = new Model3DPanel(container);
    const mAnnotationPanel = new AnnotationPanel(container);
    const mAssetPanel = new AssetPanel(container);

    mStoryPanel.setNavigationCallback(navigate);
    mModel3DPanel.setNavigationCallback(navigate);
    mAnnotationPanel.setNavigationCallback(navigate);
    mAssetPanel.setNavigationCallback(navigate);

    async function updateModel(model) {
        mModel = model;
        let item = mShownItem ? mModel.find(mShownItem) : null;
        if (!item) mShownItem = model.id;
        await navigate(mShownItem);
    }

    async function navigate(id) {
        let item = mModel.find(id)
        if (!item) { console.error('Invalid id', id); return; }

        hideAll();
        mShownItem = id;

        if (item instanceof Data.StoryModel) {
            mStoryPanel.show(mModel, id);
        } else if (item instanceof Data.Model3D) {
            mModel3DPanel.show(mModel, id);
        } else if (item instanceof Data.Annotation) {
            mAnnotationPanel.show(mModel, id);
        } else if (item instanceof Data.Asset) {
            mAssetPanel.show(mModel, id);
        } else {
            console.error('Invalid navigation!', itemClass, id);
        }
    }

    function resize(width, height) {
        container.style('width', width + "px")
        container.style('height', height + "px")
    }

    function hideAll() {
        mStoryPanel.hide();
        mModel3DPanel.hide();
        mAnnotationPanel.hide();
        mAssetPanel.hide();
    }

    function setAddCallback(func) {
        mStoryPanel.setAddCallback(func);
        mAnnotationPanel.setAddCallback(func);
        mAssetPanel.setAddCallback(func);
    }

    function setUpdateAttributeCallback(func) {
        mStoryPanel.setUpdateAttributeCallback(func);
        mModel3DPanel.setUpdateAttributeCallback(func);
        mAnnotationPanel.setUpdateAttributeCallback(func);
        mAssetPanel.setUpdateAttributeCallback(func);
    }

    function setDeleteCallback(func) {
        mModel3DPanel.setDeleteCallback(func);
        mAnnotationPanel.setDeleteCallback(func);
        mAssetPanel.setDeleteCallback(func);
    }

    this.updateModel = updateModel;
    this.navigate = navigate;
    this.resize = resize;
    this.setAddCallback = setAddCallback;
    this.setUpdateAttributeCallback = setUpdateAttributeCallback;
    this.setDeleteCallback = setDeleteCallback;
    this.setEditAnnotationCallback = (func) => mAnnotationPanel.setEditAnnotationCallback(func);
    this.setCloseEditAnnotationCallback = (func) => mAnnotationPanel.setCloseEditAnnotationCallback(func);
    this.setSelectAsset = (func) => mModel3DPanel.setSelectAsset(func);
    this.setViewAssetCallback = (func) => mAssetPanel.setViewAssetCallback(func);
}