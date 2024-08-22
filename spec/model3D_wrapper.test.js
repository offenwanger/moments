
import { setup, cleanup } from './test_utils/test_environment.js';

import { TestUtils } from './test_utils/utils.js';

describe('Test Moment Panel', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('init tests', function () {
        it('should load a 3D model', async function () {
            await TestUtils.createAndOpenModel3D();
        });
    });

    describe('target tests', function () {
        it('should target model mesh', async function () {
            await TestUtils.createAndOpenModel3D();
            await window.callbacks.pointermove({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 })

            expect('done').toBe('true');
        });

        it('should drag skinnedmesh', async function () {
            await TestUtils.createAndOpenModel3D();
            let model3D = TestUtils.model().model3Ds[0];

            expect(TestUtils.model().assetPoses
                .find(p => p.name == "Bone0" && model3D.poseIds.includes(p.id)).x)
                .toBe(0);

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

            expect(TestUtils.model().assetPoses
                .find(p => p.name == "Bone0" && model3D.poseIds.includes(p.id)).x)
                .toBe(-0.48);
        });
    });
});