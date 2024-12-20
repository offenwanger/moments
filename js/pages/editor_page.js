
import { AssetTypes } from '../constants.js';
import { Data } from '../data.js';
import { AssetUtil } from '../utils/assets_util.js';
import { IdUtil } from '../utils/id_util.js';
import { Util } from '../utils/utility.js';
import { ModelController } from './controllers/model_controller.js';
import { SidebarController } from './controllers/sidebar_controller.js';
import { StoryDisplayController } from './controllers/story_display_controller.js';
import { TimelineController } from './controllers/timeline_controller.js';
import { AssetPicker } from './editor_panels/asset_picker.js';

export function EditorPage(parentContainer, mWebsocketController) {
    const RESIZE_TARGET_SIZE = 20;
    let mModelController;
    let mWorkspace;
    let mAssetUtil;

    let mSidebarDivider = 0.8;
    let mTimelineDivider = 0.8;
    let mWidth = 100;
    let mHeight = 100;

    let mResizingWindows = false;

    let mMainContainer = parentContainer.append('div')
        .style('width', '100%')
        .style('height', '100%')
        .style('display', 'flex')
        .style('flex-direction', 'row');

    let mStoryDisplay = mMainContainer.append('div')
        .attr('id', 'story-display')
        .style('display', 'flex')
        .style('flex-direction', 'column');

    let mViewContainer = mStoryDisplay.append('div')
        .attr('id', 'canvas-view-container')
        .style('display', 'block')
        .style('border', '1px solid black')

    let mTimelineContainer = mStoryDisplay.append('div')
        .attr('id', 'timeline')
        .style('display', 'block')
        .style('border', '1px solid black')

    let mSidebarContainer = mMainContainer.append('div')
        .attr('id', 'sidebar')
        .style('height', '100%')
        .style('display', 'block')
        .style('border', '1px solid black')
        .style('overflow-y', 'scroll')

    let mResizeTarget = parentContainer.append('img')
        .attr('id', 'resize-control')
        .attr('src', 'assets/images/buttons/panning_button.png')
        .style('position', 'absolute')
        .style('width', RESIZE_TARGET_SIZE + 'px')
        .style('height', RESIZE_TARGET_SIZE + 'px')
        .on('dragstart', (event) => event.preventDefault())
        .on('pointerdown', () => { mResizingWindows = true; });

    let mStoryDisplayController = new StoryDisplayController(mViewContainer, mWebsocketController);
    mStoryDisplayController.onTransform(async (id, newPosition = null, newOrientation = null, newScale = null) => {
        let attrs = {}
        if (newPosition) {
            attrs.x = newPosition.x;
            attrs.y = newPosition.y;
            attrs.z = newPosition.z;
        }
        if (newOrientation && IdUtil.getClass(id) != Data.Annotation) {
            attrs.orientation = newOrientation.toArray();
        }
        if (newScale) {
            attrs.scale = newScale;
        }
        await mModelController.update(id, attrs);
        await updateModel();
    });

    mStoryDisplayController.onMoveChain(async (items) => {
        await mModelController.updateMany(items.map(({ id, position, orientation }) => {
            return {
                id, attrs: {
                    x: position.x,
                    y: position.y,
                    z: position.z,
                    orientation: orientation.toArray()
                }
            }
        }));
        await updateModel();
    });

    mStoryDisplayController.onUpdateTimeline(async (line) => {
        line = line.filter(p => {
            if (typeof p.x != 'number' || typeof p.y != 'number' || typeof p.z != 'number') {
                console.error("invalid point", p);
                return false;
            }
            return true;
        }).map(p => { return { x: p.x, y: p.y, z: p.z } })
        await mModelController.update(mModelController.getModel().id, { timeline: line });
        await updateModel();
    })

    mStoryDisplayController.onUpdateAnnotationImage(async (annotationId, json, dataUrl) => {
        await mModelController.update(annotationId, { json });
        await mModelController.update(annotationId, { image: dataUrl });
        await updateModel();
    })

    mStoryDisplayController.onStartShare(async () => {
        if (!mWorkspace) { console.error("Invalid state, should not share unless running local worksapce."); }

        mWebsocketController.shareStory(mModelController.getModel(), mWorkspace);
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
            await mModelController.createAsset(file.name, newFilename, type, asset);
        }
        await updateModel();
    })

    let mTimelineController = new TimelineController(mTimelineContainer);

    let mSidebarController = new SidebarController(mSidebarContainer);
    mSidebarController.setAddCallback(async (parentId, itemClass, config) => {
        // should be undo/redo stuff here.

        if (IdUtil.getClass(parentId) == Data.StoryModel && itemClass == Data.Annotation) {
            await mModelController.create(Data.Annotation);
        } else if (itemClass == Data.Model3D) {
            let assetId = await mAssetPicker.showOpenAssetPicker();
            if (assetId) { await mModelController.createModel3D(assetId); }
        } else {
            console.error("Parent + item class not supported", parentId, itemClass);
            return;
        }
        await updateModel();
    })
    mSidebarController.setUpdateAttributeCallback(async (id, attrs) => {
        await mModelController.update(id, attrs);
        await updateModel();
    })
    mSidebarController.setDeleteCallback(async (id) => {
        await mModelController.delete(id);
        await updateModel();
    })
    mSidebarController.setSelectAsset(async () => {
        return await mAssetPicker.showOpenAssetPicker();
    })
    mSidebarController.setEditAnnotationCallback(async (id) => {
        let annotation = mModelController.getModel().find(id);
        if (!annotation) { console.error("Invalid id:" + id); return; }
        await mStoryDisplayController.editAnnotation(id, annotation.json);
    })
    mSidebarController.setCloseEditAnnotationCallback(async () => {
        await mStoryDisplayController.closeEditAnnotation();
    })

    mSidebarController.setViewAssetCallback(async (assetId) => {
        const url = new URL(window.location)
        url.searchParams.set("assetViewId", assetId)
        history.replaceState(null, '', url);
        await mStoryDisplayController.showAsset(assetId, mAssetUtil);
    })
    mStoryDisplayController.onExitAssetView(async (assetId) => {
        const url = new URL(window.location)
        url.searchParams.delete("assetViewId")
        history.replaceState(null, '', url);
    })

    mWebsocketController.onStoryUpdate(async updates => {
        mModelController.removeUpdateCallback(mWebsocketController.updateStory);
        await mModelController.applyUpdates(updates);
        mModelController.addUpdateCallback(mWebsocketController.updateStory);
        updateModel();
    })

    mWebsocketController.onNewAsset(async (name, buffer, type) => {
        let file = new File([buffer], name);
        let newFilename = await mWorkspace.storeAsset(file);
        let asset = null;
        if (type == AssetTypes.MODEL) {
            asset = await mAssetUtil.loadGLTFModel(newFilename);
        }
        await mModelController.createAsset(file.name, newFilename, type, asset);
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
            mStoryDisplayController.hideShare();
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
            mModelController.addUpdateCallback((updates, model) => mWorkspace.updateStory(model));
            mAssetUtil = new AssetUtil(mWorkspace);
        }

        mModelController.addUpdateCallback(mWebsocketController.updateStory);

        resize(mWidth, mHeight);

        await mSidebarController.updateModel(mModelController.getModel());
        await mSidebarController.navigate(mModelController.getModel().id);

        await updateModel();

        if (searchParams.get("assetViewId")) {
            await mStoryDisplayController.showAsset(searchParams.get("assetViewId"), mAssetUtil);
        }
    }

    async function updateModel() {
        let model = mModelController.getModel();
        await mAssetUtil.updateModel(model);
        await mAssetPicker.updateModel(model);

        await mTimelineController.updateModel(model);
        await mSidebarController.updateModel(model);
        await mStoryDisplayController.updateModel(model, mAssetUtil);
    }

    function resize(width, height) {
        mWidth = width;
        mHeight = height;

        mTimelineController.resize(Math.round(mWidth * mSidebarDivider), Math.round(mHeight * (1 - mTimelineDivider)));
        mSidebarController.resize(mWidth - Math.round(mWidth * mSidebarDivider), mHeight);

        let viewCanvasWidth = Math.round(mWidth * mSidebarDivider)
        let viewCanvasHeight = Math.round(mHeight * mTimelineDivider)

        mResizeTarget.style('left', (viewCanvasWidth - RESIZE_TARGET_SIZE / 2) + "px")
        mResizeTarget.style('top', (viewCanvasHeight - RESIZE_TARGET_SIZE / 2) + "px")

        mStoryDisplayController.resize(viewCanvasWidth, viewCanvasHeight);
    }

    async function pointerMove(screenCoords) {
        if (mResizingWindows) {
            mSidebarDivider = Util.limit(screenCoords.x / mWidth, 0.01, 0.99);
            mTimelineDivider = Util.limit(screenCoords.y / mHeight, 0.01, 0.99);
            resize(mWidth, mHeight);
        }

        await mStoryDisplayController.pointerMove(screenCoords);
    }

    async function pointerUp(screenCoords) {
        mResizingWindows = false;
        await mStoryDisplayController.pointerUp(screenCoords);
    }

    this.show = show;
    this.resize = resize;
    this.pointerMove = pointerMove;
    this.pointerUp = pointerUp;
}