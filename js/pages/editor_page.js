
import { AssetTypes } from '../constants.js';
import { Data } from '../data_structs.js';
import { AssetUtil } from '../utils/assets_util.js';
import { IdUtil } from '../utils/id_util.js';
import { Util } from '../utils/utility.js';
import { ModelController } from './controllers/model_controller.js';
import { SidebarController } from './controllers/sidebar_controller.js';
import { StoryDisplayController } from './controllers/story_display_controller.js';
import { TimelineController } from './controllers/timeline_controller.js';
import { AssetPicker } from './editor_panels/asset_picker.js';

export function EditorPage(parentContainer) {
    console.log('cache loaded models?')
    console.log('enable the click thing in the canvas viewer to bring it up in the sidebar')



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

    let mMomentDisplay = mMainContainer.append('div')
        .attr('id', 'moment-display')
        .style('display', 'flex')
        .style('flex-direction', 'column');

    let mViewContainer = mMomentDisplay.append('div')
        .attr('id', 'canvas-view-container')
        .style('display', 'block')
        .style('border', '1px solid black')

    let mTimelineContainer = mMomentDisplay.append('div')
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

    let mStoryDisplayController = new StoryDisplayController(mViewContainer);
    mStoryDisplayController.onMove(async (id, newPosition) => {
        await mModelController.updatePosition(id, newPosition);
        await updateModel();
    });

    mStoryDisplayController.onMoveChain(async (items) => {
        await mModelController.updatePositionsAndOrientations(items);
        await updateModel();
    });

    let mAssetPicker = new AssetPicker(parentContainer);
    mAssetPicker.setNewAssetCallback(async (fileHandle, type) => {
        let filename = await mWorkspace.storeAsset(fileHandle);
        let asset = null;
        if (type == AssetTypes.MODEL) {
            asset = await mAssetUtil.loadGLTFModel(filename);
        }
        return await mModelController.createAsset(fileHandle.name, filename, type, asset);
    })

    let mTimelineController = new TimelineController(mTimelineContainer);
    mTimelineController.setCreateMomentCallback(async () => {
        await mModelController.createMoment();
        await updateModel();
    })

    let mSidebarController = new SidebarController(mSidebarContainer);
    mSidebarController.setAddCallback(async (parentId, itemClass, config) => {
        // should be undo/redo stuff here.

        if ((IdUtil.getClass(parentId) == Data.Story || IdUtil.getClass(parentId) == Data.Moment)
            && itemClass == Data.Annotation) {
            await mModelController.createAnnotation(parentId);
        } else if (IdUtil.getClass(parentId) == Data.Story && itemClass == Data.Moment) {
            await mModelController.createMoment();
        } else if (itemClass == Data.Model3D) {
            let assetId = await mAssetPicker.showOpenAssetPicker(mModelController.getModel());
            if (assetId) {
                await mModelController.createModel3D(parentId, assetId);
            }
        } else {
            console.error("Parent + item class not supported", parentId, itemClass);
            return;
        }
        await updateModel();
    })
    mSidebarController.setUpdateAttributeCallback(async (id, attr, value) => {
        await mModelController.setAttribute(id, attr, value);
        await updateModel();
    })
    mSidebarController.setDeleteCallback(async (id) => {
        await mModelController.deleteItem(id);
        await updateModel();
    })
    mSidebarController.setSelectAsset(async () => {
        return await mAssetPicker.showOpenAssetPicker(mModelController.getModel());
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

    async function show(workspace) {
        mWorkspace = workspace;

        const searchParams = new URLSearchParams(window.location.search)
        const storyId = searchParams.get("story");
        if (!storyId) { console.error("Story not set!"); return; }

        mModelController = new ModelController(storyId, workspace);
        await mModelController.init();
        mAssetUtil = new AssetUtil(mWorkspace);

        resize(mWidth, mHeight);

        await mSidebarController.updateModel(mModelController.getModel());
        await mSidebarController.navigate(mModelController.getModel().getStory().id);

        await updateModel();

        if (searchParams.get("assetViewId")) {
            await mStoryDisplayController.showAsset(searchParams.get("assetViewId"), mAssetUtil);
        }
    }

    async function updateModel() {
        let model = mModelController.getModel();
        await mAssetUtil.updateModel(model);

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

    function pointerMove(screenCoords) {
        if (mResizingWindows) {
            mSidebarDivider = Util.limit(screenCoords.x / mWidth, 0.01, 0.99);
            mTimelineDivider = Util.limit(screenCoords.y / mHeight, 0.01, 0.99);
            resize(mWidth, mHeight);
        }

        mStoryDisplayController.pointerMove(screenCoords);
    }

    function pointerUp(screenCoords) {
        mResizingWindows = false;

        mStoryDisplayController.pointerUp(screenCoords);
    }

    this.show = show;
    this.resize = resize;
    this.pointerMove = pointerMove;
    this.pointerUp = pointerUp;
}