import { Data } from "../data_structs.js";

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

    async function createMoment() {
        let newMoment = new Data.Moment();
        mModel.getStory().moments.push(newMoment);
        await mWorkspace.updateStory(mModel);
        return newMoment.id;
    }

    async function createStoryModel3D() {
        let newModel3D = new Data.Model3D();
        mModel.getStory().model3Ds.push(newModel3D);
        await mWorkspace.updateStory(mModel);
        return newModel3D.id;
    }

    async function createStoryAnnotation() {
        let newAnnotation = new Data.Annotation();
        mModel.getStory().annotations.push(newAnnotation);
        await mWorkspace.updateStory(mModel);
        return newAnnotation.id;
    }

    return {
        init,
        createMoment,
        createStoryModel3D,
        createStoryAnnotation,
        getModel: () => mModel.clone(),
    }
}