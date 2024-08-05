import { EditMode } from "../../constants.js";
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

    let isVR = false;
    let mMode = EditMode.MODEL;

    let mAssetSceneController = new AssetSceneController();
    let mStoryWrapperController = new StoryWrapperController();

    let mActiveScene = mStoryWrapperController;

    let mXRSessionController = new XRSessionController(parentContainer);
    mXRSessionController.setScene(mActiveScene);
    let mCanvasViewController = new CanvasViewController(parentContainer);
    mCanvasViewController.setScene(mActiveScene);
    mCanvasViewController.setMode(mMode)
    mCanvasViewController.startRendering();

    let mActiveController = mCanvasViewController;

    let vrButtonDiv = parentContainer.append("div")
        .style('position', 'absolute')
        .style('top', '40px')
        .style('left', '20px')
    vrButtonDiv.node().appendChild(mXRSessionController.getVRButton());
    d3.select(mXRSessionController.getVRButton()).style("position", "relative")

    let mEditModelsButton = parentContainer.append("button")
        .style('position', 'absolute')
        .style('top', '80px')
        .style('left', '20px')
        .html('Edit Models')
        .on('click', async () => {
            await setScene(mStoryWrapperController);
            mActiveController.setMode(EditMode.MODEL);
        });

    let mEditTimelineButton = parentContainer.append("button")
        .style('position', 'absolute')
        .style('top', '120px')
        .style('left', '20px')
        .html('Edit Timeline')
        .on('click', async () => {
            await setScene(mStoryWrapperController);
            mActiveController.setMode(EditMode.TIMELINE);
        });

    let mEditWorldButton = parentContainer.append("button")
        .style('position', 'absolute')
        .style('top', '160px')
        .style('left', '20px')
        .html('Edit World')
        .on('click', async () => {
            await setScene(mStoryWrapperController);
            mActiveController.setMode(EditMode.WORLD);
        });

    let mExitAssetViewButton = parentContainer.append("button")
        .style('position', 'absolute')
        .style('top', '200px')
        .style('left', '20px')
        .html('x')
        .style("display", 'none')
        .on('click', async () => {
            await setScene(mStoryWrapperController);
        });

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
            mActiveController = mXRSessionController;
            mActiveController.setScene(mActiveScene);
            mActiveController.setMode(mMode);
        }
    })

    mXRSessionController.onSessionEnd(() => {
        if (isVR) {
            isVR = false;
            mCanvasViewController.startRendering();
            mXRSessionController.stopRendering();
            mActiveController = mCanvasViewController;
            mActiveController.setScene(mActiveScene);
            mActiveController.setMode(mMode);
        }
    })

    mXRSessionController.onMove(async (id, newPosition) => {
        await mMoveCallback(id, newPosition);
    })

    mXRSessionController.onMoveChain(async (id, newPosition) => {
        await mMoveChainCallback(id, newPosition);
    })

    async function setScene(scene) {
        if (mActiveScene != scene) {
            mActiveController.setScene(scene);
            if (mActiveScene == mAssetSceneController) { await mExitAssetViewCallback(); }
            mActiveScene = scene;

            if (scene == mAssetSceneController) {
                mExitAssetViewButton.style('display', '')
            } else {
                mExitAssetViewButton.style("display", 'none')
            }
        }
    }

    async function updateModel(model, assetUtil) {
        await mAssetSceneController.updateModel(model, assetUtil);
        await mStoryWrapperController.updateModel(model, assetUtil);
    }

    async function showAsset(assetId, assetUtil) {
        await mAssetSceneController.showAsset(assetId, assetUtil);
        await setScene(mAssetSceneController);
    }

    function resize(width, height) {
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

