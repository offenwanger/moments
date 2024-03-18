import { setup, cleanup } from './test_utils/test_environment.js';
import { MockElement } from './test_utils/mock_d3.js';
import { mockFileSystemDirectoryHandle } from './test_utils/mock_filesystem.js';

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
            await d3.select('#choose-folder-button').getCallbacks().click();
            await d3.select('#new-story-button').getCallbacks().click();
            expect(Object.keys(global.fileSystem)).toContain('test/workspace.json')
            expect(Object.keys(global.fileSystem).some(k => k.startsWith("test/Story_")))
        });
    });

    describe('init tests', function () {
        it('should open a story', async function () {
            expect(Object.keys(global.fileSystem)).toEqual([])
            window.directories.push(new mockFileSystemDirectoryHandle('test'));
            await d3.select('#choose-folder-button').getCallbacks().click();
            await d3.select('#new-story-button').getCallbacks().click();
            expect(Object.keys(global.fileSystem)).toContain('test/workspace.json')
            expect(Object.keys(global.fileSystem).some(k => k.startsWith("test/Story_")))
            await d3.select('.edit-story-button').getCallbacks().click();
            expect(Object.keys(d3.select('#add-moment-button').getCallbacks())).toEqual(["mouseover", "mouseout", "pointerdown", "click"]);
        });
    });
});