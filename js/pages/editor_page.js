
import { AssetTypes, ModelUpdateCommands } from '../constants.js';
import { Data } from '../data.js';
import { AssetUtil } from '../utils/assets_util.js';
import { DataUtil } from '../utils/data_util.js';
import { IdUtil } from '../utils/id_util.js';
import { Util } from '../utils/utility.js';
import { ModelController, ModelUpdate } from './controllers/model_controller.js';
import { SidebarController } from './controllers/sidebar_controller.js';
import { SessionController } from './controllers/session_controller.js';
import { AssetPicker } from './editor_panels/asset_picker.js';
import { PictureEditorController } from './controllers/picture_editor_controller.js';

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

    let mSessionController = new SessionController(mViewContainer, mWebsocketController);
    mSessionController.onTransform(async (id, newPosition = null, newOrientation = null, newScale = null) => {
        let attrs = {}
        if (newPosition) {
            attrs.x = newPosition.x;
            attrs.y = newPosition.y;
            attrs.z = newPosition.z;
        }
        if (newOrientation && IdUtil.getClass(id) != Data.Picture) {
            attrs.orientation = newOrientation.toArray();
        }
        if (newScale) {
            attrs.scale = newScale;
        }
        await mModelController.applyUpdates([new ModelUpdate({ id, ...attrs })]);
        await updateModel();
    });

    mSessionController.onTransformMany(async (items) => {
        await mModelController.applyUpdates(items.map(({ id, position, orientation, scale }) => {
            let data = { id }
            if (position) {
                data.x = position.x;
                data.y = position.y;
                data.z = position.z;
            }
            if (orientation && IdUtil.getClass(id) != Data.Picture) {
                data.orientation = orientation.toArray();
            }
            if (scale) {
                data.scale = scale;
            }
            return new ModelUpdate(data);
        }));
        await updateModel();
    });

    mSessionController.onUpdateSphereImage(async (sphereId, assetId) => {
        await mModelController.applyUpdates([new ModelUpdate({ id: sphereId, imageAssetId: assetId })]);
        await updateModel();
    })

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
            await mSessionController.setCurrentMoment(id);
        }
    })
    mSidebarController.onSessionStart(async session => {
        await mSessionController.sessionStart(session);
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
        let asset = null;
        if (type == AssetTypes.MODEL) {
            asset = await mAssetUtil.loadGLTFModel(newFilename);
        }
        let updates = await DataUtil.getAssetCreationUpdates(file.name, newFilename, type, asset);
        await mModelController.applyUpdates(updates);

        await mWebsocketController.uploadAsset(mModelController.getModel().id, newFilename, mWorkspace);
        updateModel();
    })

    async function show(workspace = null) {
        mWorkspace = workspace;

        const searchParams = new URLSearchParams(window.location.search)
        const storyId = searchParams.get("story");
        if (!storyId) { console.error("Story not set!"); return; }

        const remote = searchParams.get("remote") == 'true';

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

            let workspace = {
                downloads: {},
                getAssetAsDataURI: async function (filename) {
                    if (this.downloads[filename]) return this.downloads[filename];
                    let file = await (await fetch('uploads/' + storyId + "/" + filename)).text();
                    this.downloads[filename] = file;
                    return file;
                }
            }
            mAssetUtil = new AssetUtil(workspace);
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
        await mSidebarController.navigate(mModelController.getModel().id);

        await updateModel();

        if (searchParams.get("assetViewId")) {
            await mSessionController.showAsset(searchParams.get("assetViewId"), mAssetUtil);
        }
    }

    async function updateModel() {
        let model = mModelController.getModel();
        await mAssetUtil.updateModel(model);
        await mAssetPicker.updateModel(model);

        await mSidebarController.updateModel(model);
        await mSessionController.updateModel(model, mAssetUtil);
    }

    function resize(width, height) {
        mWidth = width;
        mHeight = height;

        mSidebarController.resize(mWidth - Math.round(mWidth * mSidebarDivider), mHeight);

        let viewCanvasWidth = Math.round(mWidth * mSidebarDivider)
        let viewCanvasHeight = Math.round(mHeight /* * mBottomDivider*/)

        mResizeTarget.style['left'] = (viewCanvasWidth - RESIZE_TARGET_SIZE / 2) + "px"
        mResizeTarget.style['top'] = (viewCanvasHeight - RESIZE_TARGET_SIZE / 2) + "px"

        mSessionController.resize(viewCanvasWidth, viewCanvasHeight);
        mPictureEditorController.resize(viewCanvasWidth, viewCanvasHeight);
    }

    async function pointerMove(screenCoords) {
        if (mResizingWindows) {
            mSidebarDivider = Util.limit(screenCoords.x / mWidth, 0.01, 0.99);
            mBottomDivider = Util.limit(screenCoords.y / mHeight, 0.01, 0.99);
            resize(mWidth, mHeight);
        }

        await mSessionController.pointerMove(screenCoords);
    }

    async function pointerUp(screenCoords) {
        mResizingWindows = false;
        await mSessionController.pointerUp(screenCoords);
    }

    this.show = show;
    this.resize = resize;
    this.pointerMove = pointerMove;
    this.pointerUp = pointerUp;
}