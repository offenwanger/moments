import * as THREE from "three";
import { EditMode } from "../../constants.js";
import { Data } from "../../data.js";
import { AssetSceneController } from './asset_scene_controller.js';
import { CanvasViewController } from './canvas_view_controller.js';
import { StorySceneController } from './story_scene_controller.js';
import { XRSessionController } from './xr_session_controller.js';
import { AnnotationEditorController } from "./annotation_editor_controller.js";

/**
 * Handles the display of the story, including the event handling and 
 * transitions between VR and canvas viewing. 
 * @param {*} parentContainer 
 */
export function StoryDisplayController(parentContainer) {
    let mExitAssetViewCallback = async () => { }
    let mMoveCallback = async () => { }
    let mMoveChainCallback = async () => { }
    let mUpdateTimelineCallback = async () => { }
    let mUpdateAnnotationImageCallback = async () => { }

    let isVR = false;
    let mMode = EditMode.MODEL;

    let mAssetSceneController = new AssetSceneController();
    let mStorySceneController = new StorySceneController();

    let mActiveScene = mStorySceneController;

    let mXRSessionController = new XRSessionController(parentContainer);
    mXRSessionController.setScene(mActiveScene);
    let mCanvasViewController = new CanvasViewController(parentContainer);
    mCanvasViewController.setScene(mActiveScene);
    mCanvasViewController.setMode(mMode)
    mCanvasViewController.startRendering();

    let mModel = new Data.StoryModel();

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
            await setScene(mStorySceneController);
            mMode = EditMode.MODEL;
            mActiveController.setMode(mMode);
        });

    let mEditTimelineButton = parentContainer.append("button")
        .style('position', 'absolute')
        .style('top', '120px')
        .style('left', '20px')
        .html('Edit Timeline')
        .on('click', async () => {
            await setScene(mStorySceneController);
            mMode = EditMode.TIMELINE;
            mActiveController.setMode(mMode);
        });

    let mEditWorldButton = parentContainer.append("button")
        .style('position', 'absolute')
        .style('top', '160px')
        .style('left', '20px')
        .html('Edit World')
        .on('click', async () => {
            await setScene(mStorySceneController);
            mMode = EditMode.WORLD;
            mActiveController.setMode(mMode);
        });

    let mExitAssetViewButton = parentContainer.append("button")
        .style('position', 'absolute')
        .style('top', '200px')
        .style('left', '20px')
        .html('x')
        .style("display", 'none')
        .on('click', async () => {
            await setScene(mStorySceneController);
        });

    // this needs to go over the buttons
    let mAnnotationEditorController = new AnnotationEditorController(parentContainer);

    mCanvasViewController.onMove(async (id, newPosition) => {
        await mMoveCallback(id, newPosition);
    })

    mCanvasViewController.onMoveChain(async (id, newPosition) => {
        await mMoveChainCallback(id, newPosition);
    })

    mCanvasViewController.onUpdateTimeline(async (line) => {
        await mUpdateTimelineCallback(line);
    })

    mXRSessionController.onSessionStart(() => {
        if (!isVR) {
            isVR = true;
            mCanvasViewController.stopRendering();
            mXRSessionController.startRendering();
            let { pos, dir } = mActiveController.getUserPositionAndDirection();
            mActiveController = mXRSessionController;
            mActiveController.setScene(mActiveScene);
            mActiveController.setMode(mMode);
            mActiveController.setUserPositionAndDirection(pos, dir);

        }
    })

    mXRSessionController.onSessionEnd(() => {
        if (isVR) {
            isVR = false;
            mCanvasViewController.startRendering();
            mXRSessionController.stopRendering();
            let { pos, dir } = mActiveController.getUserPositionAndDirection();
            mActiveController = mCanvasViewController;
            mActiveController.setScene(mActiveScene);
            mActiveController.setMode(mMode);
            mActiveController.setUserPositionAndDirection(pos, dir);
        }
    })

    mXRSessionController.onMove(async (id, newPosition) => {
        await mMoveCallback(id, newPosition);
    })

    mXRSessionController.onMoveChain(async (id, newPosition) => {
        await mMoveChainCallback(id, newPosition);
    })

    mXRSessionController.onUpdateTimeline(async (line) => {
        await mUpdateTimelineCallback(line);
    })

    mAnnotationEditorController.onSave(async (id, json, dataUrl) => {
        await mUpdateAnnotationImageCallback(id, json, dataUrl);
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
        if (mModel.id != model.id) {
            let timeline = mModel.timeline;
            if (timeline.length < 2) { console.error('Invalid timeline'); return; }

            let pos = new THREE.Vector3(timeline[0].x, timeline[0].y, timeline[0].z);
            let pos2 = new THREE.Vector3(timeline[1].x, timeline[1].y, timeline[1].z);
            let dir = new THREE.Vector3().subVectors(pos2, pos).normalize();
            mActiveController.setUserPositionAndDirection(pos, dir)
        }

        mModel = model;
        await mAssetSceneController.updateModel(model, assetUtil);
        await mStorySceneController.updateModel(model, assetUtil);
    }

    async function showAsset(assetId, assetUtil) {
        await mAssetSceneController.showAsset(assetId, assetUtil);
        await setScene(mAssetSceneController);
        mActiveController.setUserPositionAndDirection(new Vector3(0, 0, 0), new Vector3(0, 0, -1));
    }

    function resize(width, height) {
        mCanvasViewController.resize(width, height);
        mAnnotationEditorController.resize(width, height);
    }

    async function pointerMove(screenCoords) {
        await mCanvasViewController.pointerMove(screenCoords);
    }

    async function pointerUp(screenCoords) {
        await mCanvasViewController.pointerUp(screenCoords);
    }

    this.updateModel = updateModel;
    this.showAsset = showAsset;
    this.resize = resize;
    this.pointerMove = pointerMove;
    this.pointerUp = pointerUp;
    this.editAnnotation = async (id, json) => await mAnnotationEditorController.show(id, json);
    this.closeEditAnnotation = async () => await mAnnotationEditorController.hide();
    this.onExitAssetView = (func) => mExitAssetViewCallback = func;
    this.onMove = (func) => mMoveCallback = func;
    this.onMoveChain = (func) => mMoveChainCallback = func;
    this.onUpdateTimeline = (func) => mUpdateTimelineCallback = func;
    this.onUpdateAnnotationImage = (func) => mUpdateAnnotationImageCallback = func;
}

