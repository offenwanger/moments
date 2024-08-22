
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
            await TestUtils.createAndOpenModel3D();
        });
    });

    describe('edit tests', function () {
        it('should update model name', async function () {
            await TestUtils.createAndOpenModel3D();
            expect(TestUtils.getInputValue("#model3D-name-input")).toBe('test.glb');
            expect(TestUtils.model().model3Ds[0].name).toBe('test.glb');
            await TestUtils.enterInputValue("#model3D-name-input", 'new name')
            expect(TestUtils.getInputValue("#model3D-name-input")).toBe('new name');
            expect(TestUtils.model().model3Ds[0].name).toBe("new name");
        });
    });
});