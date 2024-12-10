
import { AssetTypes, ModelUpdateCommands } from '../constants.js';
import { Data } from '../data.js';
import { AssetUtil } from '../utils/assets_util.js';
import { DataUtil } from '../utils/data_util.js';
import { IdUtil } from '../utils/id_util.js';
import { UrlUtil } from '../utils/url_util.js';
import { Util } from '../utils/utility.js';
import { WindowEventManager } from '../window_event_manager.js';
import { ModelController, ModelUpdate } from './controllers/model_controller.js';
import { PictureEditorController } from './controllers/picture_editor_controller.js';
import { SceneInterfaceController } from './controllers/scene_interface_controller.js';
import { SidebarController } from './controllers/sidebar_controller.js';
import { AssetPicker } from './editor_panels/asset_picker.js';

export function EditorPage(parentContainer, mWebsocketController) {
    const RESIZE_TARGET_SIZE = 20;
    let mModelController;
    let mWorkspace;
    let mAssetUtil;

    let mSidebarDivider = 0.8;
    let mBottomDivider = 0.8;
    let mWidth = 100;
    let mHeight = 100;

    let mResizingWindows = false;
    let mWindowEventManager = new WindowEventManager();

    let mMainContainer = document.createElement('div');
    mMainContainer.setAttribute('id', 'story-display-main-container')
    mMainContainer.style['width'] = '100%';
    mMainContainer.style['height'] = '100%';
    mMainContainer.style['display'] = 'flex';
    mMainContainer.style['flex-direction'] = 'row';
    parentContainer.appendChild(mMainContainer);

    let mStoryDisplay = document.createElement('div');
    mStoryDisplay.setAttribute('id', 'story-display')
    mStoryDisplay.style['display'] = 'flex';
    mStoryDisplay.style['flex-direction'] = 'column';
    mMainContainer.appendChild(mStoryDisplay);

    let mViewContainer = document.createElement('div');
    mViewContainer.setAttribute('id', 'canvas-view-container')
    mViewContainer.style['display'] = 'block'
    mViewContainer.style['border'] = '1px solid black'
    mStoryDisplay.appendChild(mViewContainer);

    let mSidebarContainer = document.createElement('div');
    mSidebarContainer.setAttribute('id', 'sidebar')
    mSidebarContainer.style['height'] = '100%'
    mSidebarContainer.style['display'] = 'block'
    mSidebarContainer.style['border'] = '1px solid black'
    mSidebarContainer.style['overflow-y'] = 'scroll'
    mMainContainer.appendChild(mSidebarContainer);

    let mResizeTarget = document.createElement('img');
    mResizeTarget.setAttribute('id', 'resize-control')
    mResizeTarget.setAttribute('src', 'assets/images/buttons/panning_button.png')
    mResizeTarget.style['position'] = 'absolute'
    mResizeTarget.style['width'] = RESIZE_TARGET_SIZE + 'px'
    mResizeTarget.style['height'] = RESIZE_TARGET_SIZE + 'px'
    mResizeTarget.addEventListener('dragstart', (event) => event.preventDefault())
    mResizeTarget.addEventListener('pointerdown', () => { mResizingWindows = true; });
    parentContainer.appendChild(mResizeTarget);

    let mSceneInterface = new SceneInterfaceController(mViewContainer, mWebsocketController);
    mSceneInterface.onModelUpdate(async (updates) => {
        await mModelController.applyUpdates(updates);
        await updateModel();
    });

    // Shares a container with the sessions
    let mPictureEditorController = new PictureEditorController(mViewContainer);
    mPictureEditorController.onSave(async (id, json, dataUrl) => {
        await mModelController.applyUpdates([new ModelUpdate({ id, json, image: dataUrl })]);
        await updateModel();
    })

    let mAssetPicker = new AssetPicker(parentContainer);
    mAssetPicker.onNewAsset(async (file, type) => {
        if (!mWorkspace) {
            await mWebsocketController.newAsset(file, type)
        } else {
            let newFilename = await mWorkspace.storeAsset(file);
            let asset = null;
            if (type == AssetTypes.MODEL) {
                asset = await mAssetUtil.loadGLTFModel(newFilename);
            }
            let updates = await DataUtil.getAssetCreationUpdates(file.name, newFilename, type, asset);
            await mModelController.applyUpdates(updates);
        }
        await updateModel();
    })
    mAssetPicker.onAssetsUpload(async (files) => {
        let updates = [];
        for (let file of files) {
            try {
                let t = file.type.split('/')[0];
                let type;
                if (t == 'image') {
                    type = AssetTypes.IMAGE;
                } else {
                    let extension = file.name.split('.').pop();
                    if (extension == 'glb' || extension == 'gltf') {
                        type = AssetTypes.MODEL;
                    } else {
                        console.error('Unhandled file type: ' + file.type + " " + extension);
                        continue;
                    }
                }

                if (!mWorkspace) {
                    await mWebsocketController.newAsset(file, type)
                } else {
                    let newFilename = await mWorkspace.storeAsset(file);
                    let asset = null;
                    if (type == AssetTypes.MODEL) {
                        asset = await mAssetUtil.loadGLTFModel(newFilename);
                    }
                    updates.push(...(await DataUtil.getAssetCreationUpdates(file.name, newFilename, type, asset)));
                }
            } catch (e) {
                console.error(e);
            }
        }
        if (updates) {
            await mModelController.applyUpdates(updates);
            await updateModel();
        }
    })

    let mSidebarController = new SidebarController(mSidebarContainer);
    mSidebarController.onAdd(async (parentId, itemClass, config) => {
        // should be undo/redo stuff here.

        if (itemClass == Data.Picture) {
            let id = IdUtil.getUniqueId(itemClass);
            let parent = mModelController.getModel().find(parentId);
            if (!parent) { console.error('invalid parent id: ' + parentId); return; }
            parent.pictureIds.push(id);
            let updates = [
                new ModelUpdate({ id }),
                new ModelUpdate({ id: parentId, pictureIds: parent.pictureIds }),
            ];
            await mModelController.applyUpdates(updates);
        } else if (itemClass == Data.Audio) {
            let assetId = await mAssetPicker.showOpenAssetPicker(AssetTypes.AUDIO);
            if (assetId) {
                let id = IdUtil.getUniqueId(itemClass);
                let parent = mModelController.getModel().find(parentId);
                if (!parent) { console.error('invalid parent id: ' + parentId); return; }
                parent.audioIds.push(id);
                let updates = [
                    new ModelUpdate({ id, assetId }),
                    new ModelUpdate({ id: parentId, audioIds: parent.audioIds }),
                ];
                await mModelController.applyUpdates(updates);
            }
        } else if (itemClass == Data.PoseableAsset) {
            let assetId = await mAssetPicker.showOpenAssetPicker(AssetTypes.MODEL);
            if (assetId) {
                let updates = await DataUtil.getPoseableAssetCreationUpdates(mModelController.getModel(), parentId, assetId);
                await mModelController.applyUpdates(updates);
            }
        } else if (itemClass == Data.Moment) {
            console.error('impliment me!');
        } else if (itemClass == Data.Asset) {
            await mAssetPicker.showOpenAssetPicker();
        } else {
            console.error("Parent + item class not supported", parentId, itemClass);
            return;
        }
        await updateModel();
    })
    mSidebarController.setUpdateAttributeCallback(async (id, attrs) => {
        await mModelController.applyUpdates([new ModelUpdate({ id, ...attrs })]);
        await updateModel();
    })
    mSidebarController.setDeleteCallback(async (id) => {
        await mModelController.applyUpdates([new ModelUpdate({ id }, ModelUpdateCommands.DELETE)]);
        await updateModel();
    })
    mSidebarController.setSelectAsset(async () => {
        return await mAssetPicker.showOpenAssetPicker();
    })
    mSidebarController.setEditPictureCallback(async (id) => {
        let picture = mModelController.getModel().find(id);
        if (!picture) { console.error("Invalid id:" + id); return; }
        await mPictureEditorController.show(id, picture.json);
    })
    mSidebarController.setCloseEditPictureCallback(async () => {
        await mPictureEditorController.hide()
    })
    mSidebarController.onNavigate(async id => {
        if (IdUtil.getClass(id) == Data.Moment) {
            await setCurrentMoment(id);
        } else if (IdUtil.getClass(id) == Data.StoryModel) {
            await setCurrentMoment(null);
        }
    })
    mSidebarController.onSessionStart(async session => {
        await mSceneInterface.sessionStart(session);
    })
    mSidebarController.onStartShare(async () => {
        if (!mWorkspace) { console.error("Invalid state, should not share unless running local worksapce."); }
        await mWebsocketController.shareStory(mModelController.getModel(), mWorkspace);
    })

    mWebsocketController.onStoryUpdate(async updates => {
        mModelController.removeUpdateListener(mWebsocketController.updateStory);
        await mModelController.applyUpdates(updates);
        mModelController.addUpdateListener(mWebsocketController.updateStory);
        updateModel();
    })

    mWebsocketController.onNewAsset(async (name, buffer, type) => {
        let file = new File([buffer], name);
        let newFilename = await mWorkspace.storeAsset(file);
        await mWebsocketController.uploadAsset(mModelController.getModel().id, newFilename, mWorkspace);

        let asset = null;
        if (type == AssetTypes.MODEL) {
            asset = await mAssetUtil.loadGLTFModel(newFilename);
        }
        let updates = await DataUtil.getAssetCreationUpdates(file.name, newFilename, type, asset);
        await mModelController.applyUpdates(updates);
        updateModel();
    })

    mSceneInterface.onAssetUpdate(async (id, blob) => {
        let asset = mModelController.getModel().find(id);
        if (!asset) { console.error('Invalid id: ' + id); }
        let file = new File([blob], asset.filename);
        if (!mWorkspace) {
            mWebsocketController.updateAsset(id, file);
        } else {
            await mWorkspace.updateAsset(file);
            await mWebsocketController.uploadAsset(mModelController.getModel().id, asset.filename, mWorkspace);
            await mModelController.applyUpdates([new ModelUpdate({ id, updated: Date.now() })]);
            await updateModel();
        }
    });

    mWebsocketController.onUpdateAsset(async (id, name, buffer) => {
        let file = new File([buffer], name);
        await mWorkspace.updateAsset(file);
        await mWebsocketController.uploadAsset(mModelController.getModel().id, name, mWorkspace);
        await mModelController.applyUpdates([new ModelUpdate({ id, updated: Date.now() })]);
        updateModel();
    })

    async function show(workspace = null) {
        mWorkspace = workspace;

        const storyId = UrlUtil.getParam('story');
        if (!storyId) { console.error("Story not set!"); return; }

        const remote = UrlUtil.getParam("remote") == 'true';

        if (remote) {
            mSidebarController.hideShare();
            let story = await new Promise((resolve, reject) => {
                mWebsocketController.connectToStory(storyId);
                mWebsocketController.onStoryConnect(async (story) => {
                    resolve(story);
                })
            })
            let model = Data.StoryModel.fromObject(story);

            mModelController = new ModelController(model);

            mAssetUtil = new AssetUtil({
                getAssetAsDataURI: async function (filename) {
                    let file = await fetch('uploads/' + storyId + "/" + filename);
                    return await file.text();
                }
            });
        } else {
            let story = await mWorkspace.getStory(storyId);
            if (!story) throw Error("Invalid workspace!");

            mModelController = new ModelController(story);
            mModelController.addUpdateListener((updates, model) => mWorkspace.updateStory(model));
            mAssetUtil = new AssetUtil(mWorkspace);

            if (story.moments.length == 0) {
                let canvas = document.createElement('canvas');
                canvas.height = 256;
                canvas.width = 512;
                let blurFileName = await mWorkspace.storeCanvas('sphereblur', canvas);
                let colorFileName = await mWorkspace.storeCanvas('spherecolor', canvas);
                let updates = await DataUtil.getMomentCreationUpdates(blurFileName, colorFileName);
                await mModelController.applyUpdates(updates);
            }
        }

        mModelController.addUpdateListener(mWebsocketController.updateStory);

        resize(mWidth, mHeight);

        await mSidebarController.updateModel(mModelController.getModel());

        await updateModel();

        const momentId = UrlUtil.getParam('moment')
        if (momentId) {
            setCurrentMoment(momentId);
        } else {
            setCurrentMoment(null);
        }
    }

    async function updateModel() {
        try {
            let model = mModelController.getModel();
            await mAssetUtil.updateModel(model);
            await mAssetPicker.updateModel(model);

            await mSidebarController.updateModel(model);
            await mSceneInterface.updateModel(model, mAssetUtil);
        } catch (e) {
            console.error(e);
        }
    }

    async function setCurrentMoment(momentId) {
        if (!momentId) { UrlUtil.setParams({ 'moment': null }); }

        let model = mModelController.getModel();
        let moment = model.find(momentId);
        if (moment) {
            UrlUtil.setParams({ 'moment': momentId });
            await mSceneInterface.setCurrentMoment(momentId);
            await mSidebarController.navigate(momentId);
        } else {
            UrlUtil.setParams({ 'moment': null });
            await mSidebarController.navigate(model.id);
        }
    }

    mWindowEventManager.onResize(resize);
    function resize(windowWidth, windowHeight) {
        mWidth = windowWidth;
        mHeight = windowHeight;

        mSidebarController.resize(mWidth - Math.round(mWidth * mSidebarDivider), mHeight);

        let viewCanvasWidth = Math.round(mWidth * mSidebarDivider)
        let viewCanvasHeight = Math.round(mHeight /* * mBottomDivider*/)

        mResizeTarget.style['left'] = (viewCanvasWidth - RESIZE_TARGET_SIZE / 2) + "px"
        mResizeTarget.style['top'] = (viewCanvasHeight - RESIZE_TARGET_SIZE / 2) + "px"

        mSceneInterface.resize(viewCanvasWidth, viewCanvasHeight);
        mPictureEditorController.resize(viewCanvasWidth, viewCanvasHeight);
    }

    mWindowEventManager.onPointerUp((screenCoords) => {
        if (mResizingWindows) {
            mSidebarDivider = Util.limit(screenCoords.x / mWidth, 0.01, 0.99);
            mBottomDivider = Util.limit(screenCoords.y / mHeight, 0.01, 0.99);
            resize(mWidth, mHeight);
        }
    });

    mWindowEventManager.onPointerUp(() => {
        mResizingWindows = false;
    });

    this.show = show;
}