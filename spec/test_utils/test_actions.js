
import * as THREE from 'three';
import { Data } from '../../js/data.js';
import { loadRealFile, mockFile, mockFileSystemDirectoryHandle } from './mock_filesystem.js';
import { AssetTypes, MenuNavButtons } from '../../js/constants.js';
import { forceIntercept } from './mock_three.js';

export function testmodel() {
    let storyFile = Object.keys(global.fileSystem).find(k => k.startsWith('test/StoryModel_'))
    return Data.StoryModel.fromObject(JSON.parse(global.fileSystem[storyFile]))
}

export async function canvaspointerdown(x, y) {
    await document.querySelector("#main-canvas").eventListeners.pointerdown({
        clientX: x,
        clientY: y
    });
}

export async function pointermove(x, y) {
    if (!window.callbacks.pointermove) console.error("No callbacks registered for pointermove");
    for (let cb of window.callbacks.pointermove)
        await cb({ clientX: x, clientY: y });
}

export async function pointerup(x, y) {
    if (!window.callbacks.pointerup) console.error("No callbacks registered for pointerup");
    for (let cb of window.callbacks.pointerup)
        await cb({ clientX: x, clientY: y });
}

export async function chooseFolder() {
    window.directories.push(new mockFileSystemDirectoryHandle('test'));
    await document.querySelector('#choose-folder-button').eventListeners.click();
    await window.mainFunc();
}

export async function createAndOpenStoryMoment() {
    await chooseFolder();
    await document.querySelector('#new-story-button').eventListeners.click();
    await document.querySelector('#edit-' + testmodel().id).eventListeners.click();
    await window.mainFunc();
    expect(testmodel().moments.length).toBe(1);
    await clickButtonInput('#moment-button-' + testmodel().moments[0].id);
}

export async function createAndOpenPoseableAsset() {
    await createAndOpenStoryMoment();

    await loadRealFile('sample.glb')
    window.files.push(new mockFile('sample.glb', "model/gltf-binary", global.fileSystem['sample.glb']));
    await clickButtonInput('#asset-manager-button');
    await clickButtonInput('#asset-add-button');
    await clickButtonInput('#dialog-close-button');

    let assetId = testmodel().assets.find(a => a.type == AssetTypes.MODEL).id;

    await canvasClickMenuButton(MenuNavButtons.ADD);
    await canvasClickMenuButton(MenuNavButtons.ADD_MODEL);
    await canvasClickMenuButton(assetId);

    expect(document.querySelector('#assets-container').children.length).toBeGreaterThan(0);
    document.querySelector('#assets-container').children[0].eventListeners.click();

    expect(testmodel().moments[0].poseableAssetIds.length).toBe(1);
    await clickButtonInput('#poseable-asset-button-' + testmodel().moments[0].poseableAssetIds[0]);
}

export async function uploadImageAsset() {
    await loadRealFile('fish.png')
    window.files.push(new mockFile('fish.png', "image/x-png", global.fileSystem['fish.png']));
    await clickButtonInput('#asset-manager-button');
    await clickButtonInput('#asset-add-button');
    await clickButtonInput('#dialog-close-button');

    expect(document.querySelector('#assets-container').children.length).toBeGreaterThan(0);
    expect(testmodel().assets.filter(a => a.type == AssetTypes.IMAGE).length).toBeGreaterThan(0);
    document.querySelector('#assets-container').children[0].eventListeners.click();
}

export async function canvasClickMenuButton(buttonId) {
    forceIntercept(buttonId);
    await pointermove(0, 0);
    await canvaspointerdown(0, 0);
    await pointerup(0, 0);
    forceIntercept(null);
}

export function getInputValue(id) {
    let inputContainer = document.querySelector(id);
    expect(Object.keys(inputContainer.children).length).toBe(2);
    let input = inputContainer.children[1];
    if (input.attrs['type'] == 'text' || input.attrs['type'] == 'number') {
        return input.value;
    } else if (input.attrs['type'] == 'checkbox') {
        return input.checked;
    } else {
        console.error("Not a valid type", input.attrs['type'])
    }
}

export async function enterInputValue(id, value) {
    let inputContainer = document.querySelector(id);
    expect(Object.keys(inputContainer.children).length).toBe(2);
    let input = inputContainer.children[1];
    if (input.attrs['type'] == 'text' || input.attrs['type'] == 'number') {
        input.value = value;
        await input.eventListeners.blur();
    } else if (input.attrs['type'] == 'checkbox') {
        input.checked = value;
        await input.eventListeners.change();
    } else {
        console.error("Not a valid type", input.attrs['type'])
    }
}

export async function clickButtonInput(id) {
    let inputContainer = document.querySelector(id);
    expect(Object.keys(inputContainer.eventListeners)).toEqual(['click', 'pointerup', 'pointerdown', 'pointerenter', 'pointerout']);
    await inputContainer.eventListeners.pointerenter();
    await inputContainer.eventListeners.pointerdown();
    await inputContainer.eventListeners.pointerup();
    await inputContainer.eventListeners.click();
    await inputContainer.eventListeners.pointerout();
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
    await document.querySelector('#enter-vr-button').eventListeners.click();
    let c0 = global.navigator.xr.getController(0)
    c0.eventListeners.connected({ data: { handedness: c0.handedness } });
    let c1 = global.navigator.xr.getController(1)
    c1.eventListeners.connected({ data: { handedness: c1.handedness } });
    await global.test_rendererAccess.animationLoop();
}

export async function stopXR() {
    global.navigator.xr.getController(0).eventListeners.disconnected({ data: { handedness: 'left' } });
    global.navigator.xr.getController(1).eventListeners.disconnected({ data: { handedness: 'right' } });
    global.navigator.xr.eventListeners.sessionend();
}

export async function moveHead(x, y, z) {
    await global.test_rendererAccess.animationLoop();
    let camera = global.test_rendererAccess.lastRender.camera;
    camera.updateWorldMatrix()
    camera.position.set(x, y, z);
    camera.updateWorldMatrix()
    await global.test_rendererAccess.animationLoop();
}

export async function lookHead(x, y, z) {
    await global.test_rendererAccess.animationLoop();
    let camera = global.test_rendererAccess.lastRender.camera;
    camera.updateWorldMatrix()
    camera.lookAt(x, y, z);
    camera.updateWorldMatrix()
    await global.test_rendererAccess.animationLoop();
}

export async function moveXRController(left, x, y, z) {
    let controller = global.navigator.xr.getSession().inputSources
        .find(s => s.handedness == (left ? 'left' : 'right'));
    let v = new THREE.Vector3();
    controller.getWorldPosition(v)
    // set the position with a slight offset for the tip
    let pos = new THREE.Vector3(x + (left ? - 0.005 : 0.005), y, z + 0.03);
    let moveTransform = pos.sub(v);
    controller.position.add(moveTransform);
    await global.test_rendererAccess.animationLoop();
}

export async function pressXRTrigger(left) {
    let controller = global.navigator.xr.getSession().inputSources
        .find(s => s.handedness == (left ? 'left' : 'right'));
    controller.gamepad.buttons[0].pressed = true;
    await global.navigator.xr.getSession().eventListeners.selectstart();
    await global.test_rendererAccess.animationLoop();
}

export async function releaseXRTrigger(left) {
    let controller = global.navigator.xr.getSession().inputSources
        .find(s => s.handedness == (left ? 'left' : 'right'));
    controller.gamepad.buttons[0].pressed = false;
    await global.navigator.xr.getSession().eventListeners.selectend();
    await global.test_rendererAccess.animationLoop();
}

export async function pushXRToggle(left, axes) {
    let controller = global.navigator.xr.getSession().inputSources
        .find(s => s.handedness == (left ? 'left' : 'right'));
    controller.gamepad.axes = axes;
    await global.test_rendererAccess.animationLoop();
}

export async function releaseXRToggle(left) {
    let controller = global.navigator.xr.getSession().inputSources
        .find(s => s.handedness == (left ? 'left' : 'right'));
    controller.gamepad.axes = [0, 0, 0, 0];
    await global.test_rendererAccess.animationLoop();
}