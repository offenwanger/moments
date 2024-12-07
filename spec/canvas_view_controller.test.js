
import { cleanup, setup } from './test_utils/test_environment.js';

import { createAndOpenPoseableAsset, pointermove, pointerup, testmodel } from './test_utils/test_actions.js';



describe('Test Moment Panel', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('init tests', function () {
        it('should load a 3D model', async function () {
            await createAndOpenPoseableAsset();
        });
    });

    describe('target tests', function () {
        it('should target model mesh', async function () {
            await createAndOpenPoseableAsset();
            let poseableAsset = testmodel().find(testmodel().moments[0].poseableAssetIds[0]);

            expect(testmodel().assetPoses
                .find(p => p.name == "Cube" && poseableAsset.poseIds.includes(p.id)).x)
                .toBeCloseTo(0.6, 3);
            expect(testmodel().assetPoses
                .find(p => p.name == "Cube" && poseableAsset.poseIds.includes(p.id)).z)
                .toBeCloseTo(-1, 4);

            await pointermove({
                clientX: window.innerWidth,
                clientY: window.innerHeight / 2
            });

            await document.querySelector("#main-canvas").eventListeners.pointerdown({
                clientX: window.innerWidth,
                clientY: window.innerHeight / 2
            });

            await pointermove({
                clientX: window.innerWidth / 2 - 100,
                clientY: window.innerHeight / 2
            });

            await pointerup({
                clientX: window.innerWidth / 2 - 100,
                clientY: window.innerHeight / 2
            });

            expect(testmodel().assetPoses
                .find(p => p.name == "Cube" && poseableAsset.poseIds.includes(p.id)).x)
                .toBeCloseTo(-0.583, 3);
            expect(testmodel().assetPoses
                .find(p => p.name == "Cube" && poseableAsset.poseIds.includes(p.id)).z)
                .toBeCloseTo(-1.35, 3);
        });

        it('should drag skinnedmesh', async function () {
            await createAndOpenPoseableAsset();
            let poseableAsset = testmodel().find(testmodel().moments[0].poseableAssetIds[0]);

            expect(testmodel().assetPoses
                .find(p => p.name == "Bone" && poseableAsset.poseIds.includes(p.id)).x)
                .toBeCloseTo(0.004, 3);
            expect(testmodel().assetPoses
                .find(p => p.name == "Bone" && poseableAsset.poseIds.includes(p.id)).z)
                .toBeCloseTo(0.0, 4);

            await pointermove({
                clientX: window.innerWidth / 2,
                clientY: window.innerHeight / 2
            });

            await document.querySelector("#main-canvas").eventListeners.pointerdown({
                clientX: window.innerWidth / 2,
                clientY: window.innerHeight / 2
            });

            await pointermove({
                clientX: window.innerWidth / 2 - 100,
                clientY: window.innerHeight / 2
            });

            await pointerup({
                clientX: window.innerWidth / 2 - 100,
                clientY: window.innerHeight / 2
            });

            expect(testmodel().assetPoses
                .find(p => p.name == "Bone" && poseableAsset.poseIds.includes(p.id)).x)
                .toBeCloseTo(-0.185, 3);
            expect(testmodel().assetPoses
                .find(p => p.name == "Bone" && poseableAsset.poseIds.includes(p.id)).z)
                .toBeCloseTo(0.0179, 4);
        });
    });
});