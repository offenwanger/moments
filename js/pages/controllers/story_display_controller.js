import * as THREE from "three";
import { Data } from "../../data.js";
import { CanvasViewController } from './canvas_view_controller.js';
import { PictureEditorController } from "./picture_editor_controller.js";
import { SceneController } from "./scene_controller.js";
import { XRSessionController } from './xr_controllers/xr_session_controller.js';

/**
 * Handles the display of the story, including the event handling and 
 * transitions between VR and canvas viewing. 
 * @param {*} parentContainer 
 */
export function StoryDisplayController(parentContainer, mWebsocketController) {
    let mTransformManyCallback = async () => { }
    let mTransformCallback = async () => { }
    let mUpdatePictureImageCallback = async () => { }
    let mStartShareCallback = async () => { }

    let isVR = false;

    let mSceneController = new SceneController();
    let mOtherUsers = {};

    let mXRSessionController = new XRSessionController(mWebsocketController);
    mXRSessionController.setSceneController(mSceneController);
    let mCanvasViewController = new CanvasViewController(parentContainer, mWebsocketController);
    mCanvasViewController.setSceneController(mSceneController);
    mCanvasViewController.startRendering();

    let mModel = new Data.StoryModel();

    let mShareButton = parentContainer.append("button")
        .style('position', 'absolute')
        .style('top', '20px')
        .style('left', '190px')
        .html('Share')
        .on('click', async () => {
            await mStartShareCallback();
        });

    // this needs to go over the buttons
    let mPictureEditorController = new PictureEditorController(parentContainer);

    mCanvasViewController.onTransform(async (id, newPosition) => {
        await mTransformCallback(id, newPosition);
    })

    mCanvasViewController.onTransformMany(async (items) => {
        await mTransformManyCallback(items);
    })

    async function sessionStart(session) {
        await mXRSessionController.sessionStart(session);
        isVR = true;
        mCanvasViewController.stopRendering();
        mXRSessionController.startRendering();

        let { pos, dir } = mCanvasViewController.getUserPositionAndDirection();
        mXRSessionController.setUserPositionAndDirection(pos, dir);
    }

    mXRSessionController.onSessionEnd(() => {
        if (isVR) {
            isVR = false;
            mCanvasViewController.startRendering();
            mXRSessionController.stopRendering();

            let { pos, dir } = mXRSessionController.getUserPositionAndDirection();
            mCanvasViewController.setUserPositionAndDirection(pos, dir);
        }
    })

    mXRSessionController.onTransform(async (id, newPosition, newOrientation, newScale) => {
        await mTransformCallback(id, newPosition, newOrientation, newScale);
    })

    mXRSessionController.onTransformMany(async (items) => {
        await mTransformManyCallback(items);
    })

    mPictureEditorController.onSave(async (id, json, dataUrl) => {
        await mUpdatePictureImageCallback(id, json, dataUrl);
    })

    mWebsocketController.onParticipantUpdate((id, head, handR, handL) => {
        try {
            if (mOtherUsers[id]) {
                if (head) {
                    mSceneController.updateOtherUser(id, head, handR, handL);
                } else {
                    mSceneController.removeOtherUser(id);
                }
            } else {
                if (head) {
                    mSceneController.addOtherUser(id, head, handR, handL);
                    mOtherUsers[id] = true;
                }
            }
        } catch (error) {
            console.error(error);
        }
    })

    async function updateModel(model, assetUtil) {
        if (mModel.id != model.id) {
            let dir = new THREE.Vector3(0, 0, -1);
            let pos = new THREE.Vector3(0, 0, 0);
            if (isVR) mXRSessionController.setUserPositionAndDirection(pos, dir)
            else mCanvasViewController.setUserPositionAndDirection(pos, dir)
        }

        mModel = model;
        await mSceneController.updateModel(model, assetUtil);
    }

    function resize(width, height) {
        mCanvasViewController.resize(width, height);
        mPictureEditorController.resize(width, height);
    }

    async function pointerMove(screenCoords) {
        await mCanvasViewController.pointerMove(screenCoords);
    }

    async function pointerUp(screenCoords) {
        await mCanvasViewController.pointerUp(screenCoords);
    }

    this.updateModel = updateModel;
    this.setCurrentMoment = mSceneController.setCurrentMoment;
    this.resize = resize;
    this.pointerMove = pointerMove;
    this.pointerUp = pointerUp;
    this.sessionStart = sessionStart;
    this.editPicture = async (id, json) => await mPictureEditorController.show(id, json);
    this.closeEditPicture = async () => await mPictureEditorController.hide();
    this.onTransform = (func) => mTransformCallback = func;
    this.onTransformMany = (func) => mTransformManyCallback = func;
    this.onUpdatePictureImage = (func) => mUpdatePictureImageCallback = func;
    this.onStartShare = (func) => mStartShareCallback = func;
    this.hideShare = () => mShareButton.style("display", 'none');
}

