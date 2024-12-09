
import { cleanup, setup } from './test_utils/test_environment.js';

import { canvaspointerdown, createAndOpenPoseableAsset, lookHead, moveHead, pointermove, pointerup, testmodel } from './test_utils/test_actions.js';



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
            let poseableAsset = testmodel()
                .find(testmodel().moments[0].poseableAssetIds[0]);
            let cubeData = testmodel().assetPoses.find(p =>
                p.name == "Cube" && poseableAsset.poseIds.includes(p.id))
            expect(cubeData.x).toBeCloseTo(0.6, 3);
            expect(cubeData.y).toBeCloseTo(0, 4);
            expect(cubeData.z).toBeCloseTo(-1, 4);

            let canvas = document.querySelector('#main-canvas');

            await moveHead(0.6, 0, 0)
            await lookHead(cubeData.x, cubeData.y, cubeData.z)

            await pointermove(canvas.width / 2, canvas.height / 2);
            await canvaspointerdown(canvas.width / 2, canvas.height / 2)
            await pointermove(canvas.width / 2 - 100, canvas.height / 2);
            await pointerup(canvas.width / 2 - 100, canvas.height / 2);


            cubeData = testmodel().assetPoses.find(p =>
                p.name == "Cube" && poseableAsset.poseIds.includes(p.id))
            expect(cubeData.x).toBeCloseTo(0.4116, 3);
            expect(cubeData.y).toBeCloseTo(0, 4);
            expect(cubeData.z).toBeCloseTo(-0.9821, 3);
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

            let canvas = document.querySelector('#main-canvas');

            await pointermove(canvas.width / 2, canvas.height / 2);
            await canvaspointerdown(canvas.width / 2, canvas.height / 2)
            await pointermove(canvas.width / 2 - 100, canvas.height / 2);
            await pointerup(canvas.width / 2 - 100, canvas.height / 2);

            expect(testmodel().assetPoses
                .find(p => p.name == "Bone" && poseableAsset.poseIds.includes(p.id)).x)
                .toBeCloseTo(-0.185, 3);
            expect(testmodel().assetPoses
                .find(p => p.name == "Bone" && poseableAsset.poseIds.includes(p.id)).z)
                .toBeCloseTo(0.0172, 3);
        });
    });
});