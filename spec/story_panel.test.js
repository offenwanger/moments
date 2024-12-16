
import { cleanup, setup } from './test_utils/test_environment.js';

import { clickButtonInput, createAndEditStory, testmodel } from './test_utils/test_actions.js';


describe('Test StoryPanel', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('init tests', function () {
        it('should open a story', async function () {
            await createAndEditStory();
        });
    });

    describe('add tests', function () {
        it('should add a moment', async function () {
            await createAndEditStory();
            expect(testmodel().moments.length == 1);
            await clickButtonInput('#story-moment-add-button');
            expect(testmodel().moments.length == 2);
        });
    });
});