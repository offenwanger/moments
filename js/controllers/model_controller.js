import * as Data from "../data_structs.js";

export function ModelController(storyId, workspace) {
    let mModel;
    let mStoryId = storyId;
    let mWorkspace = workspace;

    async function init() {
        if (!mModel) {
            mModel = await mWorkspace.getStory(mStoryId);
            if (!mModel) throw Error("Invalid workspace!");
        }
    }

    async function createStorylineMoment() {
        let newMoment = new Data.Moment();
        mModel.getStory().storyline.moments.push(newMoment);
        await mWorkspace.updateStory(mModel);
        return newMoment.id;
    }

    return {
        init,
        createStorylineMoment,
        getModel: () => mModel.clone(),
    }
}