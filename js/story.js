import { Storyline } from "./storyline.js";

export function Story(scene) {
    let mStoryline = new Storyline(scene);

    function loadFromObject(obj) {
        mStoryline.loadFromObject(obj.storyline);

    }

    this.loadFromObject = loadFromObject;
}

