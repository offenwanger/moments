import { cleanup, setup } from './test_utils/test_environment.js';

import { chooseFolder, testmodel } from './test_utils/test_actions.js';

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
            await chooseFolder();
            await document.querySelector('#new-story-button').eventListeners.click();
            expect(Object.keys(global.fileSystem)).toContain('test/workspace.json')
            expect(Object.keys(global.fileSystem).some(k => k.startsWith("test/Story_")))
        });
    });

    describe('init tests', function () {
        it('should open a story', async function () {
            expect(Object.keys(global.fileSystem)).toEqual([])
            await chooseFolder();
            await document.querySelector('#new-story-button').eventListeners.click();
            expect(Object.keys(global.fileSystem)).toContain('test/workspace.json')
            expect(Object.keys(global.fileSystem).some(k => k.startsWith("test/Story_")))
            await document.querySelector('#edit-' + testmodel().id).eventListeners.click();
            expect(window.location.href.includes("story="));
        });
    });
});