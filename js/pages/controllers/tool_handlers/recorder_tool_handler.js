import { InteractionType } from "../../../constants.js";
import { InteractionTargetInterface } from "../../scene_objects/interaction_target_interface.js";

let mRecorder = null;
let mDummyTarget = new InteractionTargetInterface();

function pointerMove(raycaster, orientation, isPrimary, interactionState, toolMode, model, sessionController, sceneController, helperPointController) {
    interactionState.primaryHovered = mDummyTarget;
}

function pointerDown(raycaster, orientation, isPrimary, interactionState, toolMode, model, sessionController, sceneController, helperPointController) {
    // start recording
    if (!mRecorder) { console.error('Recorder tool not initialized, no recorder.'); return; }
    if (!isPrimary) return; // nothing for secondary controller to do.
    if (interactionState.type != InteractionType.NONE) { console.error('How did we even get here?'); return; }

    mRecorder.startRecording();
    interactionState.type = InteractionType.RECORDING;
}

function pointerUp(raycaster, orientation, isPrimary, interactionState, toolMode, model, sessionController, sceneController, helperPointController) {
    // stop recording. 
    if (!mRecorder) { console.error('Recorder tool not initialized, no recorder.'); return []; }
    if (!isPrimary) return []; // nothing for secondary controller to do.
    if (interactionState.type != InteractionType.RECORDING) return [];

    mRecorder.stopRecording();
    interactionState.type = InteractionType.NONE;

    return []
}

export const RecorderToolHandler = {
    pointerMove,
    pointerDown,
    pointerUp,
    setRecorder: (recorder) => mRecorder = recorder,
}