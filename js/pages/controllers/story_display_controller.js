import * as THREE from 'three';
import { DataModel } from "../../data_model.js";
import { CanvasViewController } from './canvas_view_controller.js';
import { XRSessionController } from './xr_session_controller.js';
import { AssetSceneController } from './asset_scene_controller.js';
import { StoryWrapperController } from './story_scene_controller.js';

/**
 * Handles the display of the story, including the event handling and 
 * transitions between VR and canvas viewing. 
 * @param {*} parentContainer 
 */
export function StoryDisplayController(parentContainer) {
    let mExitAssetViewCallback = async () => { }

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

    function onResize(width, height) {
        mWidth = width;
        mHeight = height;
        mCanvasViewController.onResize(width, height);
    }

    function onPointerMove(screenCoords) {
        mCanvasViewController.onPointerMove(screenCoords);
    }

    this.updateModel = updateModel;
    this.showAsset = showAsset;
    this.onResize = onResize;
    this.onPointerMove = onPointerMove;
    this.setExitAssetViewCallback = (func) => mExitAssetViewCallback = func;
}

