
import { setup, cleanup } from './test_utils/test_environment.js';

import { createAndOpenModel3D, testmodel } from './test_utils/test_actions.js';



describe('Test Moment Panel', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('init tests', function () {
        it('should load a 3D model', async function () {
            await createAndOpenModel3D();
        });
    });

    describe('target tests', function () {
        it('should target model mesh', async function () {
            await createAndOpenModel3D();
            let model3D = testmodel().model3Ds[0];

            expect(testmodel().assetPoses
                .find(p => p.name == "Cube" && model3D.poseIds.includes(p.id)).x)
                .toBeCloseTo(0.6, 3);
            expect(testmodel().assetPoses
                .find(p => p.name == "Cube" && model3D.poseIds.includes(p.id)).z)
                .toBeCloseTo(-1, 4);

            await window.callbacks.pointermove({
                clientX: window.innerWidth,
                clientY: window.innerHeight / 2
            });

            await d3.select("#main-canvas").getCallbacks().pointerdown({
                clientX: window.innerWidth,
                clientY: window.innerHeight / 2
            });

            await window.callbacks.pointermove({
                clientX: window.innerWidth / 2 - 100,
                clientY: window.innerHeight / 2
            });

            await window.callbacks.pointerup({
                clientX: window.innerWidth / 2 - 100,
                clientY: window.innerHeight / 2
            });

            expect(testmodel().assetPoses
                .find(p => p.name == "Cube" && model3D.poseIds.includes(p.id)).x)
                .toBeCloseTo(-0.583, 3);
            expect(testmodel().assetPoses
                .find(p => p.name == "Cube" && model3D.poseIds.includes(p.id)).z)
                .toBeCloseTo(-1.35, 3);
        });

        it('should drag skinnedmesh', async function () {
            await createAndOpenModel3D();
            let model3D = testmodel().model3Ds[0];

            expect(testmodel().assetPoses
                .find(p => p.name == "Bone" && model3D.poseIds.includes(p.id)).x)
                .toBeCloseTo(0.004, 3);
            expect(testmodel().assetPoses
                .find(p => p.name == "Bone" && model3D.poseIds.includes(p.id)).z)
                .toBeCloseTo(0.0, 4);

            await window.callbacks.pointermove({
                clientX: window.innerWidth / 2,
                clientY: window.innerHeight / 2
            });

            await d3.select("#main-canvas").getCallbacks().pointerdown({
                clientX: window.innerWidth / 2,
                clientY: window.innerHeight / 2
            });

            await window.callbacks.pointermove({
                clientX: window.innerWidth / 2 - 100,
                clientY: window.innerHeight / 2
            });

            await window.callbacks.pointerup({
                clientX: window.innerWidth / 2 - 100,
                clientY: window.innerHeight / 2
            });

            expect(testmodel().assetPoses
                .find(p => p.name == "Bone" && model3D.poseIds.includes(p.id)).x)
                .toBeCloseTo(-0.185, 3);
            expect(testmodel().assetPoses
                .find(p => p.name == "Bone" && model3D.poseIds.includes(p.id)).z)
                .toBeCloseTo(0.0179, 4);
        });
    });
});