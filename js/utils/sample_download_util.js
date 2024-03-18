import { DataModel } from "../data_model.js";

export async function downloadSample(sampleId, workspace) {
    let storyModel;
    try {
        let url = 'assets/stories/' + sampleId + '.json'
        let response = await fetch(url);
        let json = await response.json();
        storyModel = DataModel.fromObject(json);
    } catch (error) { console.error(error); return false; }

    if (storyModel.getStory().id != sampleId) { console.error("Incorrect label ", sampleId, storyModel.story.id); }
    await workspace.newStory(storyModel.getStory().id);

    let assets = storyModel.getAssets();
    for (let asset in assets) {
        try {
            let file = await fetch(asset.location);
            let stream = await file.arrayBuffer();
            let location = await workspace.writeAsset(storyModel.getStory().id, asset, stream);
            asset.location = location;
        } catch (error) {
            console.error("failed to load asset", error);
            asset.location = null;
        }
    }
    await workspace.updateStory(storyModel);
    return true;
}

export async function getSampleList() {
    let url = 'assets/samples_list.json'
    let response = await fetch(url);
    let json = await response.json();
    return json;
}