
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
}

export async function createAndOpenModel3D() {
    await createAndEditStory();

    await loadRealFile('sample.glb')
    window.files.push(new mockFile('sample.glb', global.fileSystem['sample.glb']));
    let promise = clickButtonInput('#story-model3D-add-button');
    await clickButtonInput('#asset-add-button');
    expect(d3.select('#assets-container').getChildren().length).toBeGreaterThan(0);
    d3.select('#assets-container').getChildren()[0].getCallbacks().click();

    await promise;

    expect(testmodel().model3Ds.length).toBe(1);
    await clickButtonInput('#model3D-button-' + testmodel().model3Ds[0].id);
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

    let annotation = new Data.Annotation();

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

    model.annotations.push(annotation)

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