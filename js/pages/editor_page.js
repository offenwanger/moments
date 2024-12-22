
import * as THREE from 'three';
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
import { AudioRecorder } from '../utils/audio_recorder.js';

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
    let mAudioRecorder = new AudioRecorder();

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

    let mSceneInterface = new SceneInterfaceController(mViewContainer, mWebsocketController, mAudioRecorder);
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

                let id = IdUtil.getUniqueId(Data.Asset);
                if (!mWorkspace) {
                    await mWebsocketController.newAsset(id, file, type)
                } else {
                    let newFilename = await mWorkspace.storeAsset(file);
                    let asset = null;
                    if (type == AssetTypes.MODEL) {
                        asset = await mAssetUtil.loadGLTFModel(newFilename);
                    }
                    updates.push(...(await DataUtil.getAssetCreationUpdates(
                        id, file.name, newFilename, type, asset)));
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
    mSidebarController.onAddMoment(async () => {
        await createMoment();
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
    mSidebarController.onShowAssetManager(async () => {
        await mAssetPicker.showOpenAssetPicker();
    })

    mWebsocketController.onStoryUpdate(async updates => {
        mModelController.removeUpdateListener(mWebsocketController.updateStory);
        await mModelController.applyUpdates(updates);
        mModelController.addUpdateListener(mWebsocketController.updateStory);
        updateModel();
    })

    mWebsocketController.onNewAsset(async (id, name, buffer, type) => {
        let file = new File([buffer], name);
        let newFilename = await mWorkspace.storeAsset(file);
        await mWebsocketController.uploadAsset(mModelController.getModel().id, newFilename, mWorkspace);

        let asset = null;
        if (type == AssetTypes.MODEL) {
            asset = await mAssetUtil.loadGLTFModel(newFilename);
        }
        let updates = await DataUtil.getAssetCreationUpdates(id, file.name, newFilename, type, asset);
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

    mSceneInterface.onAssetCreate(async (id, name, type, blob) => {
        let file = new File([blob], name);
        if (!mWorkspace) {
            await mWebsocketController.newAsset(id, file, type)
        } else {
            let newFilename = await mWorkspace.storeAsset(file);
            let asset = null;
            if (type == AssetTypes.MODEL) {
                asset = await mAssetUtil.loadGLTFModel(newFilename);
            }
            let updates = await DataUtil.getAssetCreationUpdates(
                id, file.name, newFilename, type, asset)
            await mModelController.applyUpdates(updates);
            updateModel();
        }
    });

    mSceneInterface.onTeleport(async (id) => {
        let isTeleport = IdUtil.getClass(id) == Data.Teleport;
        let teleport = mModelController.getModel().teleports.find(t => isTeleport ? t.id == id : t.attachedId == id);
        if (!teleport) { console.error('Invalid id: ' + id); }
        let pos = new THREE.Vector3(teleport.sceneX, teleport.sceneY, teleport.sceneZ)
        let direction = new THREE.Vector3(teleport.sceneDirX, teleport.sceneDirY, teleport.sceneDirZ);
        await setCurrentMoment(teleport.momentId, pos, direction);
        updateModel();
    });

    mSceneInterface.onCreateMoment(async () => {
        await createMoment();
    });

    mWebsocketController.onUpdateAsset(async (id, name, buffer) => {
        let file = new File([buffer], name);
        await mWorkspace.updateAsset(file);
        await mWebsocketController.uploadAsset(mModelController.getModel().id, name, mWorkspace);
        await mModelController.applyUpdates([new ModelUpdate({ id, updated: Date.now() })]);
        updateModel();
    })

    mWebsocketController.onCreateMoment(async () => {
        await createMoment();
    })

    async function show(workspace = null) {
        mWorkspace = workspace;

        mAudioRecorder.init();

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
                await createMoment();
            }
        }

        mModelController.addUpdateListener(mWebsocketController.updateStory);

        resize(mWidth, mHeight);

        await updateModel();

        const momentId = UrlUtil.getParam('moment')
        if (momentId) {
            await setCurrentMoment(momentId);
        } else {
            await setCurrentMoment(null);
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

    async function setCurrentMoment(momentId, position = new THREE.Vector3(), direction = new THREE.Vector3(0, 0, -1)) {
        if (!momentId) { UrlUtil.updateParams({ 'moment': null }); }

        let model = mModelController.getModel();
        let moment = model.find(momentId);
        if (moment) {
            UrlUtil.updateParams({ 'moment': momentId });
            await mSidebarController.navigate(momentId);
        } else {
            UrlUtil.updateParams({ 'moment': null });
            await mSidebarController.navigate(model.id);
        }
        await mSceneInterface.setCurrentMoment(momentId, position, direction);
    }

    async function createMoment() {
        if (!mWorkspace) {
            mWebsocketController.createMoment();
        } else {
            let canvas = document.createElement('canvas');
            canvas.height = 256;
            canvas.width = 512;
            let blurFileName = await mWorkspace.storeCanvas('sphereblur', canvas);
            let colorFileName = await mWorkspace.storeCanvas('spherecolor', canvas);
            let updates = await DataUtil.getMomentCreationUpdates(
                mModelController.getModel(),
                blurFileName,
                colorFileName);
            await mModelController.applyUpdates(updates);
            updateModel();
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