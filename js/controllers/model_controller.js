import { Data } from "../data_structs.js";
import { IdUtil } from "../utils/id_util.js";

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

    async function createModel3D(parentId) {
        let parent;
        if (IdUtil.getClass(parentId) == Data.Story) {
            parent = mModel.getStory();
        } else if (IdUtil.getClass(parentId) == Data.Moment) {
            parent = mModel.getMoment(parentId);
        } else { console.error("Parent id is not supported", parentId) }
        let newModel3D = new Data.Model3D();
        parent.model3Ds.push(newModel3D);
        await mWorkspace.updateStory(mModel);
        return newModel3D.id;
    }

    async function createAnnotation(parentId) {
        let parent;
        if (IdUtil.getClass(parentId) == Data.Story) {
            parent = mModel.getStory();
        } else if (IdUtil.getClass(parentId) == Data.Moment) {
            parent = mModel.getMoment(parentId);
        } else { console.error("Parent id is not supported", parentId) }
        let newAnnotation = new Data.Annotation();
        parent.annotations.push(newAnnotation);
        await mWorkspace.updateStory(mModel);
        return newAnnotation.id;
    }

    async function setAttribute(id, attr, value) {
        let item = mModel.getById(id);
        if (!item) { console.error('Invalid id', id); return; }
        item[attr] = value;
        await mWorkspace.updateStory(mModel);
    }

    return {
        init,
        createMoment,
        createModel3D,
        createAnnotation,
        setAttribute,
        getModel: () => mModel.clone(),
    }
}