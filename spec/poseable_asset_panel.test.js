
import { setup, cleanup } from './test_utils/test_environment.js';
import { createAndOpenPoseableAsset, enterInputValue, getInputValue, testmodel } from './test_utils/test_actions.js';

describe('Test PoseableAsset Panel', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('init tests', function () {
        it('should open a poseableAsset panel', async function () {
            await createAndOpenPoseableAsset();
        });
    });

    describe('edit tests', function () {
        it('should update asset name', async function () {
            await createAndOpenPoseableAsset();
            expect(getInputValue("#poseableAsset-name-input")).toBe('sample.glb');
            expect(testmodel().find(testmodel().moments[0].poseableAssetIds[0]).name).toBe('sample.glb');
            await enterInputValue("#poseableAsset-name-input", 'new name')
            expect(getInputValue("#poseableAsset-name-input")).toBe('new name');
            expect(testmodel().find(testmodel().moments[0].poseableAssetIds[0]).name).toBe("new name");
        });
    });
});