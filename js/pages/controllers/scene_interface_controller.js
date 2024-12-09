import * as THREE from "three";
import { InteractionType, ItemButtons, MenuNavButtons, ToolButtons } from "../../constants.js";
import { Data } from "../../data.js";
import { CanvasUtil } from "../../utils/canvas_util.js";
import { IdUtil } from "../../utils/id_util.js";
import { MenuController } from "./menu_controllers/menu_controller.js";
import { ModelUpdate } from "./model_controller.js";
import { PageSessionController } from './page_session_controller.js';
import { SceneController } from "./scene_controller.js";
import { XRSessionController } from './xr_controllers/xr_session_controller.js';

/**
 * Handles the display of the story, including the event handling and 
 * transitions between VR and canvas viewing. 
 * @param {*} parentContainer 
 */
export function SceneInterfaceController(parentContainer, mWebsocketController) {
    let mTransformManyCallback = async () => { }
    let mTransformCallback = async () => { }
    let mUpdateSphereImageCallback = async () => { }

    let isVR = false;

    let mInteractionState = {
        type: InteractionType.NONE,
        data: {},
        primaryHovered: null,
        secondaryHovered: null,
    }

    let mIKSolver;
    let mCCDIKHelper;
    const mPrimaryPoint = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(CanvasUtil.generateDotCanvas()),
        sizeAttenuation: false,
        depthTest: false
    }));
    mPrimaryPoint.scale.set(0.015, 0.015, 1);
    mPrimaryPoint.renderOrder = Infinity;
    const mSecondaryPoint = mPrimaryPoint.clone();


    let mSceneController = new SceneController();
    let mMenuController = new MenuController();
    let mOtherUsers = {};

    let mXRSessionController = new XRSessionController();
    let mPageSessionController = new PageSessionController(parentContainer);
    let mCurrentSessionController = mPageSessionController;

    let mModel = new Data.StoryModel();
    let mToolMode = ToolButtons.MOVE;
    let mMomentId = null;

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
        (isPrimary ? mInteractionState.primaryHovered : mInteractionState.secondaryHovered)?.idle();
        isPrimary ? mInteractionState.primaryHovered = null : mInteractionState.secondaryHovered = null;
        (isPrimary ? mPrimaryPoint : mSecondaryPoint).visible = false;

        if (!raycaster) {
            // unhighlight things, hide interface stuff, that's it.
            return;
        }

        if (mInteractionState.type == InteractionType.NONE ||
            (mInteractionState.type == InteractionType.ONE_HAND_MOVE && !isPrimary)) {
            // if none, update the hover. 
            let targets = mMenuController.getTargets(raycaster);
            if (targets.length == 0) {
                targets = mSceneController.getTargets(raycaster)
                if (mInteractionState.type == InteractionType.ONE_HAND_MOVE) {
                    // If we are already moving something, then the only valid targets
                    // the dragged object or bones belonging to it. 
                    targets = targets.filter(t =>
                        t.getRoot().getId() == mInteractionState.data.rootTarget.getId());
                }
            };
            if (targets.length == 0) {
                mCurrentSessionController.hovered(false, isPrimary)
            } else {
                let closest = getClosestTarget(raycaster.ray, targets);
                closest.highlight();
                placePoint(isPrimary, closest.getIntersection());
                if (isPrimary) {
                    mInteractionState.primaryHovered = closest;
                } else {
                    mInteractionState.secondaryHovered = closest;
                }
                mCurrentSessionController.hovered(true, isPrimary)
            }
        } else if (mInteractionState.type == InteractionType.ONE_HAND_MOVE) {

            let fromRay = mInteractionState.data.startRay;
            let toRay = raycaster.ray;

            let rotation = new THREE.Quaternion().setFromUnitVectors(fromRay.direction, toRay.direction);
            let newOrientation = new THREE.Quaternion().copy(mInteractionState.data.startOrientation)
            // .applyQuaternion(rotation);
            let newPosition = new THREE.Vector3().copy(mInteractionState.data.startPosition)
                .sub(fromRay.origin).applyQuaternion(rotation).add(toRay.origin);

            mInteractionState.data.rootTarget.setWorldPosition(newPosition);
            mInteractionState.data.rootTarget.setLocalOrientation(newOrientation);
        } else if (mInteractionState.type == InteractionType.TWO_HAND_MOVE) {
            if (isPrimary) {
                let fromRay = mInteractionState.data.primaryStartRay;
                let toRay = raycaster.ray;
                let primaryRotation = new THREE.Quaternion().setFromUnitVectors(fromRay.direction, toRay.direction);
                let primary = new THREE.Vector3().copy(mInteractionState.data.secondaryStartPosition)
                    .sub(fromRay.origin).applyQuaternion(primaryRotation).add(toRay.origin);
                let secondary = mInteractionState.data.secondaryPos;
                let midpoint = new THREE.Vector3().addVectors(primary, secondary).multiplyScalar(0.5);

                let newDirection = new THREE.Vector3().subVectors(primary, secondary).normalize();
                let rotation = new THREE.Quaternion().setFromUnitVectors(mInteractionState.data.direction, newDirection);

                let newOrienatation = new THREE.Quaternion().multiplyQuaternions(rotation, mInteractionState.data.originalRotation)
                mInteractionState.data.rootTarget.setLocalOrientation(newOrienatation);

                let dist = new THREE.Vector3().subVectors(primary, secondary).length();
                let newScale = mInteractionState.data.originalScale * (dist / mInteractionState.data.dist)
                mInteractionState.data.rootTarget.setScale(newScale);

                // the original position, translated by the change in the position of the midpoint, 
                // translated to offset the scale
                // and then rotated around the midpoint

                let newPosition = new THREE.Vector3().copy(midpoint)
                newPosition.addScaledVector(mInteractionState.data.targetMidpointOffset, newScale);
                newPosition = Util.pivot(newPosition, midpoint, rotation);
                mInteractionState.data.rootTarget.setWorldPosition(newPosition);
            } else {
                let fromRay = mInteractionState.data.secondaryStartRay;
                let toRay = raycaster.ray;
                let rotation = new THREE.Quaternion().setFromUnitVectors(fromRay.direction, toRay.direction);
                let newPosition = new THREE.Vector3().copy(mInteractionState.data.secondaryStartPosition)
                    .sub(fromRay.origin).applyQuaternion(rotation).add(toRay.origin);
                mInteractionState.data.secondaryPos = newPosition;
            }
        } else if (mInteraction.type == InteractionType.TWO_HAND_POSE) {
            // either move the object or move the control bone
            if (mInteractionState.data.primaryControlsBone == isPrimary) {
                // we are on the controller controlling the bone
                let fromRay = mInteractionState.data.boneStartRay;
                let toRay = raycaster.ray;
                let rotation = new THREE.Quaternion().setFromUnitVectors(fromRay.direction, toRay.direction);
                let newOrientation = new THREE.Quaternion().copy(mInteractionState.data.boneStartOrientation)
                    .applyQuaternion(rotation);
                let newPosition = new THREE.Vector3().copy(mInteractionState.data.boneStartPosition)
                    .sub(fromRay.origin).applyQuaternion(rotation).add(toRay.origin);

                mInteractionState.data.controlBone.position.copy(newPosition);
                mInteractionState.data.controlBone.quaternion.copy(newOrientation);
                mIKSolver?.update();
            } else {
                // we on the controller controlling the object. 
                let fromRay = mInteractionState.data.boneStartRay;
                let toRay = raycaster.ray;

                let rotation = new THREE.Quaternion().setFromUnitVectors(fromRay.direction, toRay.direction);
                let newOrientation = new THREE.Quaternion().copy(mInteractionState.data.objectStartOrientation).applyQuaternion(rotation);
                let newPosition = new THREE.Vector3().copy(mInteractionState.data.objectStartPosition)
                    .sub(fromRay.origin).applyQuaternion(rotation).add(toRay.origin);

                mInteractionState.data.rootTarget.setWorldPosition(newPosition);
                mInteractionState.data.rootTarget.setLocalOrientation(newOrientation);
            }
        }
    }

    mPageSessionController.onPointerDown(onPointerDown);
    mXRSessionController.onPointerDown(onPointerDown);
    function onPointerDown(raycaster, isPrimary = true) {
        let hovered = isPrimary ? mInteractionState.primaryHovered : mInteractionState.secondaryHovered;
        if (!hovered) {
            // nothing to do
        } else if (hovered.isButton()) {
            menuButtonClicked(hovered);
        } else {
            if (mInteractionState.type == InteractionType.NONE) {
                startOneHandMove(raycaster.ray, hovered)
            } else if (mInteractionState.type == InteractionType.ONE_HAND_MOVE) {
                if (mInteractionState.data.target.getId() == hovered.getId()) {
                    startTwoHandMove(raycaster.ray, hovered);
                } else {
                    startTwoHandPose(raycaster.ray, hovered);
                }
            } else {
                console.error("How did you pointerdown with both hands full?? " + mInteractionState.type);
            }
        }
    }

    function startOneHandMove(ray, target) {
        mInteractionState.type = InteractionType.ONE_HAND_MOVE;
        let rootTarget = target.getRoot();
        mInteractionState.data = {
            target,
            rootTarget,
            startRay: new THREE.Ray().copy(ray),
            startOrientation: rootTarget.getLocalOrientation(),
            startPosition: rootTarget.getWorldPosition(),
        }
    }

    function startTwoHandMove() {
        // Figure this out later...

        // let rootTarget = target.getRoot();

        // let rightStart = mXRInputController.getRightControllerPosition()
        // let leftStart = mXRInputController.getLeftControllerPosition()
        // let midpoint = new THREE.Vector3().addVectors(leftStart, rightStart).multiplyScalar(0.5);

        // let direction = new THREE.Vector3().subVectors(leftStart, rightStart).normalize();
        // let dist = new THREE.Vector3().subVectors(leftStart, rightStart).length();

        // let targetMidpointOffset = new THREE.Vector3().subVectors(
        //     rootTarget.getWorldPosition(),
        //     midpoint);

        // mSystemState.interactionType = InteractionType.TWO_HAND_MOVE;
        // mSystemState.interactionData = {
        //     target,
        //     rootTarget,
        //     midpoint,
        //     rightStart,
        //     leftStart,
        //     direction,
        //     dist,
        //     targetMidpointOffset,
        //     originalRotation: rootTarget.getLocalOrientation(),
        //     originalScale: rootTarget.getScale(),
        // }
    }

    function startTwoHandPose() {
        // let rootTarget = lTarget.getRoot();
        // let lDepth = lTarget.getDepth();
        // let rDepth = rTarget.getDepth();

        // let isLeftAnchor = lDepth < rDepth;
        // let anchorTarget = isLeftAnchor ? lTarget : rTarget;
        // let movingTarget = !isLeftAnchor ? lTarget : rTarget;

        // let anchorControllerPosition = isLeftAnchor ?
        //     mXRInputController.getLeftControllerPosition() :
        //     mXRInputController.getRightControllerPosition();

        // let { mesh, iks, affectedTargets, controlBone } = GLTKUtil.createIK(
        //     anchorTarget, movingTarget)

        // mIKSolver = new CCDIKSolver(mesh, iks);
        // mCCDIKHelper = new CCDIKHelper(mesh, iks, 0.01);
        // mSceneContainer.add(mCCDIKHelper);

        // let targetPositionOffset = new THREE.Vector3().subVectors(
        //     rootTarget.getWorldPosition(),
        //     anchorControllerPosition);

        // mSystemState.interactionType = InteractionType.TWO_HAND_POSE;
        // mSystemState.interactionData = {
        //     lTarget,
        //     rTarget,
        //     isLeftAnchor,
        //     controlBone,
        //     rootTarget,
        //     affectedTargets,
        //     targetPositionOffset,
        // }
    }

    async function endInteraction() {
        let type = mInteractionState.type;
        let data = mInteractionState.data;

        mInteractionState.type = InteractionType.NONE;
        mInteractionState.data = {};

        if (type == InteractionType.ONE_HAND_MOVE) {
            if (Array.isArray(data.rootTarget.getId())) {
                await mTransformManyCallback(data.rootTarget.getPointPositions());
            } else {
                let newPosition = data.rootTarget.getLocalPosition();
                await mTransformCallback(data.rootTarget.getId(), newPosition);
            }
        } else if (type == InteractionType.TWO_HAND_MOVE) {
            let newPostion = data.rootTarget.getLocalPosition();
            let newOrientation = data.rootTarget.getLocalOrientation();
            let newScale = data.rootTarget.getScale();
            await mTransformCallback(data.rootTarget.getId(), newPostion, newOrientation, newScale);
        } else if (type == InteractionType.TWO_HAND_POSE) {
            let moveUpdates = data.affectedTargets.map(t => {
                let position = t.getLocalPosition();
                return new ModelUpdate({
                    id: t.getId(),
                    x: position.x,
                    y: position.y,
                    z: position.z,
                    orientation: t.getLocalOrientation().toArray(),
                })
            })

            if (data.affectedTargets[0]) {
                let root = data.affectedTargets[0].getRoot();
                let position = root.getLocalPosition();
                moveUpdates.push(new ModelUpdate({
                    id: root.getId(),
                    x: position.x,
                    y: position.y,
                    z: position.z,
                    orientation: root.getLocalOrientation().toArray(),
                }))
            }
            await mTransformManyCallback(moveUpdates);
            mIKSolver = null
        }

        if (mCCDIKHelper) {
            mSceneController.getScene().remove(mCCDIKHelper);
            mCCDIKHelper = null;
        }
    }

    mPageSessionController.onPointerUp(onPointerUp);
    mXRSessionController.onPointerUp(onPointerUp);
    async function onPointerUp(ray, isPrimary) {
        await endInteraction();
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

    function getClosestTarget(ray, targets) {
        if (targets.length == 0) return null;
        if (targets.length == 1) return targets[0];

        let sortation = targets.map(t => {
            return { t, distance: ray.distanceToPoint(t.getIntersection().point) }
        })

        sortation.sort((a, b) => a.distance - b.distance)
        return sortation[0].t;
    }

    function placePoint(isPrimary, worldPosition) {
        let point = isPrimary ? mPrimaryPoint : mSecondaryPoint;
        point.position.copy(worldPosition);
        point.visible = true;
    }

    setCurrentSession(mPageSessionController);

    this.updateModel = updateModel;
    this.resize = resize;
    this.setCurrentMoment = setCurrentMoment;
    this.sessionStart = sessionStart;
    this.onTransform = (func) => mTransformCallback = func;
    this.onTransformMany = (func) => mTransformManyCallback = func;
    this.onUpdateSphereImage = (func) => mUpdateSphereImageCallback = func;
}

