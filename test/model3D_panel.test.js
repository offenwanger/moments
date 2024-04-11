
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
        it('should open a model3D panel', async function () {
            await TestUtils.createAndOpenMomentModel3D();
        });
    });

    describe('edit tests', function () {
        it('should update model name', async function () {
            await TestUtils.createAndOpenMomentModel3D();
            expect(TestUtils.getInputValue("#model3D-name-input")).toBe('test.glb');
            expect(TestUtils.model().getStory().moments[0].model3Ds[0].name).toBe('test.glb');
            await TestUtils.enterInputValue("#model3D-name-input", 'new name')
            expect(TestUtils.getInputValue("#model3D-name-input")).toBe('new name');
            expect(TestUtils.model().getStory().moments[0].model3Ds[0].name).toBe("new name");
        });

        it('should update x value', async function () {
            await TestUtils.createAndOpenMomentModel3D();
            expect(TestUtils.getInputValue("#model3D-position-x-input")).toBe(0);
            expect(TestUtils.model().getStory().moments[0].model3Ds[0].x).toBe(0);
            await TestUtils.enterInputValue("#model3D-position-x-input", '10')
            expect(TestUtils.getInputValue("#model3D-position-x-input")).toBe(10);
            expect(TestUtils.model().getStory().moments[0].model3Ds[0].x).toBe(10);
        });
    });
});