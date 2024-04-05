import { DataModel } from '../../js/data_model';
import { mockFileSystemDirectoryHandle } from './mock_filesystem';

async function createAndEditStory() {
    window.directories.push(new mockFileSystemDirectoryHandle('test'));
    await d3.select('#choose-folder-button').getCallbacks().click();
    await d3.select('#new-story-button').getCallbacks().click();
    await d3.select('.edit-story-button').getCallbacks().click();
}

async function clickSidebarButton(id) {
    let inputContainer = d3.select(id);
    expect(Object.keys(inputContainer.getChildren()[0].getCallbacks())).toEqual(['click', 'pointerup', 'pointerdown', 'pointerenter', 'pointerout']);
    await inputContainer.getChildren()[0].getCallbacks().pointerenter();
    await inputContainer.getChildren()[0].getCallbacks().pointerdown();
    await inputContainer.getChildren()[0].getCallbacks().pointerup();
    await inputContainer.getChildren()[0].getCallbacks().click();
    await inputContainer.getChildren()[0].getCallbacks().pointerout();
}

function model() {
    let storyFile = Object.keys(global.fileSystem).find(k => k.startsWith('test/Story_'))
    return DataModel.fromObject(JSON.parse(global.fileSystem[storyFile]))
}

export const TestUtils = {
    createAndEditStory,
    clickSidebarButton,
    model,
}