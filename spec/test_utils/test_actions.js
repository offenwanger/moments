
import * as THREE from 'three';
import { Data } from '../../js/data.js';
import { loadRealFile, mockFile, mockFileSystemDirectoryHandle, mockFileSystemFileHandle } from './mock_filesystem.js';

export function testmodel() {
    let storyFile = Object.keys(global.fileSystem).find(k => k.startsWith('test/StoryModel_'))
    return Data.StoryModel.fromObject(JSON.parse(global.fileSystem[storyFile]))
}

export async function createAndEditStory() {
    window.directories.push(new mockFileSystemDirectoryHandle('test'));
    await d3.select('#choose-folder-button').getCallbacks().click();
    await d3.select('#new-story-button').getCallbacks().click();
    await d3.select('.edit-story-button').getCallbacks().click();
    expect(testmodel().moments.length).toBe(1);
    await clickButtonInput('#moment-button-' + testmodel().moments[0].id);

}

export async function createAndOpenPoseableAsset() {
    await createAndEditStory();

    await loadRealFile('sample.glb')
    window.files.push(new mockFile('sample.glb', global.fileSystem['sample.glb']));
    let promise = clickButtonInput('#moment-poseable-asset-add-button');
    await clickButtonInput('#asset-add-button');

    expect(d3.select('#assets-container').getChildren().length).toBeGreaterThan(0);
    d3.select('#assets-container').getChildren()[0].getCallbacks().click();

    await promise;

    expect(testmodel().moments[0].poseableAssetIds.length).toBe(1);
    await clickButtonInput('#poseable-asset-button-' + testmodel().moments[0].poseableAssetIds[0]);
}

export function getInputValue(id) {
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

export async function enterInputValue(id, value) {
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

export async function clickButtonInput(id) {
    let inputContainer = d3.select(id);
    expect(Object.keys(inputContainer.getCallbacks())).toEqual(['click', 'pointerup', 'pointerdown', 'pointerenter', 'pointerout']);
    await inputContainer.getCallbacks().pointerenter();
    await inputContainer.getCallbacks().pointerdown();
    await inputContainer.getCallbacks().pointerup();
    await inputContainer.getCallbacks().click();
    await inputContainer.getCallbacks().pointerout();
}

export async function clickButtonInput1(id) {
    let inputContainer = d3.select(id);
    expect(Object.keys(inputContainer.getChildren()).length).toBe(2);
    expect(Object.keys(inputContainer.getChildren()[0].getCallbacks())).toEqual(['click', 'pointerup', 'pointerdown', 'pointerenter', 'pointerout']);
    await inputContainer.getChildren()[0].getCallbacks().pointerenter();
    await inputContainer.getChildren()[0].getCallbacks().pointerdown();
    await inputContainer.getChildren()[0].getCallbacks().pointerup();
    await inputContainer.getChildren()[0].getCallbacks().click();
    await inputContainer.getChildren()[0].getCallbacks().pointerout();
}

export async function clickButtonInput2(id) {
    let inputContainer = d3.select(id);
    expect(Object.keys(inputContainer.getChildren()).length).toBe(2);
    expect(Object.keys(inputContainer.getChildren()[1].getCallbacks())).toEqual(['click', 'pointerup', 'pointerdown', 'pointerenter', 'pointerout']);
    await inputContainer.getChildren()[1].getCallbacks().pointerenter();
    await inputContainer.getChildren()[1].getCallbacks().pointerdown();
    await inputContainer.getChildren()[1].getCallbacks().pointerup();
    await inputContainer.getChildren()[1].getCallbacks().click();
    await inputContainer.getChildren()[1].getCallbacks().pointerout();
}

export function createStoryModel() {
    let model = new Data.StoryModel();
    model.name = "TestStory"

    let asset1 = new Data.Asset()
    let pose1 = new Data.AssetPose()
    let pose2 = new Data.AssetPose()
    let pose3 = new Data.AssetPose()
    asset1.poseIds = [pose1.id, pose2.id, pose3.id];
    let asset2 = new Data.Asset()
    let pose4 = new Data.AssetPose()
    let pose5 = new Data.AssetPose()
    asset2.poseIds = [pose4.id, pose5.id];

    let imageAsset = new Data.Asset()

    let poseableAsset1 = new Data.PoseableAsset()
    poseableAsset1.assetId = asset1.id;
    let poseableAsset2 = new Data.PoseableAsset()
    poseableAsset2.assetId = asset1.id;
    let poseableAsset3 = new Data.PoseableAsset()
    poseableAsset3.assetId = asset1.id;
    model.poseableAssets.push(poseableAsset1);
    model.poseableAssets.push(poseableAsset2);
    model.poseableAssets.push(poseableAsset3);

    let picture = new Data.Picture();
    model.pictures.push(picture);

    model.assets.push(asset1);
    model.assets.push(asset2);
    model.assetPoses.push(pose1);
    model.assetPoses.push(pose2);
    model.assetPoses.push(pose3);
    model.assetPoses.push(pose4);
    model.assetPoses.push(pose5);
    model.assets.push(imageAsset);

    model.moments.push(new Data.Moment());

    model.moments[0].pictureIds.push(picture.id);

    model.moments[0].poseableAssetIds.push(poseableAsset1.id);
    model.moments[0].poseableAssetIds.push(poseableAsset2.id);
    model.moments[0].poseableAssetIds.push(poseableAsset3.id);

    return model;
}

export async function startXR() {
    global.XRRenderer.xr.eventListeners.sessionstart();
    let c0 = global.XRRenderer.xr.getController(0)
    c0.eventListeners.connected({ data: { handedness: c0.handedness } });
    let c1 = global.XRRenderer.xr.getController(1)
    c1.eventListeners.connected({ data: { handedness: c1.handedness } });
    await global.XRRenderer.animationLoop();
}

export async function stopXR() {
    global.XRRenderer.xr.getController(0).eventListeners.disconnected({ data: { handedness: 'left' } });
    global.XRRenderer.xr.getController(1).eventListeners.disconnected({ data: { handedness: 'right' } });
    global.XRRenderer.xr.eventListeners.sessionend();
}

export async function moveHead(x, y, z) {
    let camera = global.XRRenderer.lastRender.camera;
    camera.position.set(x, y, z);
}

export async function lookHead(x, y, z) {
    let camera = global.XRRenderer.lastRender.camera;
    camera.lookAt(x, y, z);
}

export async function moveXRController(left, x, y, z) {
    let controller = global.XRRenderer.xr.getSession().inputSources
        .find(s => s.handedness == (left ? 'left' : 'right'));
    let v = new THREE.Vector3();
    controller.getWorldPosition(v)
    // set the position with a slight offset for the tip
    let pos = new THREE.Vector3(x + (left ? - 0.005 : 0.005), y, z + 0.03);
    let moveTransform = pos.sub(v);
    controller.position.add(moveTransform);
    await global.XRRenderer.animationLoop();
}

export async function pressXRTrigger(left) {
    let controller = global.XRRenderer.xr.getSession().inputSources
        .find(s => s.handedness == (left ? 'left' : 'right'));
    controller.gamepad.buttons[0].pressed = true;
    await global.XRRenderer.xr.getSession().eventListeners.selectstart();
    await global.XRRenderer.animationLoop();
}

export async function releaseXRTrigger(left) {
    let controller = global.XRRenderer.xr.getSession().inputSources
        .find(s => s.handedness == (left ? 'left' : 'right'));
    controller.gamepad.buttons[0].pressed = false;
    await global.XRRenderer.xr.getSession().eventListeners.selectend();
    await global.XRRenderer.animationLoop();
}

export async function pushXRToggle(left, axes) {
    let controller = global.XRRenderer.xr.getSession().inputSources
        .find(s => s.handedness == (left ? 'left' : 'right'));
    controller.gamepad.axes = axes;
    await global.XRRenderer.animationLoop();
}

export async function releaseXRToggle(left) {
    let controller = global.XRRenderer.xr.getSession().inputSources
        .find(s => s.handedness == (left ? 'left' : 'right'));
    controller.gamepad.axes = [0, 0, 0, 0];
    await global.XRRenderer.animationLoop();
}