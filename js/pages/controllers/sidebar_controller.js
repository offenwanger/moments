import { Data } from '../../data.js';
import { ButtonInput } from '../components/button_input.js';
import { VRButton } from '../components/vr_button.js';
import { AssetPanel } from '../editor_panels/asset_panel.js';
import { AudioPanel } from '../editor_panels/audio_panel.js';
import { MomentPanel } from '../editor_panels/moments_panel.js';
import { PicturePanel } from '../editor_panels/picture_panel.js';
import { PoseableAssetPanel } from '../editor_panels/poseable_asset_panel.js';
import { StoryPanel } from '../editor_panels/story_panel.js';

export function SidebarController(container) {
    let mNavigateCallback = async (id) => { }
    let mStartShareCallback = async () => { }

    let mShownItem = null;
    let mModel = null;

    const mVRButton = new VRButton(container);
    let mShareButton = new ButtonInput(container)
        .setId('share-button')
        .setLabel('Share')
        .setOnClick(async () => {
            mShareButton.setLabel('Uploading...')
            await mStartShareCallback();
            mShareButton.setLabel('Sharing!')
        });
    const mAssetPanel = new AssetPanel(container);
    const mAudioPanel = new AudioPanel(container);
    const mMomentPanel = new MomentPanel(container);
    const mPicturePanel = new PicturePanel(container);
    const mPoseableAssetPanel = new PoseableAssetPanel(container);
    const mStoryPanel = new StoryPanel(container);

    mStoryPanel.setNavigationCallback(async (id) => { navigate(id); await mNavigateCallback(id); });
    mPoseableAssetPanel.setNavigationCallback(async (id) => { navigate(id); await mNavigateCallback(id); });
    mMomentPanel.setNavigationCallback(async (id) => { navigate(id); await mNavigateCallback(id); });
    mPicturePanel.setNavigationCallback(async (id) => { navigate(id); await mNavigateCallback(id); });
    mAssetPanel.setNavigationCallback(async (id) => { navigate(id); await mNavigateCallback(id); });

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
        } else if (item instanceof Data.PoseableAsset) {
            mPoseableAssetPanel.show(mModel, id);
        } else if (item instanceof Data.Audio) {
            mAudioPanel.show(mModel, id);
        } else if (item instanceof Data.Moment) {
            mMomentPanel.show(mModel, id);
        } else if (item instanceof Data.Picture) {
            mPicturePanel.show(mModel, id);
        } else if (item instanceof Data.Asset) {
            mAssetPanel.show(mModel, id);
        } else {
            console.error('Invalid navigation!', itemClass, id);
        }
    }

    function resize(width, height) {
        container.style['width'] = width + "px";
        container.style['height'] = height + "px";
    }

    function hideAll() {
        mAssetPanel.hide();
        mAudioPanel.hide();
        mMomentPanel.hide();
        mPicturePanel.hide();
        mPoseableAssetPanel.hide();
        mStoryPanel.hide();
    }

    function onAdd(func) {
        mAssetPanel.onAdd(func);
        mAudioPanel.onAdd(func);
        mMomentPanel.onAdd(func);
        mPicturePanel.onAdd(func);
        mStoryPanel.onAdd(func);
    }

    function setUpdateAttributeCallback(func) {
        mAssetPanel.setUpdateAttributeCallback(func);
        mAudioPanel.setUpdateAttributeCallback(func);
        mMomentPanel.setUpdateAttributeCallback(func);
        mPicturePanel.setUpdateAttributeCallback(func);
        mPoseableAssetPanel.setUpdateAttributeCallback(func);
        mStoryPanel.setUpdateAttributeCallback(func);
    }

    function setDeleteCallback(func) {
        mAssetPanel.setDeleteCallback(func);
        mAudioPanel.setDeleteCallback(func);
        mMomentPanel.setDeleteCallback(func);
        mPicturePanel.setDeleteCallback(func);
        mPoseableAssetPanel.setDeleteCallback(func);
    }

    this.updateModel = updateModel;
    this.navigate = navigate;
    this.resize = resize;
    this.onAdd = onAdd;
    this.setUpdateAttributeCallback = setUpdateAttributeCallback;
    this.setDeleteCallback = setDeleteCallback;
    this.setEditPictureCallback = (func) => mPicturePanel.setEditPictureCallback(func);
    this.setCloseEditPictureCallback = (func) => mPicturePanel.setCloseEditPictureCallback(func);
    this.setSelectAsset = (func) => mPoseableAssetPanel.setSelectAsset(func);
    this.onNavigate = (func) => mNavigateCallback = func;
    this.onSessionStart = (func) => mVRButton.onSessionStart(func);
    this.onStartShare = (func) => mStartShareCallback = func;
    this.hideShare = () => mShareButton.hide();
}