import { Data } from '../../js/data.js';
import { mockFileSystemDirectoryHandle, mockFileSystemFileHandle } from './mock_filesystem.js';

async function createAndEditStory() {
    window.directories.push(new mockFileSystemDirectoryHandle('test'));
    await d3.select('#choose-folder-button').getCallbacks().click();
    await d3.select('#new-story-button').getCallbacks().click();
    await d3.select('.edit-story-button').getCallbacks().click();
}

async function createAndOpenModel3D() {
    global.fileSystem['test.glb'] = "glbstuff";
    window.files.push(new mockFileSystemFileHandle('test.glb'));
    await createAndEditStory();
    let promise = TestUtils.clickButtonInput('#story-model3D-add-button');
    await TestUtils.clickButtonInput('#asset-add-button');
    await promise;
    expect(TestUtils.model().model3Ds.length).toBe(1);
    await TestUtils.clickButtonInput('#model3D-button-' + TestUtils.model().model3Ds[0].id);
}

function getInputValue(id) {
    let inputContainer = d3.select(id);
    expect(Object.keys(inputContainer.getChildren()).length).toBe(2);
    let input = inputContainer.getChildren()[1];
    if (input.attr('type') == 'text' || input.attr('type') == 'number') {
        return input.node().value;
    } else if (input.attr('type') == 'checkbox') {
        return input.node().checked;
    } else {
        console.error("Not a valid type", input.attr('type'))
    }
}
async function enterInputValue(id, value) {
    let inputContainer = d3.select(id);
    expect(Object.keys(inputContainer.getChildren()).length).toBe(2);
    let input = inputContainer.getChildren()[1];
    if (input.attr('type') == 'text' || input.attr('type') == 'number') {
        input.node().value = value;
        await input.getCallbacks().blur();
    } else if (input.attr('type') == 'checkbox') {
        input.node().checked = value;
        await input.getCallbacks().change();
    } else {
        console.error("Not a valid type", input.attr('type'))
    }
}

async function clickButtonInput(id) {
    let inputContainer = d3.select(id);
    expect(Object.keys(inputContainer.getCallbacks())).toEqual(['click', 'pointerup', 'pointerdown', 'pointerenter', 'pointerout']);
    await inputContainer.getCallbacks().pointerenter();
    await inputContainer.getCallbacks().pointerdown();
    await inputContainer.getCallbacks().pointerup();
    await inputContainer.getCallbacks().click();
    await inputContainer.getCallbacks().pointerout();
}

async function clickButtonInput1(id) {
    let inputContainer = d3.select(id);
    expect(Object.keys(inputContainer.getChildren()).length).toBe(2);
    expect(Object.keys(inputContainer.getChildren()[0].getCallbacks())).toEqual(['click', 'pointerup', 'pointerdown', 'pointerenter', 'pointerout']);
    await inputContainer.getChildren()[0].getCallbacks().pointerenter();
    await inputContainer.getChildren()[0].getCallbacks().pointerdown();
    await inputContainer.getChildren()[0].getCallbacks().pointerup();
    await inputContainer.getChildren()[0].getCallbacks().click();
    await inputContainer.getChildren()[0].getCallbacks().pointerout();
}

async function clickButtonInput2(id) {
    let inputContainer = d3.select(id);
    expect(Object.keys(inputContainer.getChildren()).length).toBe(2);
    expect(Object.keys(inputContainer.getChildren()[1].getCallbacks())).toEqual(['click', 'pointerup', 'pointerdown', 'pointerenter', 'pointerout']);
    await inputContainer.getChildren()[1].getCallbacks().pointerenter();
    await inputContainer.getChildren()[1].getCallbacks().pointerdown();
    await inputContainer.getChildren()[1].getCallbacks().pointerup();
    await inputContainer.getChildren()[1].getCallbacks().click();
    await inputContainer.getChildren()[1].getCallbacks().pointerout();
}

function model() {
    let storyFile = Object.keys(global.fileSystem).find(k => k.startsWith('test/StoryModel_'))
    return Data.StoryModel.fromObject(JSON.parse(global.fileSystem[storyFile]))
}

function createStoryModel() {
    let model = new Data.StoryModel();
    model.name = "TestStory"
    model.timeline = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }, { x: 1, y: -1, z: -2 }];

    let modelAsset1 = new Data.Asset()
    let pose1 = new Data.AssetComponentPose()
    let pose2 = new Data.AssetComponentPose()
    let pose3 = new Data.AssetComponentPose()
    modelAsset1.poseIds = [pose1.id, pose2.id, pose3.id];
    let modelAsset2 = new Data.Asset()
    let pose4 = new Data.AssetComponentPose()
    let pose5 = new Data.AssetComponentPose()
    modelAsset2.poseIds = [pose4.id, pose5.id];

    let imageAsset = new Data.Asset()
    let boxAsset = new Data.Asset()

    let model3D1 = new Data.Model3D()
    model3D1.assetId = modelAsset1.id;
    let model3D2 = new Data.Model3D()
    model3D2.assetId = modelAsset1.id;
    let model3D3 = new Data.Model3D()
    model3D3.assetId = modelAsset1.id;

    let textAnnotationItem = new Data.AnnotationText();
    textAnnotationItem.text = "Some text"
    let imageAnnotationItem = new Data.AnnotationImage();
    imageAnnotationItem.assetId = imageAsset.id;

    let annotation = new Data.Annotation();
    annotation.itemIds = [textAnnotationItem.id, imageAnnotationItem.id];

    model.backgroundId = boxAsset.id;

    model.assets.push(modelAsset1)
    model.assets.push(modelAsset2)
    model.assetPoses.push(pose1)
    model.assetPoses.push(pose2)
    model.assetPoses.push(pose3)
    model.assetPoses.push(pose4)
    model.assetPoses.push(pose5)
    model.assets.push(imageAsset)
    model.assets.push(boxAsset)

    model.model3Ds.push(model3D1)
    model.model3Ds.push(model3D2)
    model.model3Ds.push(model3D3)

    model.annotationItems.push(textAnnotationItem)
    model.annotationItems.push(imageAnnotationItem)
    model.annotations.push(annotation)

    return model;

}

export const TestUtils = {
    createAndEditStory,
    createAndOpenModel3D,
    getInputValue,
    enterInputValue,
    clickButtonInput,
    clickButtonInput1,
    clickButtonInput2,
    model,
    createStoryModel,
}