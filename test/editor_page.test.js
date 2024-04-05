
import { setup, cleanup } from './test_utils/test_environment.js';
import { TestUtils } from './test_utils/utils.js';

describe('Test ListPage', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('init tests', function () {
        it('should open a story', async function () {
            await TestUtils.createAndEditStory();
        });
    });

    describe('add tests', function () {
        it('should add a story moment', async function () {
            await TestUtils.createAndEditStory();
            await TestUtils.clickSidebarButton('#story-moments-add-button');
            expect(TestUtils.model().getStory().moments.length).toBe(1);
            await TestUtils.clickSidebarButton('#story-moments-add-button');
            await TestUtils.clickSidebarButton('#story-moments-add-button');
            expect(TestUtils.model().getStory().moments.length).toBe(3);
        });

        it('should add a story annotation', async function () {
            await TestUtils.createAndEditStory();
            await TestUtils.clickSidebarButton('#story-annotations-add-button');
            expect(TestUtils.model().getStory().annotations.length).toBe(1);
            await TestUtils.clickSidebarButton('#story-annotations-add-button');
            await TestUtils.clickSidebarButton('#story-annotations-add-button');
            expect(TestUtils.model().getStory().annotations.length).toBe(3);
        });

        it('should add a story model3D', async function () {
            await TestUtils.createAndEditStory();
            await TestUtils.clickSidebarButton('#story-model3D-add-button');
            expect(TestUtils.model().getStory().model3Ds.length).toBe(1);
            await TestUtils.clickSidebarButton('#story-model3D-add-button');
            await TestUtils.clickSidebarButton('#story-model3D-add-button');
            expect(TestUtils.model().getStory().model3Ds.length).toBe(3);
        });
    });
});