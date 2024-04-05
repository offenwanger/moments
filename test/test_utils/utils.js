import { DataModel } from '../../js/data_model';
import { mockFileSystemDirectoryHandle } from './mock_filesystem';

async function createAndEditStory() {
    window.directories.push(new mockFileSystemDirectoryHandle('test'));
    await d3.select('#choose-folder-button').getCallbacks().click();
    await d3.select('#new-story-button').getCallbacks().click();
    await d3.select('.edit-story-button').getCallbacks().click();
}

async function createAndOpenMoment() {
    await createAndEditStory();
    await TestUtils.clickSidebarButton('#story-moments-add-button');
    expect(TestUtils.model().getStory().moments.length).toBe(1);
    await TestUtils.clickSidebarButton('#moment-button-' + TestUtils.model().getStory().moments[0].id);
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

async function clickSidebarButton(id) {
    let inputContainer = d3.select(id);
    expect(Object.keys(inputContainer.getCallbacks())).toEqual(['click', 'pointerup', 'pointerdown', 'pointerenter', 'pointerout']);
    await inputContainer.getCallbacks().pointerenter();
    await inputContainer.getCallbacks().pointerdown();
    await inputContainer.getCallbacks().pointerup();
    await inputContainer.getCallbacks().click();
    await inputContainer.getCallbacks().pointerout();
}

async function clickSidebarButton1(id) {
    let inputContainer = d3.select(id);
    expect(Object.keys(inputContainer.getChildren()).length).toBe(2);
    expect(Object.keys(inputContainer.getChildren()[0].getCallbacks())).toEqual(['click', 'pointerup', 'pointerdown', 'pointerenter', 'pointerout']);
    await inputContainer.getChildren()[0].getCallbacks().pointerenter();
    await inputContainer.getChildren()[0].getCallbacks().pointerdown();
    await inputContainer.getChildren()[0].getCallbacks().pointerup();
    await inputContainer.getChildren()[0].getCallbacks().click();
    await inputContainer.getChildren()[0].getCallbacks().pointerout();
}

async function clickSidebarButton2(id) {
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
    let storyFile = Object.keys(global.fileSystem).find(k => k.startsWith('test/Story_'))
    return DataModel.fromObject(JSON.parse(global.fileSystem[storyFile]))
}

export const TestUtils = {
    createAndEditStory,
    createAndOpenMoment,
    getInputValue,
    enterInputValue,
    clickSidebarButton,
    clickSidebarButton1,
    clickSidebarButton2,
    model,
}