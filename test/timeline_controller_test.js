import * as chai from 'chai';

import { setup, cleanup } from './test_utils/test_environment.js';
import { mockFileSystemDirectoryHandle } from './test_utils/mock_filesystem.js';
import { DataModel } from '../js/data_model.js';

let assert = chai.assert;
let expect = chai.expect;

describe('Test TimelineController', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('add moment test', function () {
        it('should create a moment', async function () {
            expect(Object.keys(global.fileSystem)).to.eql([])
            window.directories.push(new mockFileSystemDirectoryHandle('test'));
            await d3.select('#choose-folder-button').getCallbacks().click();
            await d3.select('#new-story-button').getCallbacks().click();
            await d3.select('.edit-story-button').getCallbacks().click();
            await d3.select('#add-moment-button').getCallbacks().click();

            expect(Object.keys(global.fileSystem)).to.include('test/workspace.json')
            let storyFile = Object.keys(global.fileSystem).find(k => k.startsWith("test/Story_"))
            let model = DataModel.fromObject(JSON.parse(global.fileSystem[storyFile]))
            assert.equal(model.getStory().storyline.moments.length, 1);

            await d3.select('#add-moment-button').getCallbacks().click();
            await d3.select('#add-moment-button').getCallbacks().click();
            storyFile = Object.keys(global.fileSystem).find(k => k.startsWith("test/Story_"))
            model = DataModel.fromObject(JSON.parse(global.fileSystem[storyFile]))
            assert.equal(model.getStory().storyline.moments.length, 3);
        });
    })

});