
import { setup, cleanup } from './test_utils/test_environment.js';
import { createAndOpenModel3D, enterInputValue, getInputValue, testmodel } from './test_utils/test_actions.js';

describe('Test Moment Panel', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('init tests', function () {
        it('should open a model3D panel', async function () {
            await createAndOpenModel3D();
        });
    });

    describe('edit tests', function () {
        it('should update model name', async function () {
            await createAndOpenModel3D();
            expect(getInputValue("#model3D-name-input")).toBe('sample.glb');
            expect(testmodel().model3Ds[0].name).toBe('sample.glb');
            await enterInputValue("#model3D-name-input", 'new name')
            expect(getInputValue("#model3D-name-input")).toBe('new name');
            expect(testmodel().model3Ds[0].name).toBe("new name");
        });
    });
});