import { ASSET_UPDATE_COMMAND, BrushToolButtons, InteractionType } from "../../../constants.js";

function pointerMove(raycaster, isPrimary, interactionState, toolMode, sessionController, sceneController, helperPointController) {
    if (interactionState.type == InteractionType.NONE) {
        if (isPrimary) {
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
        } else {
            // do nothing.
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
        if (interactionState.type == InteractionType.NONE) {
            interactionState.type = InteractionType.BRUSHING;
            interactionState.data = { target: hovered };
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
        let canvas;
        if (toolMode.brushSettings.mode == BrushToolButtons.BLUR ||
            toolMode.brushSettings.mode == BrushToolButtons.UNBLUR) {
            canvas = data.target.getBlurCanvas();
            data.target.setBlurCanvas(canvas);
        } else if (toolMode.brushSettings.mode == BrushToolButtons.COLOR) {
            canvas = data.target.getColorCanvas();
            data.target.setColorCanvas(canvas);
        } else {
            console.error('Invalid brushing state: ' + JSON.stringify(toolMode));
            return [];
        }
        let assetId = data.target.getId();
        updates.push({
            command: ASSET_UPDATE_COMMAND,
            id: assetId,
            dataPromise: new Promise(resolve => canvas.toBlob(resolve))
        });
    }

    return updates;
}

export const BrushToolHandler = {
    pointerMove,
    pointerDown,
    pointerUp,
}