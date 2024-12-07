import * as THREE from "three";
import { Data } from "../../data.js";
import { CanvasViewController } from './canvas_view_controller.js';
import { PictureEditorController } from "./picture_editor_controller.js";
import { SceneController } from "./scene_controller.js";
import { XRSessionController } from './xr_controllers/xr_session_controller.js';
import { MenuController } from "./menu_controllers/menu_controller.js";
import { ItemButtons, MenuNavButtons, ToolButtons } from "../../constants.js";
import { IdUtil } from "../../utils/id_util.js";

/**
 * Handles the display of the story, including the event handling and 
 * transitions between VR and canvas viewing. 
 * @param {*} parentContainer 
 */
export function SessionController(parentContainer, mWebsocketController) {
    let mTransformManyCallback = async () => { }
    let mTransformCallback = async () => { }
    let mUpdatePictureImageCallback = async () => { }
    let mUpdateSphereImageCallback = async () => { }

    let isVR = false;

    let mSceneController = new SceneController();
    let mMenuController = new MenuController();
    let mOtherUsers = {};

    let mXRSessionController = new XRSessionController(mWebsocketController);
    mXRSessionController.setSceneController(mSceneController);
    let mCanvasViewController = new CanvasViewController(parentContainer, mWebsocketController);
    mCanvasViewController.setSceneController(mSceneController);
    mCanvasViewController.setMenuController(mMenuController);
    mCanvasViewController.startRendering();

    let mModel = new Data.StoryModel();
    let mToolMode = ToolButtons.MOVE;
    let mMomentId = null;

    // this needs to go over the buttons
    let mPictureEditorController = new PictureEditorController(parentContainer);

    mCanvasViewController.onTransform(async (id, newPosition) => {
        await mTransformCallback(id, newPosition);
    })

    mCanvasViewController.onTransformMany(async (items) => {
        await mTransformManyCallback(items);
    })

    mCanvasViewController.onMenuButtonClicked(menuButtonClicked)

    async function sessionStart(session) {
        await mXRSessionController.sessionStart(session);
        isVR = true;
        mCanvasViewController.stopRendering();
        mXRSessionController.startRendering();

        let { pos, dir } = mCanvasViewController.getUserPositionAndDirection();
        mXRSessionController.setUserPositionAndDirection(pos, dir);
        mXRSessionController.setMenuController(mMenuController);
    }

    mXRSessionController.onSessionEnd(() => {
        if (isVR) {
            isVR = false;
            mCanvasViewController.startRendering();
            mXRSessionController.stopRendering();

            let { pos, dir } = mXRSessionController.getUserPositionAndDirection();
            mCanvasViewController.setUserPositionAndDirection(pos, dir);
            mCanvasViewController.setMenuController(mMenuController);
        }
    })

    mXRSessionController.onTransform(async (id, newPosition, newOrientation, newScale) => {
        await mTransformCallback(id, newPosition, newOrientation, newScale);
    })

    mXRSessionController.onTransformMany(async (items) => {
        await mTransformManyCallback(items);
    })
    mXRSessionController.onMenuButtonClicked(menuButtonClicked);

    async function menuButtonClicked(target) {
        target.select();
        let buttonId = target.getId();
        let menuId = mMenuController.getCurrentMenuId();
        if (Object.values(ToolButtons).includes(buttonId)) {
            if (mToolMode == buttonId && buttonId != ToolButtons.MOVE) {
                buttonId = ToolButtons.MOVE;
            }
            mToolMode = buttonId;
            mMenuController.setMode(mToolMode);
        } else if (Object.values(MenuNavButtons).includes(buttonId)) {
            mMenuController.navigate(buttonId);
        } else if (Object.values(ItemButtons).includes(buttonId)) {
            console.error("Impliment me!")
        } else if (IdUtil.getClass(buttonId) == Data.Asset) {
            if (menuId == MenuNavButtons.SPHERE_IMAGE) {
                let moment = mModel.moments.find(m => m.id == mMomentId);
                if (!moment) { console.error("invalid moment id: " + mMomentId); return; }
                await mUpdateSphereImageCallback(moment.photosphereId, buttonId);
            } else {
                console.error("not implimented!!");
            }
        } else {
            console.error('Invalid button id: ' + buttonId);
        }
    }

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
        await mMenuController.updateModel(model, assetUtil);
    }

    function setCurrentMoment(momentId) {
        mSceneController.setCurrentMoment(momentId);
        mMomentId = momentId;
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
    this.setCurrentMoment = setCurrentMoment;
    this.resize = resize;
    this.pointerMove = pointerMove;
    this.pointerUp = pointerUp;
    this.sessionStart = sessionStart;
    this.editPicture = async (id, json) => await mPictureEditorController.show(id, json);
    this.closeEditPicture = async () => await mPictureEditorController.hide();
    this.onTransform = (func) => mTransformCallback = func;
    this.onTransformMany = (func) => mTransformManyCallback = func;
    this.onUpdatePictureImage = (func) => mUpdatePictureImageCallback = func;
    this.onUpdateSphereImage = (func) => mUpdateSphereImageCallback = func;
}

