import { DataModel } from "../../data_model.js";
import { AssetSceneController } from './asset_scene_controller.js';
import { CanvasViewController } from './canvas_view_controller.js';
import { StoryWrapperController } from './story_scene_controller.js';
import { XRSessionController } from './xr_session_controller.js';

/**
 * Handles the display of the story, including the event handling and 
 * transitions between VR and canvas viewing. 
 * @param {*} parentContainer 
 */
export function StoryDisplayController(parentContainer) {
    let mExitAssetViewCallback = async () => { }
    let mMoveCallback = async () => { }
    let mMoveChainCallback = async () => { }

    let mModel = new DataModel();

    let mWidth = 100;
    let mHeight = 100;

    let isVR = false;

    let mAssetSceneController = new AssetSceneController();
    let mStoryWrapperController = new StoryWrapperController();

    let mExitAssetViewButton = parentContainer.append("button")
        .style('position', 'absolute')
        .style('top', '80px')
        .style('left', '20px')
        .html('x')
        .style("display", 'none')
        .on('click', async () => {
            mCanvasViewController.setScene(mStoryWrapperController);
            mXRSessionController.setScene(mStoryWrapperController);
            mExitAssetViewButton.style("display", 'none')
            await mExitAssetViewCallback();
        });

    let mCanvasViewController = new CanvasViewController(parentContainer);
    mCanvasViewController.setScene(mStoryWrapperController);
    mCanvasViewController.startRendering();

    let mXRSessionController = new XRSessionController(parentContainer);
    mXRSessionController.setScene(mStoryWrapperController);
    let vrButtonDiv = parentContainer.append("div")
        .style('position', 'absolute')
        .style('top', '40px')
        .style('left', '20px')
    vrButtonDiv.node().appendChild(mXRSessionController.getVRButton());
    d3.select(mXRSessionController.getVRButton()).style("position", "relative")

    mCanvasViewController.onMove(async (id, newPosition) => {
        await mMoveCallback(id, newPosition);
    })

    mCanvasViewController.onMoveChain(async (id, newPosition) => {
        await mMoveChainCallback(id, newPosition);
    })

    mXRSessionController.onSessionStart(() => {
        if (!isVR) {
            isVR = true;
            mCanvasViewController.stopRendering();
            mXRSessionController.startRendering();
        }
    })

    mXRSessionController.onSessionEnd(() => {
        if (isVR) {
            isVR = false;
            mCanvasViewController.startRendering();
            mXRSessionController.stopRendering();
        }
    })

    mXRSessionController.onMove(async (id, newPosition) => {
        await mMoveCallback(id, newPosition);
    })

    mXRSessionController.onMoveChain(async (id, newPosition) => {
        await mMoveChainCallback(id, newPosition);
    })


    async function updateModel(model, assetUtil) {
        await mAssetSceneController.updateModel(model, assetUtil);
        await mStoryWrapperController.updateModel(model, assetUtil);
    }

    async function showAsset(assetId, assetUtil) {
        await mAssetSceneController.showAsset(assetId, assetUtil);
        mCanvasViewController.setScene(mAssetSceneController);
        mXRSessionController.setScene(mAssetSceneController);
        mExitAssetViewButton.style('display', '')
    }

    function resize(width, height) {
        mWidth = width;
        mHeight = height;
        mCanvasViewController.resize(width, height);
    }

    function pointerMove(screenCoords) {
        mCanvasViewController.pointerMove(screenCoords);
    }

    function pointerUp(screenCoords) {
        mCanvasViewController.pointerUp(screenCoords);
    }

    this.updateModel = updateModel;
    this.showAsset = showAsset;
    this.resize = resize;
    this.pointerMove = pointerMove;
    this.pointerUp = pointerUp;
    this.onExitAssetView = (func) => mExitAssetViewCallback = func;
    this.onMove = (func) => mMoveCallback = func;
    this.onMoveChain = (func) => mMoveChainCallback = func;
}

