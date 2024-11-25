import { cleanup, setup } from './test_utils/test_environment.js';

import { mockFileSystemDirectoryHandle } from './test_utils/mock_filesystem.js';
import { testmodel } from './test_utils/test_actions.js';

describe('Test ListPage', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('init tests', function () {
        it('should create a story', async function () {
            expect(Object.keys(global.fileSystem)).toEqual([])
            window.directories.push(new mockFileSystemDirectoryHandle('test'));
            await document.querySelector('#choose-folder-button').eventListeners.click();
            await document.querySelector('#new-story-button').eventListeners.click();
            expect(Object.keys(global.fileSystem)).toContain('test/workspace.json')
            expect(Object.keys(global.fileSystem).some(k => k.startsWith("test/Story_")))
        });
    });

    describe('init tests', function () {
        it('should open a story', async function () {
            expect(Object.keys(global.fileSystem)).toEqual([])
            window.directories.push(new mockFileSystemDirectoryHandle('test'));
            await document.querySelector('#choose-folder-button').eventListeners.click();
            await document.querySelector('#new-story-button').eventListeners.click();
            expect(Object.keys(global.fileSystem)).toContain('test/workspace.json')
            expect(Object.keys(global.fileSystem).some(k => k.startsWith("test/Story_")))
            await document.querySelector('#edit-' + testmodel().id).eventListeners.click();
            expect(window.location.search.includes("story="));
        });
    });
});