import * as THREE from "three";
import { EditMode } from "../../constants.js";
import { Data } from "../../data.js";
import { AssetSceneController } from './asset_scene_controller.js';
import { CanvasViewController } from './canvas_view_controller.js';
import { StorySceneController } from './story_scene_controller.js';
import { XRSessionController } from './xr_controllers/xr_session_controller.js';
import { AnnotationEditorController } from "./annotation_editor_controller.js";
import { MorpherSceneController } from "./morpher_scene_controller.js";

/**
 * Handles the display of the story, including the event handling and 
 * transitions between VR and canvas viewing. 
 * @param {*} parentContainer 
 */
export function StoryDisplayController(parentContainer, mWebsocketController) {
    let mExitAssetViewCallback = async () => { }
    let mTransformManyCallback = async () => { }
    let mTransformCallback = async () => { }
    let mUpdateTimelineCallback = async () => { }
    let mUpdateAnnotationImageCallback = async () => { }
    let mStartShareCallback = async () => { }

    let isVR = false;
    let mMode = EditMode.MODEL;

    let mAssetSceneController = new AssetSceneController();
    let mStorySceneController = new StorySceneController();
    let mMorpherSceneController = new MorpherSceneController();

    let mActiveScene = mMorpherSceneController;
    let mOtherUsers = {};

    let mXRSessionController = new XRSessionController(mWebsocketController);
    mXRSessionController.setSceneController(mActiveScene);
    let mCanvasViewController = new CanvasViewController(parentContainer, mWebsocketController);
    mCanvasViewController.setSceneController(mActiveScene);
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
            await setSceneController(mMorpherSceneController);
            mMode = EditMode.MODEL;
            mActiveController.setMode(mMode);
        });

    let mEditTimelineButton = parentContainer.append("button")
        .style('position', 'absolute')
        .style('top', '120px')
        .style('left', '20px')
        .html('Edit Timeline')
        .on('click', async () => {
            await setSceneController(mMorpherSceneController);
            mMode = EditMode.TIMELINE;
            mActiveController.setMode(mMode);
        });

    let mEditWorldButton = parentContainer.append("button")
        .style('position', 'absolute')
        .style('top', '160px')
        .style('left', '20px')
        .html('Edit World')
        .on('click', async () => {
            await setSceneController(mMorpherSceneController);
            mMode = EditMode.WORLD;
            mActiveController.setMode(mMode);
        });

    let mShareButton = parentContainer.append("button")
        .style('position', 'absolute')
        .style('top', '20px')
        .style('left', '190px')
        .html('Share')
        .on('click', async () => {
            await mStartShareCallback();
        });

    let mExitAssetViewButton = parentContainer.append("button")
        .style('position', 'absolute')
        .style('top', '200px')
        .style('left', '20px')
        .html('x')
        .style("display", 'none')
        .on('click', async () => {
            await setSceneController(mMorpherSceneController);
        });

    // this needs to go over the buttons
    let mAnnotationEditorController = new AnnotationEditorController(parentContainer);

    mCanvasViewController.onTransform(async (id, newPosition) => {
        await mTransformCallback(id, newPosition);
    })

    mCanvasViewController.onTransformMany(async (items) => {
        await mTransformManyCallback(items);
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
            mActiveController.setSceneController(mActiveScene);
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
            mActiveController.setSceneController(mActiveScene);
            mActiveController.setMode(mMode);
            mActiveController.setUserPositionAndDirection(pos, dir);
        }
    })

    mXRSessionController.onTransform(async (id, newPosition, newOrientation, newScale) => {
        await mTransformCallback(id, newPosition, newOrientation, newScale);
    })

    mXRSessionController.onTransformMany(async (items) => {
        await mTransformManyCallback(items);
    })

    mXRSessionController.onUpdateTimeline(async (line) => {
        await mUpdateTimelineCallback(line);
    })

    mAnnotationEditorController.onSave(async (id, json, dataUrl) => {
        await mUpdateAnnotationImageCallback(id, json, dataUrl);
    })

    mWebsocketController.onParticipantUpdate((id, head, handR, handL) => {
        try {
            if (mOtherUsers[id]) {
                if (head) {
                    mActiveScene.updateOtherUser(id, head, handR, handL);
                } else {
                    mActiveScene.removeOtherUser(id);
                }
            } else {
                if (head) {
                    mActiveScene.addOtherUser(id, head, handR, handL);
                    mOtherUsers[id] = true;
                }
            }
        } catch (error) {
            console.error(error);
        }
    })

    async function setSceneController(scene) {
        if (mActiveScene != scene) {
            mActiveController.setSceneController(scene);
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
        await mMorpherSceneController.updateModel(model, assetUtil);
    }

    async function showAsset(assetId, assetUtil) {
        await mAssetSceneController.showAsset(assetId, assetUtil);
        await setSceneController(mAssetSceneController);
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
    this.onTransform = (func) => mTransformCallback = func;
    this.onTransformMany = (func) => mTransformManyCallback = func;
    this.onUpdateTimeline = (func) => mUpdateTimelineCallback = func;
    this.onUpdateAnnotationImage = (func) => mUpdateAnnotationImageCallback = func;
    this.onStartShare = (func) => mStartShareCallback = func;
    this.hideShare = () => mShareButton.style("display", 'none');
}

