import { HTMLElement } from './test_utils/mock_html_element.js';
import { chooseFolder } from './test_utils/test_actions.js';
import { cleanup, setup } from './test_utils/test_environment.js';

describe('Test WelcomePage', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('init tests', function () {
        it('should have set click on choose-folder-button on initial setup', async function () {
            expect(Object.keys(document.querySelector('#choose-folder-button').eventListeners)).toEqual(['click']);
        });
    });

    describe('choose folder tests', function () {
        it('should load a new folder', async function () {
            await chooseFolder();
            // now we should be showing the list
            expect(document.querySelector('#new-story-button') instanceof HTMLElement).toBe(true);
        });
    });
});