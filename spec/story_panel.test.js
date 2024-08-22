
import { setup, cleanup } from './test_utils/test_environment.js';

import { mockFileSystemFileHandle } from './test_utils/mock_filesystem.js';
import { TestUtils } from './test_utils/utils.js';

describe('Test ListPage', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('init tests', function () {
        it('should open a story', async function () {
            await TestUtils.createAndEditStory();
        });
    });

    describe('add tests', function () {
        it('should add a story annotation', async function () {
            await TestUtils.createAndEditStory();
            await TestUtils.clickButtonInput('#story-annotations-add-button');
            expect(TestUtils.model().annotations.length).toBe(1);
            await TestUtils.clickButtonInput('#story-annotations-add-button');
            await TestUtils.clickButtonInput('#story-annotations-add-button');
            expect(TestUtils.model().annotations.length).toBe(3);
        });

        it('should add a story model3D', async function () {
            await TestUtils.createAndEditStory();
            global.fileSystem['test.glb'] = "glbstuff";
            window.files.push(new mockFileSystemFileHandle('test.glb'));
            let promise = TestUtils.clickButtonInput('#story-model3D-add-button');
            await TestUtils.clickButtonInput('#asset-add-button');
            await promise;
            expect(TestUtils.model().model3Ds.length).toBe(1);
            window.files.push(new mockFileSystemFileHandle('test.glb'));
            promise = TestUtils.clickButtonInput('#story-model3D-add-button');
            await TestUtils.clickButtonInput('#asset-add-button');
            await promise;
            window.files.push(new mockFileSystemFileHandle('test.glb'));
            promise = TestUtils.clickButtonInput('#story-model3D-add-button');
            await TestUtils.clickButtonInput('#asset-add-button');
            await promise;
            expect(TestUtils.model().model3Ds.length).toBe(3);
        });
    });
});