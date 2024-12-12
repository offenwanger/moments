import * as THREE from "three";
import { TELEPORT_COMMAND, InteractionType } from "../../../constants.js";
import { Util } from "../../../utils/utility.js";
import { ModelUpdate } from "../model_controller.js";
import { IdUtil } from "../../../utils/id_util.js";
import { Data } from "../../../data.js";
import { InteractionTargetInterface } from "../../scene_objects/interaction_target_interface.js";

let mIKSolver;
let mCCDIKHelper;

const TELEPORT_TARGET = 'teleportTarget';

let mTeleportTargetDistance = 1;
const mTeleportTarget = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 32, 16),
    new THREE.MeshBasicMaterial({
        color: 0xffff00,
        side: THREE.BackSide,
        depthTest: false,
    }));
mTeleportTarget.renderOrder = 999;
const mTeleportTargetInteractionWrapper = new InteractionTargetInterface();
mTeleportTargetInteractionWrapper.getId = () => TELEPORT_TARGET;

function pointerMove(raycaster, isPrimary, interactionState, toolMode, sessionController, sceneController, helperPointController) {
    if (!raycaster) {
        // unhighlight things, hide interface stuff, that's it.
        return;
    }

    if (interactionState.type == InteractionType.NONE) {
        if (isPrimary) {
            let targets = sceneController.getTargets(raycaster, toolMode)
            if (targets.length == 0) {
                sessionController.hovered(false, isPrimary)
            } else {
                let closest = Util.getClosestTarget(raycaster.ray, targets);
                closest.highlight(toolMode);
                helperPointController.showPoint(isPrimary, closest.getIntersection().point);
                interactionState.primaryHovered = closest;
                sessionController.hovered(true, isPrimary)
            }
        } else {
            // do nothing.
        }
    } else if (interactionState.type == InteractionType.ONE_HAND_MOVE && isPrimary) {
        // Move the moving thing. 
        let fromRay = interactionState.data.startRay;
        let toRay = raycaster.ray;

        let rotation = new THREE.Quaternion().setFromUnitVectors(fromRay.direction, toRay.direction);
        let newOrientation = new THREE.Quaternion().copy(interactionState.data.startOrientation)
        // .applyQuaternion(rotation);
        let newPosition = new THREE.Vector3().copy(interactionState.data.startPosition)
            .sub(fromRay.origin).applyQuaternion(rotation).add(toRay.origin);

        interactionState.data.rootTarget.setWorldPosition(newPosition);
        interactionState.data.rootTarget.setLocalOrientation(newOrientation);

        let moveClass = IdUtil.getClass(interactionState.data.rootTarget.getId());
        let targets = [];
        if (moveClass == Data.Teleport) {
            // TODO: Update this to check if an item has a teleport attached. 
            let target = getTeleportDropTarget(raycaster);
            if (target) targets = [target];
            updateTeleportTarget(raycaster, sceneController);
        }

        if (targets.length == 0) {
            targets = getDropTargets(raycaster, toolMode, moveClass, sceneController);
            if (targets.length > 0) {
                let closest = Util.getClosestTarget(raycaster.ray, targets);
                closest.highlight(toolMode);
                helperPointController.showPoint(isPrimary, closest.getIntersection().point);
                interactionState.primaryHovered = closest;
                sessionController.hovered(true, isPrimary)
            }
        }
    } else if (interactionState.type == InteractionType.ONE_HAND_MOVE && !isPrimary) {
        // highlight 2 handed interactions
        let targets = sceneController.getTargets(raycaster, toolMode)
        // the only valid targets are the dragged object or bones belonging to it. 
        targets = targets.filter(t => t.getRoot().getId() == interactionState.data.rootTarget.getId());
        if (targets.length > 0) {
            let closest = Util.getClosestTarget(raycaster.ray, targets);
            closest.highlight(toolMode);
            helperPointController.showPoint(isPrimary, closest.getIntersection().point);
            interactionState.secondaryHovered = closest;
            sessionController.hovered(true, isPrimary)
        }
    } else if (interactionState.type == InteractionType.TWO_HAND_MOVE) {
        if (isPrimary) {
            let fromRay = interactionState.data.primaryStartRay;
            let toRay = raycaster.ray;
            let primaryRotation = new THREE.Quaternion().setFromUnitVectors(fromRay.direction, toRay.direction);
            let primary = new THREE.Vector3().copy(interactionState.data.secondaryStartPosition)
                .sub(fromRay.origin).applyQuaternion(primaryRotation).add(toRay.origin);
            let secondary = interactionState.data.secondaryPos;
            let midpoint = new THREE.Vector3().addVectors(primary, secondary).multiplyScalar(0.5);

            let newDirection = new THREE.Vector3().subVectors(primary, secondary).normalize();
            let rotation = new THREE.Quaternion().setFromUnitVectors(interactionState.data.direction, newDirection);

            let newOrienatation = new THREE.Quaternion().multiplyQuaternions(rotation, interactionState.data.originalRotation)
            interactionState.data.rootTarget.setLocalOrientation(newOrienatation);

            let dist = new THREE.Vector3().subVectors(primary, secondary).length();
            let newScale = interactionState.data.originalScale * (dist / interactionState.data.dist)
            interactionState.data.rootTarget.setScale(newScale);

            // the original position, translated by the change in the position of the midpoint, 
            // translated to offset the scale
            // and then rotated around the midpoint

            let newPosition = new THREE.Vector3().copy(midpoint)
            newPosition.addScaledVector(interactionState.data.targetMidpointOffset, newScale);
            newPosition = Util.pivot(newPosition, midpoint, rotation);
            interactionState.data.rootTarget.setWorldPosition(newPosition);
        } else {
            let fromRay = interactionState.data.secondaryStartRay;
            let toRay = raycaster.ray;
            let rotation = new THREE.Quaternion().setFromUnitVectors(fromRay.direction, toRay.direction);
            let newPosition = new THREE.Vector3().copy(interactionState.data.secondaryStartPosition)
                .sub(fromRay.origin).applyQuaternion(rotation).add(toRay.origin);
            interactionState.data.secondaryPos = newPosition;
        }
    } else if (mInteraction.type == InteractionType.TWO_HAND_POSE) {
        // either move the object or move the control bone
        if (interactionState.data.primaryControlsBone == isPrimary) {
            // we are on the controller controlling the bone
            let fromRay = interactionState.data.boneStartRay;
            let toRay = raycaster.ray;
            let rotation = new THREE.Quaternion().setFromUnitVectors(fromRay.direction, toRay.direction);
            let newOrientation = new THREE.Quaternion().copy(interactionState.data.boneStartOrientation)
                .applyQuaternion(rotation);
            let newPosition = new THREE.Vector3().copy(interactionState.data.boneStartPosition)
                .sub(fromRay.origin).applyQuaternion(rotation).add(toRay.origin);

            interactionState.data.controlBone.position.copy(newPosition);
            interactionState.data.controlBone.quaternion.copy(newOrientation);
            ikSolver?.update();
        } else {
            // we on the controller controlling the object. 
            let fromRay = interactionState.data.boneStartRay;
            let toRay = raycaster.ray;

            let rotation = new THREE.Quaternion().setFromUnitVectors(fromRay.direction, toRay.direction);
            let newOrientation = new THREE.Quaternion().copy(interactionState.data.objectStartOrientation).applyQuaternion(rotation);
            let newPosition = new THREE.Vector3().copy(interactionState.data.objectStartPosition)
                .sub(fromRay.origin).applyQuaternion(rotation).add(toRay.origin);

            interactionState.data.rootTarget.setWorldPosition(newPosition);
            interactionState.data.rootTarget.setLocalOrientation(newOrientation);
        }
    }
}

function pointerDown(raycaster, isPrimary, interactionState, toolMode, sessionController, sceneController, points) {
    let hovered = isPrimary ? interactionState.primaryHovered : interactionState.secondaryHovered;
    if (hovered) {
        if (interactionState.type == InteractionType.NONE) {
            startOneHandMove(raycaster, hovered, interactionState, sceneController)
        } else if (interactionState.type == InteractionType.ONE_HAND_MOVE) {
            if (interactionState.data.target.getId() == hovered.getId()) {
                startTwoHandMove(raycaster.ray, hovered);
            } else {
                startTwoHandPose(raycaster.ray, hovered);
            }
        } else {
            console.error("How did you pointerdown with both hands full?? " + interactionState.type);
        }
    }
}

function pointerUp(raycaster, isPrimary, interactionState, toolMode, sessionController, sceneController, points) {
    let type = interactionState.type;
    let data = interactionState.data;

    interactionState.type = InteractionType.NONE;
    interactionState.data = {};

    let updates = []

    if (type == InteractionType.ONE_HAND_MOVE) {
        let moveClass = IdUtil.getClass(data.rootTarget.getId());
        let targets = [];
        if (moveClass == Data.Teleport) {
            // TODO: Update this to check if an item has a teleport attached. 
            let target = getTeleportDropTarget(raycaster);
            if (target) targets = [target];
            updates = [{
                command: TELEPORT_COMMAND,
                id: data.rootTarget.getId(),
            }]
        }

        if (targets.length == 0) {
            targets = getDropTargets(raycaster, toolMode, moveClass, sceneController);
            if (targets.length > 0) {
                let closest = Util.getClosestTarget(raycaster.ray, targets);
                let update = { id: closest.getId() }
                if (moveClass == Data.Teleport) {
                    update.teleportId = data.rootTarget.getId();
                } else if (moveClass == Data.Audio) {
                    update.audioId = data.rootTarget.getId();
                }
                updates = [new ModelUpdate(update)]
            }
        }

        if (targets.length == 0) {
            let newPosition = data.rootTarget.getLocalPosition();
            updates = [new ModelUpdate({
                id: data.rootTarget.getId(),
                x: newPosition.x,
                y: newPosition.y,
                z: newPosition.z,
                //TODO: orientation = ...
            })]
        }
    } else if (type == InteractionType.TWO_HAND_MOVE) {
        let newPosition = data.rootTarget.getLocalPosition();
        updates = [new ModelUpdate({
            id: data.rootTarget.getId(),
            x: newPosition.x,
            y: newPosition.y,
            z: newPosition.z,
            orientation: data.rootTarget.getLocalOrientation().toArray(),
            scale: data.rootTarget.getScale()
        })];
    } else if (type == InteractionType.TWO_HAND_POSE) {
        updates = data.affectedTargets.map(t => {
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
            updates.push(new ModelUpdate({
                id: root.getId(),
                x: position.x,
                y: position.y,
                z: position.z,
                orientation: root.getLocalOrientation().toArray(),
            }))
        }
        if (mIKSolver) sceneController.getScene().remove(mIKSolver);
        mIKSolver = null
    }

    if (mCCDIKHelper) {
        sceneController.getScene().remove(mCCDIKHelper);
        mCCDIKHelper = null;
    }

    sceneController.getScene().remove(mTeleportTarget)

    return updates;
}


function startOneHandMove(raycaster, target, interactionState, sceneController) {
    interactionState.type = InteractionType.ONE_HAND_MOVE;
    let rootTarget = target.getRoot();
    interactionState.data = {
        target,
        rootTarget,
        startRay: new THREE.Ray().copy(raycaster.ray),
        startOrientation: rootTarget.getLocalOrientation(),
        startPosition: rootTarget.getWorldPosition(),
    }

    let moveClass = IdUtil.getClass(interactionState.data.rootTarget.getId());
    // TODO: check for attached teleporter
    if (moveClass == Data.Teleport) {
        sceneController.getScene().add(mTeleportTarget);
        let targetPosision = rootTarget.getWorldPosition();
        mTeleportTargetDistance = targetPosision.distanceTo(raycaster.ray.origin) / 2;

        mTeleportTarget.position.crossVectors(raycaster.ray.direction, new THREE.Vector3(0, 1, 0));
        if (mTeleportTarget.position.length() == 0) { mTeleportTarget.position.set(1, 0, 0); }
        mTeleportTarget.position.multiplyScalar(mTeleportTargetDistance);
        mTeleportTarget.position.add(targetPosision);
        updateTeleportTarget(raycaster, sceneController);
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

function getTeleportDropTarget(raycaster) {
    let intersect = raycaster.intersectObject(mTeleportTarget);
    if (intersect[0]) {
        mTeleportTargetInteractionWrapper.getIntersection = () => intersect[0];
        return mTeleportTargetInteractionWrapper;
    } else return null
}

function getDropTargets(raycaster, toolMode, moveClass, sceneController) {
    if (moveClass == Data.Teleport || moveClass == Data.Audio) {
        let targets = sceneController.getTargets(raycaster, toolMode);
        targets = targets.filter(t => {
            // right now both audio and teleport have the 
            // same drop targets other than the teleport target.
            let dropClass = IdUtil.getClass(t.getId())
            if (dropClass == Data.PoseableAsset) return true;
            if (dropClass == Data.Picture) return true;
            return false;
        });
        return targets;
    } else {
        // not a dropable move item
        return [];
    }
}

function updateTeleportTarget(raycaster, sceneController) {
    let distanceToTarget = raycaster.ray.distanceToPoint(mTeleportTarget.position);
    let unitDist = distanceToTarget / mTeleportTargetDistance;
    let scale = Math.min(1 / (unitDist * unitDist), 100);
    mTeleportTarget.scale.set(scale, scale, scale);
    if (unitDist > 1.5) sceneController.getScene().remove(mTeleportTarget);

}

export const MoveToolHandler = {
    pointerMove,
    pointerDown,
    pointerUp,
}