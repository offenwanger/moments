import { Data } from '../../data.js';
import { ButtonInput } from '../components/button_input.js';
import { VRButton } from '../components/vr_button.js';
import { AssetPanel } from '../editor_panels/asset_panel.js';
import { AssetPosePanel } from '../editor_panels/asset_pose_panel.js';
import { AudioPanel } from '../editor_panels/audio_panel.js';
import { MomentPanel } from '../editor_panels/moments_panel.js';
import { PicturePanel } from '../editor_panels/picture_panel.js';
import { PoseableAssetPanel } from '../editor_panels/poseable_asset_panel.js';
import { StoryPanel } from '../editor_panels/story_panel.js';
import { TeleportPanel } from '../editor_panels/teleport_panel.js';

export function SidebarController(container) {
    let mNavigateCallback = async (id) => { }
    let mStartShareCallback = async () => { }
    let mShowAssetManagerCallback = async () => { }

    let mShownItem = null;
    let mModel = null;
    let mLastMomentId = null;

    const mVRButton = new VRButton(container);
    let mShareButton = new ButtonInput(container)
        .setId('share-button')
        .setLabel('Share')
        .setOnClick(async () => {
            mShareButton.setLabel('Uploading...')
            await mStartShareCallback();
            mShareButton.setLabel('Sharing!')
        });
    const mAssetManagerButton = new ButtonInput(container)
        .setId('asset-manager-button')
        .setLabel('Assets')
        .setOnClick(async () => {
            await mShowAssetManagerCallback();
        });
    const mAssetPanel = new AssetPanel(container);
    const mAudioPanel = new AudioPanel(container);
    const mTeleportPanel = new TeleportPanel(container);
    const mMomentPanel = new MomentPanel(container);
    const mPicturePanel = new PicturePanel(container);
    const mPoseableAssetPanel = new PoseableAssetPanel(container);
    const mAssetPosePanel = new AssetPosePanel(container);
    const mStoryPanel = new StoryPanel(container);

    mStoryPanel.setNavigationCallback(async (id) => { await navigate(id); await mNavigateCallback(id); });
    mPoseableAssetPanel.setNavigationCallback(async (id) => { await navigate(id); await mNavigateCallback(id); });
    mAssetPosePanel.setNavigationCallback(async (id) => { await navigate(id); await mNavigateCallback(id); });
    mAudioPanel.setNavigationCallback(async (id) => { await navigate(id); await mNavigateCallback(id); });
    mTeleportPanel.setNavigationCallback(async (id) => { await navigate(id); await mNavigateCallback(id); });
    mMomentPanel.setNavigationCallback(async (id) => { await navigate(id); await mNavigateCallback(id); });
    mPicturePanel.setNavigationCallback(async (id) => { await navigate(id); await mNavigateCallback(id); });
    mAssetPanel.setNavigationCallback(async (id) => { await navigate(id); await mNavigateCallback(id); });

    async function updateModel(model) {
        mModel = model;
        let item = mShownItem ? mModel.find(mShownItem) : null;
        if (!item) {
            let item = mModel.moments.find(m => m.id == mLastMomentId);
            if (item) {
                mShownItem = mLastMomentId;
            } else {
                mShownItem = model.id;
            }
        }

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
        } else if (item instanceof Data.AssetPose) {
            mAssetPosePanel.show(mModel, id);
        } else if (item instanceof Data.Teleport) {
            mTeleportPanel.show(mModel, id);
        } else if (item instanceof Data.Audio) {
            mAudioPanel.show(mModel, id);
        } else if (item instanceof Data.Moment) {
            mLastMomentId = id;
            mMomentPanel.show(mModel, id);
        } else if (item instanceof Data.Picture) {
            mPicturePanel.show(mModel, id);
        } else if (item instanceof Data.Asset) {
            mAssetPanel.show(mModel, id);
        } else {
            console.error('Invalid navigation!', id);
        }
    }

    function resize(width, height) {
        container.style['width'] = width + "px";
        container.style['height'] = height + "px";
    }

    function hideAll() {
        mAssetPanel.hide();
        mAudioPanel.hide();
        mTeleportPanel.hide();
        mMomentPanel.hide();
        mPicturePanel.hide();
        mPoseableAssetPanel.hide();
        mAssetPosePanel.hide();
        mStoryPanel.hide();
    }

    function setUpdateAttributeCallback(func) {
        mAssetPanel.setUpdateAttributeCallback(func);
        mAudioPanel.setUpdateAttributeCallback(func);
        mMomentPanel.setUpdateAttributeCallback(func);
        mPicturePanel.setUpdateAttributeCallback(func);
        mPoseableAssetPanel.setUpdateAttributeCallback(func);
        mAssetPosePanel.setUpdateAttributeCallback(func);
        mTeleportPanel.setUpdateAttributeCallback(func);
        mStoryPanel.setUpdateAttributeCallback(func);
    }

    function setDeleteCallback(func) {
        mAssetPanel.setDeleteCallback(func);
        mAudioPanel.setDeleteCallback(func);
        mMomentPanel.setDeleteCallback(func);
        mPicturePanel.setDeleteCallback(func);
        mPoseableAssetPanel.setDeleteCallback(func);
        mTeleportPanel.setDeleteCallback(func);
    }

    this.updateModel = updateModel;
    this.navigate = navigate;
    this.resize = resize;
    this.onAddMoment = mStoryPanel.onAddMoment;
    this.setUpdateAttributeCallback = setUpdateAttributeCallback;
    this.setDeleteCallback = setDeleteCallback;
    this.setEditPictureCallback = (func) => mPicturePanel.setEditPictureCallback(func);
    this.setCloseEditPictureCallback = (func) => mPicturePanel.setCloseEditPictureCallback(func);
    this.onNavigate = (func) => mNavigateCallback = func;
    this.onSessionStart = (func) => mVRButton.onSessionStart(func);
    this.onStartShare = (func) => mStartShareCallback = func;
    this.onShowAssetManager = (func) => mShowAssetManagerCallback = func;
    this.hideShare = () => mShareButton.hide();
}