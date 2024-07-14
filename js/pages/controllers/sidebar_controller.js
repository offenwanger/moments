import { Data } from '../../data_structs.js';
import { IdUtil } from '../../utils/id_util.js';

import { StoryPanel } from '../editor_panels/story_panel.js';
import { Model3DPanel } from '../editor_panels/model3D_panel.js';
import { AnnotationPanel } from '../editor_panels/annotation_panel.js';
import { AnnotationItemPanel } from '../editor_panels/annotation_item_panel.js';
import { AssetPanel } from '../editor_panels/asset_panel.js';

export function SidebarController(container) {
    let mShownItem = null;
    let mModel = null;

    const mStoryPanel = new StoryPanel(container);
    const mModel3DPanel = new Model3DPanel(container);
    const mAnnotationPanel = new AnnotationPanel(container);
    const mAnnotationItemPanel = new AnnotationItemPanel(container);
    const mAssetPanel = new AssetPanel(container);

    setNavigationCallbacks();

    async function updateModel(model) {
        mModel = model;
        let item = mShownItem ? mModel.getById(mShownItem) : null;
        if (!item) mShownItem = model.getStory().id;
        await navigate(mShownItem);
    }

    async function navigate(id) {
        if (!mModel.getById(id)) { console.error('Invalid id', id); return; }

        hideAll();
        mShownItem = id;
        let itemClass = IdUtil.getClass(id);

        if (itemClass == Data.Story) {
            mStoryPanel.show(mModel, id);
        } else if (itemClass == Data.Model3D) {
            mModel3DPanel.show(mModel, id);
        } else if (itemClass == Data.Annotation) {
            mAnnotationPanel.show(mModel, id);
        } else if (itemClass == Data.AnnotationItem) {
            mAnnotationItemPanel.show(mModel, id);
        }  else if (itemClass == Data.Asset) {
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
        mAnnotationItemPanel.hide();
        mAssetPanel.hide();
    }

    function setNavigationCallbacks() {
        mStoryPanel.setNavigationCallback(navigate);
        mModel3DPanel.setNavigationCallback(navigate);
        mAnnotationPanel.setNavigationCallback(navigate);
        mAnnotationItemPanel.setNavigationCallback(navigate);
        mAssetPanel.setNavigationCallback(navigate);
    }

    function setAddCallback(func) {
        mStoryPanel.setAddCallback(func);
        mAnnotationPanel.setAddCallback(func);
        mAnnotationItemPanel.setAddCallback(func);
        mAssetPanel.setAddCallback(func);
    }

    function setUpdateAttributeCallback(func) {
        mStoryPanel.setUpdateAttributeCallback(func);
        mModel3DPanel.setUpdateAttributeCallback(func);
        mAnnotationPanel.setUpdateAttributeCallback(func);
        mAnnotationItemPanel.setUpdateAttributeCallback(func);
        mAssetPanel.setUpdateAttributeCallback(func);
    }

    function setDeleteCallback(func) {
        mModel3DPanel.setDeleteCallback(func);
        mAnnotationPanel.setDeleteCallback(func);
        mAnnotationItemPanel.setDeleteCallback(func);
        mAssetPanel.setDeleteCallback(func);
    }

    this.updateModel = updateModel;
    this.navigate = navigate;
    this.resize = resize;
    this.setAddCallback = setAddCallback;
    this.setUpdateAttributeCallback = setUpdateAttributeCallback;
    this.setDeleteCallback = setDeleteCallback;
    this.setSelectAsset = (func) => mModel3DPanel.setSelectAsset(func);
    this.setViewAssetCallback = (func) => mAssetPanel.setViewAssetCallback(func);
}