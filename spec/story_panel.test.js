
import { cleanup, setup } from './test_utils/test_environment.js';

import { loadRealFile, mockFileSystemFileHandle } from './test_utils/mock_filesystem.js';
import { clickButtonInput, createAndEditStory, testmodel } from './test_utils/test_actions.js';


describe('Test ListPage', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('init tests', function () {
        it('should open a story', async function () {
            await createAndEditStory();
        });
    });

    describe('add tests', function () {
        it('should add a story annotation', async function () {
            await createAndEditStory();
            await clickButtonInput('#story-annotations-add-button');
            expect(testmodel().annotations.length).toBe(1);
            await clickButtonInput('#story-annotations-add-button');
            await clickButtonInput('#story-annotations-add-button');
            expect(testmodel().annotations.length).toBe(3);
        });

        it('should add a story model3D', async function () {
            await createAndEditStory();
            await loadRealFile('sample.glb');
            window.files.push(new mockFileSystemFileHandle('sample.glb'));
            let promise = clickButtonInput('#story-model3D-add-button');
            await clickButtonInput('#asset-add-button');
            await promise;
            expect(testmodel().model3Ds.length).toBe(1);
            window.files.push(new mockFileSystemFileHandle('sample.glb'));
            promise = clickButtonInput('#story-model3D-add-button');
            await clickButtonInput('#asset-add-button');
            await promise;
            window.files.push(new mockFileSystemFileHandle('sample.glb'));
            promise = clickButtonInput('#story-model3D-add-button');
            await clickButtonInput('#asset-add-button');
            await promise;
            expect(testmodel().model3Ds.length).toBe(3);
        });
    });
});