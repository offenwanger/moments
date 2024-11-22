import * as THREE from 'three';
import { Data } from "../../data.js";
import { InteractionTargetWrapper } from "./interaction_target_interface.js";

export function AudioWrapper(parent) {
    let mParent = parent;
    let mAudio = new Data.Audio();
    let mInteractionTarget = createInteractionTarget();

    async function update(audio, model, assetUtil) {

    }

    function getId() {
        return mAudio.id;
    }

    function remove() {

    }

    function getTargets(ray) {

    }

    function createInteractionTarget() {

    }

    this.getTargets = getTargets;
    this.update = update;
    this.getId = getId;
    this.remove = remove;
}