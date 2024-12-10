import * as THREE from "three";
import { ASSET_UPDATE, BrushToolButtons, InteractionType, ItemButtons, MenuNavButtons, SurfaceToolButtons, ToolButtons } from "../../constants.js";
import { Data } from "../../data.js";
import { IdUtil } from "../../utils/id_util.js";
import { Util } from "../../utils/utility.js";
import { HelperPointController } from "./helper_point_controller.js";
import { MenuController } from "./menu_controllers/menu_controller.js";
import { ModelUpdate } from "./model_controller.js";
import { PageSessionController } from './page_session_controller.js';
import { SceneController } from "./scene_controller.js";
import { ToolMode } from "./system_state.js";
import { BrushToolHandler } from "./tool_handlers/brush_tool_handler.js";
import { MoveToolHandler } from "./tool_handlers/move_tool_handler.js";
import { XRSessionController } from './xr_controllers/xr_session_controller.js';

/**
 * Handles the display of the story, including the event handling and 
 * transitions between VR and canvas viewing. 
 * @param {*} parentContainer 
 */
export function SceneInterfaceController(parentContainer, mWebsocketController) {
    let mModelUpdateCallback = async () => { }
    let mAssetUpdateCallback = async () => { }

    let isVR = false;

    let mInteractionState = {
        type: InteractionType.NONE,
        data: {},
        primaryHovered: null,
        secondaryHovered: null,
    }

    let mModel = new Data.StoryModel();
    let mToolMode = new ToolMode();
    let mMomentId = null;

    let mSceneController = new SceneController();
    let mMenuController = new MenuController();
    mMenuController.setToolMode(mToolMode);
    let mOtherUsers = {};

    let mXRSessionController = new XRSessionController();
    let mPageSessionController = new PageSessionController(parentContainer);
    let mCurrentSessionController = mPageSessionController;

    let mHelperPointController = new HelperPointController(mSceneController.getScene());

    async function setCurrentSession(controller) {
        let scene = mSceneController.getScene();

        scene.remove(mCurrentSessionController.getObject());
        mCurrentSessionController.getRenderer().setAnimationLoop(null);
        let { pos, dir } = mCurrentSessionController.getUserPositionAndDirection();

        scene.add(controller.getObject());
        mMenuController.setContainer(...controller.getMenuContainers())
        controller.getRenderer().setAnimationLoop(render);
        controller.setUserPositionAndDirection(pos, dir);
        mCurrentSessionController = controller;
    }

    async function render(time) {
        if (time < 0) return;

        mCurrentSessionController.getRenderer().render(
            mSceneController.getScene(),
            mCurrentSessionController.getCamera());

        await mCurrentSessionController.render();
        mMenuController.render();
    }

    async function sessionStart(session) {
        await mXRSessionController.sessionStart(session);
        isVR = true;
        setCurrentSession(mXRSessionController);
    }

    mXRSessionController.onSessionEnd(() => {
        if (isVR) {
            isVR = false;
            setCurrentSession(mPageSessionController);
        }
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

    mXRSessionController.onUserMoved((head, handR, handL) => {
        mWebsocketController.updateParticipant(head, handR, handL);
    })
    mPageSessionController.onUserMoved((head) => {
        mWebsocketController.updateParticipant(head);
    })

    mPageSessionController.onPointerMove(onPointerMove);
    mXRSessionController.onPointerMove(onPointerMove);
    async function onPointerMove(raycaster = null, isPrimary = true) {
        // unhighlight evertying. 
        (isPrimary ? mInteractionState.primaryHovered : mInteractionState.secondaryHovered)?.idle(mToolMode);
        isPrimary ? mInteractionState.primaryHovered = null : mInteractionState.secondaryHovered = null;
        mHelperPointController.hidePoint(isPrimary);

        let menuTargets = mInteractionState.type == InteractionType.NONE ?
            mMenuController.getTargets(raycaster, mToolMode) : [];
        if (menuTargets.length > 0) {
            let closest = Util.getClosestTarget(raycaster.ray, menuTargets);
            closest.highlight(mToolMode);
            mHelperPointController.showPoint(isPrimary, closest.getIntersection().point);

            if (isPrimary) {
                mInteractionState.primaryHovered = closest;
            } else {
                mInteractionState.secondaryHovered = closest;
            }

            mCurrentSessionController.hovered(true, isPrimary);
        } else {
            let handler = getToolHandler(mToolMode.tool)
            if (!handler) { console.error("Tool not handled: " + mToolMode.tool); return; }
            handler.pointerMove(
                raycaster,
                isPrimary,
                mInteractionState,
                mToolMode,
                mCurrentSessionController,
                mSceneController,
                mHelperPointController)
        }

    }

    mPageSessionController.onPointerDown(onPointerDown);
    mXRSessionController.onPointerDown(onPointerDown);
    function onPointerDown(raycaster, isPrimary = true) {
        let hovered = isPrimary ? mInteractionState.primaryHovered : mInteractionState.secondaryHovered;
        if (!hovered) {
            // nothing to do. 
            return;
        } else if (hovered.isButton()) {
            menuButtonClicked(hovered);
        } else {
            let handler = getToolHandler(mToolMode.tool)
            if (!handler) { console.error("Tool not handled: " + mToolMode.tool); return; }
            handler.pointerDown(
                raycaster,
                isPrimary,
                mInteractionState,
                mToolMode,
                mCurrentSessionController,
                mSceneController,
                mHelperPointController);
        }
    }

    mPageSessionController.onPointerUp(onPointerUp);
    mXRSessionController.onPointerUp(onPointerUp);
    async function onPointerUp(raycaster, isPrimary) {
        let handler = getToolHandler(mToolMode.tool)
        if (!handler) { console.error("Tool not handled: " + mToolMode.tool); return; }
        let updates = handler.pointerUp(
            raycaster,
            isPrimary,
            mInteractionState,
            mToolMode,
            mCurrentSessionController,
            mSceneController,
            mHelperPointController);

        let modelUpdates = updates.filter(u => u instanceof ModelUpdate)
        if (modelUpdates.length > 0) await mModelUpdateCallback(modelUpdates);

        let assetUpdates = updates.filter(u => u.command == ASSET_UPDATE);
        for (let update of assetUpdates) {
            await mAssetUpdateCallback(update.id, await update.dataPromise)
        };
    }

    async function menuButtonClicked(target) {
        target.select(mToolMode);
        let buttonId = target.getId();
        let menuId = mMenuController.getCurrentMenuId();
        if (Object.values(ToolButtons).includes(buttonId)) {
            if (mToolMode.tool == buttonId && buttonId != ToolButtons.MOVE) {
                buttonId = ToolButtons.MOVE;
            }
            mToolMode.tool = buttonId;
            mMenuController.setToolMode(mToolMode);
            if (mToolMode.tool == ToolButtons.BRUSH) {
                mMenuController.showSubMenu(ToolButtons.BRUSH);
            } else if (mToolMode.tool == ToolButtons.SURFACE) {
                mMenuController.showSubMenu(ToolButtons.SURFACE);
            } else {
                mMenuController.showSubMenu(null);
            }
        } else if (Object.values(BrushToolButtons).includes(buttonId)) {
            mToolMode.brushSettings.mode = buttonId;
            mMenuController.setToolMode(mToolMode);
        } else if (Object.values(SurfaceToolButtons).includes(buttonId)) {
            mToolMode.surfaceSettings.mode = buttonId;
            mMenuController.setToolMode(mToolMode);
        } else if (Object.values(MenuNavButtons).includes(buttonId)) {
            mMenuController.showMenu(buttonId);
        } else if (Object.values(ItemButtons).includes(buttonId)) {
            console.error("Impliment me!")
        } else if (IdUtil.getClass(buttonId) == Data.Asset) {
            if (menuId == MenuNavButtons.SPHERE_IMAGE) {
                let moment = mModel.moments.find(m => m.id == mMomentId);
                if (!moment) { console.error("invalid moment id: " + mMomentId); return; }
                await mModelUpdateCallback([new ModelUpdate({ id: moment.photosphereId, imageAssetId: buttonId })]);
            } else {
                console.error("not implimented!!");
            }
        } else {
            console.error('Invalid button id: ' + buttonId);
        }
    }

    function getToolHandler(tool) {
        if (tool == ToolButtons.MOVE) {
            return MoveToolHandler;
        } else if (tool == ToolButtons.BRUSH) {
            return BrushToolHandler
        } else {
            console.error('Tool not handled.')
        }
    }

    async function updateModel(model, assetUtil) {
        if (mModel.id != model.id) {
            let dir = new THREE.Vector3(0, 0, -1);
            let pos = new THREE.Vector3(0, 0, 0);
            if (isVR) mXRSessionController.setUserPositionAndDirection(pos, dir)
            else mPageSessionController.setUserPositionAndDirection(pos, dir)
        }

        mModel = model;
        await mSceneController.updateModel(model, assetUtil);
        await mMenuController.updateModel(model, assetUtil);
    }

    function resize(width, height) {
        mPageSessionController.resize(width, height);
    }

    async function setCurrentMoment(momentId) {
        await mSceneController.setCurrentMoment(momentId);
        mMomentId = momentId;
    }

    setCurrentSession(mPageSessionController);

    this.updateModel = updateModel;
    this.resize = resize;
    this.setCurrentMoment = setCurrentMoment;
    this.sessionStart = sessionStart;
    this.onModelUpdate = (func) => mModelUpdateCallback = func;
    this.onAssetUpdate = (func) => mAssetUpdateCallback = func;
}

