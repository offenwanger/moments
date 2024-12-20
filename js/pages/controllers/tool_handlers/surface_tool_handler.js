import { ASSET_UPDATE_COMMAND, BrushToolButtons, InteractionType } from "../../../constants.js";

function pointerMove(raycaster, orientation, isPrimary, interactionState, toolMode, sessionController, sceneController, helperPointController) {

    if (interactionState.type == InteractionType.NONE) {
        // supported user intents -> I want to make this section flat
        // I want to extrude this flat section
        // I want to change the angle of this flat section
        // I want to reset this section

        // point at surface, draw shape, becomes flat, switch to move mode
        // grap flat shape, move in and out

        // tool modes: 
        //  select mode
        //  move mode
        //  reset mode

        // basePoints
        // flatSelection
        //      plane (dist/normal)
        //      points
        //      base points

        // when we draw a new selection, if the selection contains points from previous selection
        // delete those points. 
        // get all base points inside the selection, remove those from any other selection. 

        // reset same thing except we don't make a new selection

        // when drawing, if point is not in selection -> default dist
        // if point in selection -> get position in plane based on control point / normal.

        // any arbitrary plane can be specified by a normal and a distance to the center. 
        // when rotating
        // show the pivot at the center of of the uv points. 
        // dist will always be negative. 
        // let's say it was pointing x+, and we turn to y+, when it's .5x.5y, dist = biggest, if we turn more, dist gets smaller
        // so we pick a pivot, then we have to set dist s.t. pivot is still in the plane. 
        // there's a func for this, set from normal and coplaner point
        // we also limit how far points can go. cannot be more than 4x sphere size. 
        // dist must be 0.01, and since all lines go from origin, this prevents non intersections. 





        // select mode only draws convex hulls
        // inner points, outter points. 



        // select a section -> becomes flat

        // data strcut -> List of flat sections



        // if we are not interacting 
        // if we are in move mode or deselect mode
        // highlight the selection patches.
        // if we are in select mode, do nothing 

        //     if (isPrimary) {
        //         let targets = sceneController.getTargets(raycaster, toolMode)
        //         if (targets.length == 0) {
        //             sessionController.hovered(false, isPrimary)
        //         } else {
        //             if (targets.length > 1) { console.error('Unexpected target result!'); }
        //             let target = targets[0];
        //             target.highlight(toolMode);
        //             helperPointController.showPoint(isPrimary, target.getIntersection().point);

        //             if (isPrimary) {
        //                 interactionState.primaryHovered = target;
        //             } else {
        //                 interactionState.secondaryHovered = target;
        //             }
        //             sessionController.hovered(true, isPrimary)
        //         }
        //     } else {
        //         // do nothing.
        //     }
    } else if (interactionState.type == InteractionType.BRUSHING) {
        //     let targets = sceneController.getTargets(raycaster, toolMode)
        //     if (targets.length == 0) { /* we moved off the sphere, do nothing. */ } else {
        //         if (targets.length > 1) { console.error('Unexpected target result!'); }
        //         let target = targets[0];
        //         target.select(toolMode);
        //         helperPointController.showPoint(isPrimary, target.getIntersection().point);
        //     }
    } else if (interactionState.type == InteractionType.ONE_HAND_MOVE) {

    } else {
        console.error('invalid state:' + toolMode.tool + ", " + interactionState.type);
    }
}

function pointerDown(raycaster, orientation, isPrimary, interactionState, toolMode, sessionController, sceneController, helperPointController) {
    // let hovered = isPrimary ? interactionState.primaryHovered : interactionState.secondaryHovered;
    // if (hovered) {
    //     if (interactionState.type == InteractionType.NONE) {
    //         interactionState.type = InteractionType.BRUSHING;
    //         interactionState.data = { target: hovered };
    //     } else {
    //         console.error("TODO: Handle this edge case");
    //     }
    // }
}

function pointerUp(raycaster, orientation, isPrimary, interactionState, toolMode, sessionController, sceneController, helperPointController) {
    let type = interactionState.type;
    let data = interactionState.data;

    interactionState.type = InteractionType.NONE;
    interactionState.data = {};

    let updates = []

    // if (type == InteractionType.BRUSHING) {
    //     let canvas;
    //     if (toolMode.brushSettings.mode == BrushToolButtons.BLUR ||
    //         toolMode.brushSettings.mode == BrushToolButtons.UNBLUR) {
    //         canvas = data.target.getBlurCanvas();
    //         data.target.setBlurCanvas(canvas);
    //     } else if (toolMode.brushSettings.mode == BrushToolButtons.COLOR) {
    //         canvas = data.target.getColorCanvas();
    //         data.target.setColorCanvas(canvas);
    //     } else {
    //         console.error('Invalid brushing state: ' + JSON.stringify(toolMode));
    //         return [];
    //     }
    //     let assetId = data.target.getId();
    //     updates.push({
    //         command: ASSET_UPDATE_COMMAND,
    //         id: assetId,
    //         dataPromise: new Promise(resolve => canvas.toBlob(resolve))
    //     });
    // }

    return updates;
}

export const SurfaceToolHandler = {
    pointerMove,
    pointerDown,
    pointerUp,
}