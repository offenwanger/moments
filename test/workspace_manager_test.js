import * as chai from 'chai';

import { setup, cleanup } from './test_utils/test_environment.js';
import { mockFileSystemDirectoryHandle } from './test_utils/mock_filesystem.js';

import { WorkspaceManager } from '../js/workspace_manager.js';
import { Story } from '../js/data_structs.js';
import { STORY_JSON_FILE, WORKSPACE_DATA_FILE } from '../js/constants.js';
import { DataModel } from '../js/data_model.js';

let assert = chai.assert;
let expect = chai.expect;

describe('Test WorkspaceManager', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })
    
    describe('test initialization', function () {
        it('should inialize without error', async function () {
            let fileHandle = new mockFileSystemDirectoryHandle('test');
            let workspace = new WorkspaceManager(fileHandle);
            await workspace.getStoryList();
        });

        it('should create its workspace file', async function () {
            let dir = "" + Math.round(Math.random() * 10000);
            let fileHandle = new mockFileSystemDirectoryHandle(dir);
            let workspace = new WorkspaceManager(fileHandle);
            await workspace.newStory('someId');
            expect(global.fileSystem[dir + "/workspace.json"]).to.eql(JSON.stringify({ "storyIds": ["someId"] }));
        });
    })

    describe('story read/write tests', function () {
        it('should write a story file', async function () {
            let dir = "" + Math.round(Math.random() * 10000);
            let fileHandle = new mockFileSystemDirectoryHandle(dir);
            let workspace = new WorkspaceManager(fileHandle);
            let model = new DataModel();
            await workspace.newStory(model.getStory().id);
            await workspace.updateStory(model);
            expect(global.fileSystem[dir + "/" + WORKSPACE_DATA_FILE]).to.eql(JSON.stringify({ "storyIds": [model.getStory().id] }));
            expect(global.fileSystem[dir + "/" + model.getStory().id + "/" + STORY_JSON_FILE]).to.eql(JSON.stringify(model.toObject()));
        });

        it('should get a list of stories', async function () {
            let dir = "" + Math.round(Math.random() * 10000);
            let fileHandle = new mockFileSystemDirectoryHandle(dir);
            let workspace = new WorkspaceManager(fileHandle);
            let model = new DataModel();
            model.getStory().name = "Name1";
            await workspace.newStory(model.getStory().id);
            await workspace.updateStory(model);
            model = new DataModel();
            model.getStory().name = "Name2";
            await workspace.newStory(model.getStory().id);
            await workspace.updateStory(model);
            model = new DataModel();
            model.getStory().name = "Name3";
            await workspace.newStory(model.getStory().id);
            await workspace.updateStory(model);
            expect(JSON.parse(global.fileSystem[dir + "/" + WORKSPACE_DATA_FILE]).storyIds.length).to.eql(3);
            expect((await workspace.getStoryList()).map(i => i.name)).to.eql(['Name1', 'Name2', 'Name3']);
        });
    });

});