
import { Data } from '../data.js';
import { AssetUtil } from '../utils/assets_util.js';
import { ModelController } from './controllers/model_controller.js';
import { StoryDisplayController } from './controllers/story_display_controller.js';

export function ViewerPage(parentContainer, mWebsocketController) {
    let mAssetUtil;
    let mWidth = 100;
    let mHeight = 100;

    let mModelController = null;

    let mViewContainer = parentContainer.append('div')
        .attr('id', 'canvas-view-container')
        .style('display', 'block')
        .style('border', '1px solid black')

    let mStoryDisplayController = new StoryDisplayController(mViewContainer, mWebsocketController);

    mWebsocketController.onStoryUpdate(async updates => {
        mModelController.removeUpdateCallback(mWebsocketController.updateStory);
        await mModelController.applyUpdates(updates);
        mModelController.addUpdateCallback(mWebsocketController.updateStory);
        updateModel();
    })

    async function show() {
        const searchParams = new URLSearchParams(window.location.search)
        const storyId = searchParams.get("story");
        if (!storyId) { console.error("Story not set!"); return; }
        mWebsocketController.connectToStory(storyId);
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

        resize(mWidth, mHeight);

        mWebsocketController.onStoryConnect(async (story) => {
            let mModel = Data.StoryModel.fromObject(story);
            mModelController = new ModelController(mModel);
            mModelController.addUpdateCallback(mWebsocketController.updateStory);
            await updateModel();
        })
    }

    async function updateModel() {
        let model = mModelController.getModel();
        await mAssetUtil.updateModel(model);
        await mStoryDisplayController.updateModel(model, mAssetUtil);
    }

    function resize(width, height) {
        mWidth = width;
        mHeight = height;

        mStoryDisplayController.resize(mWidth, mHeight);
    }

    async function pointerMove(screenCoords) {
        await mStoryDisplayController.pointerMove(screenCoords);
    }

    async function pointerUp(screenCoords) {
        await mStoryDisplayController.pointerUp(screenCoords);
    }

    this.show = show;
    this.resize = resize;
    this.pointerMove = pointerMove;
    this.pointerUp = pointerUp;
}