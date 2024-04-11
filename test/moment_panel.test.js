
import { mockFileSystemFileHandle } from './test_utils/mock_filesystem.js';
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
        it('should open a moment panel', async function () {
            await TestUtils.createAndOpenMoment();
        });
    });

    describe('add tests', function () {
        it('should add a moment model3D', async function () {
            await TestUtils.createAndOpenMoment();
            // this appears to work, yet theoretically it's not guarentted the promise 
            // will have done it's setup before call the next function.
            global.fileSystem['test.glb'] = "glbstuff";
            window.files.push(new mockFileSystemFileHandle('test.glb'));
            let promise = TestUtils.clickButtonInput('#moment-model3D-add-button');
            await TestUtils.clickButtonInput('#asset-add-button');
            await promise;
            expect(TestUtils.model().getStory().moments.length).toBe(1);
            expect(TestUtils.model().getStory().moments[0].model3Ds.length).toBe(1);
            window.files.push(new mockFileSystemFileHandle('test.glb'));
            promise = TestUtils.clickButtonInput('#moment-model3D-add-button');
            await TestUtils.clickButtonInput('#asset-add-button');
            await promise;
            window.files.push(new mockFileSystemFileHandle('test.glb'));
            promise = TestUtils.clickButtonInput('#moment-model3D-add-button');
            await TestUtils.clickButtonInput('#asset-add-button');
            await promise;
            expect(TestUtils.model().getStory().moments[0].model3Ds.length).toBe(3);
        });

        it('should add a moment annotation', async function () {
            await TestUtils.createAndOpenMoment();
            await TestUtils.clickButtonInput('#moment-annotations-add-button');
            expect(TestUtils.model().getStory().moments.length).toBe(1);
            expect(TestUtils.model().getStory().moments[0].annotations.length).toBe(1);
            await TestUtils.clickButtonInput('#moment-annotations-add-button');
            await TestUtils.clickButtonInput('#moment-annotations-add-button');
            expect(TestUtils.model().getStory().moments[0].annotations.length).toBe(3);
        });
    });

    describe('edit tests', function () {
        it('should update moment name', async function () {
            await TestUtils.createAndOpenMoment();
            expect(TestUtils.getInputValue("#moment-name-input")).toBe('Moment');
            expect(TestUtils.model().getStory().moments[0].name).toBe("Moment");
            await TestUtils.enterInputValue("#moment-name-input", 'new name')
            expect(TestUtils.getInputValue("#moment-name-input")).toBe('new name');
            expect(TestUtils.model().getStory().moments[0].name).toBe("new name");
        });

        it('should toggle storyline', async function () {
            await TestUtils.createAndOpenMoment();
            expect(TestUtils.getInputValue("#moment-storyline-input")).toBe(true);
            expect(TestUtils.model().getStory().moments[0].storyline).toBe(true);
            await TestUtils.enterInputValue("#moment-storyline-input", false)
            expect(TestUtils.getInputValue("#moment-storyline-input")).toBe(false);
            expect(TestUtils.model().getStory().moments[0].storyline).toBe(false);
        });

        it('should toggle framed', async function () {
            await TestUtils.createAndOpenMoment();
            expect(TestUtils.getInputValue("#moment-framed-input")).toBe(true);
            expect(TestUtils.model().getStory().moments[0].framed).toBe(true);
            await TestUtils.enterInputValue("#moment-framed-input", false)
            expect(TestUtils.getInputValue("#moment-framed-input")).toBe(false);
            expect(TestUtils.model().getStory().moments[0].framed).toBe(false);
        });
    });
});