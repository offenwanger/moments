import { InteractionType } from "../../../constants.js";
import { Data } from "../../../data.js";
import { IdUtil } from "../../../utils/id_util.js";

function pointerMove(raycaster, isPrimary, interactionState, toolMode, sessionController, sceneController, helperPointController) {
    if (interactionState.type == InteractionType.NONE) {
        let targets = sceneController.getTargets(raycaster, toolMode)
        if (targets.length == 0) {
            sessionController.hovered(false, isPrimary)
        } else {
            if (targets.length > 1) { console.error('Unexpected target result!'); }
            let target = targets[0];
            target.highlight(toolMode);
            helperPointController.showPoint(isPrimary, target.getIntersection().point);

            if (isPrimary) {
                interactionState.primaryHovered = target;
            } else {
                interactionState.secondaryHovered = target;
            }
            sessionController.hovered(true, isPrimary)
        }
    } else if (interactionState.type == InteractionType.BRUSHING) {
        let targets = sceneController.getTargets(raycaster, toolMode)
        if (targets.length == 0) { /* we moved off the sphere, do nothing. */ } else {
            if (targets.length > 1) { console.error('Unexpected target result!'); }
            let target = targets[0];
            target.select(toolMode);
            helperPointController.showPoint(isPrimary, target.getIntersection().point);
        }
    }
}

function pointerDown(raycaster, isPrimary, interactionState, toolMode, sessionController, sceneController, helperPointController) {
    let hovered = isPrimary ? interactionState.primaryHovered : interactionState.secondaryHovered;
    if (hovered) {
        if (IdUtil.getClass(hovered.getId()) != Data.Photosphere) { console.error('Invalid hovered!'); return; }
        if (interactionState.type == InteractionType.NONE) {
            interactionState.type = InteractionType.BRUSHING;
        } else {
            console.error("TODO: Handle this edge case");
        }
    }
}

function pointerUp(raycaster, isPrimary, interactionState, toolMode, sessionController, sceneController, helperPointController) {
    let type = interactionState.type;
    let data = interactionState.data;

    interactionState.type = InteractionType.NONE;
    interactionState.data = {};

    let updates = []

    if (type == InteractionType.BRUSHING) {
        // get the right canvas for the brush type then save it. 
        // will probably need a new update type for this...
    }

    return updates;
}

export const BrushToolHandler = {
    pointerMove,
    pointerDown,
    pointerUp,
}