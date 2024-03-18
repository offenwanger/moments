import * as chai from 'chai';

import { setup, cleanup } from './test_utils/test_environment.js';
import { MockElement } from './test_utils/mock_d3.js';
import { mockFileSystemDirectoryHandle } from './test_utils/mock_filesystem.js';

let assert = chai.assert;
let expect = chai.expect;

describe('Test WelcomePage', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('init tests', function () {
        it('should have set click on choose-folder-button on initial setup', async function () {
            expect(Object.keys(d3.select('#choose-folder-button').getCallbacks())).to.eql(["click"]);
        });
    });

    describe('choose folder tests', function () {
        it('should load a new folder', async function () {
            window.directories.push(new mockFileSystemDirectoryHandle('test'));
            await d3.select('#choose-folder-button').getCallbacks().click();
            expect(d3.select('#choose-folder-button')).to.eql(null);
            // now we should be showing the list
            assert.isTrue(d3.select('#new-story-button') instanceof MockElement);
        });
    });
});