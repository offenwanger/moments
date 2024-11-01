
import { cleanup, setup } from './test_utils/test_environment.js';

import { loadRealFile, mockFile } from './test_utils/mock_filesystem.js';
import { clickButtonInput, createAndEditStory, testmodel } from './test_utils/test_actions.js';


describe('Test ListPage', function () {
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
        it('should add a story annotation', async function () {
            await createAndEditStory();
            await clickButtonInput('#story-annotations-add-button');
            expect(testmodel().annotations.length).toBe(1);
            await clickButtonInput('#story-annotations-add-button');
            await clickButtonInput('#story-annotations-add-button');
            expect(testmodel().annotations.length).toBe(3);
        });

        it('should add a story model3D', async function () {
            await createAndEditStory();
            await loadRealFile('sample.glb');
            // prime the pipeline with the file which will be 'chosen'
            window.files.push(new mockFile('sample.glb', global.fileSystem['sample.glb']));
            // open the model add
            let promise = clickButtonInput('#story-model3D-add-button');
            // add an asset (auto selects the primed file)
            await clickButtonInput('#asset-add-button');
            // should now have a menu item
            expect(d3.select('#assets-container').getChildren().length).toBe(1);
            // click it
            d3.select('#assets-container').getChildren()[0].getCallbacks().click();
            // wait for everything to finish.
            await promise;
            // check that we now have a model. 
            expect(testmodel().model3Ds.length).toBe(1);
            // do it all again a couple times. 
            window.files.push(new mockFile('sample.glb', global.fileSystem['sample.glb']));
            promise = clickButtonInput('#story-model3D-add-button');
            await clickButtonInput('#asset-add-button');
            expect(d3.select('#assets-container').getChildren().length).toBe(2);
            d3.select('#assets-container').getChildren()[1].getCallbacks().click();
            await promise;
            window.files.push(new mockFile('sample.glb', global.fileSystem['sample.glb']));
            promise = clickButtonInput('#story-model3D-add-button');
            await clickButtonInput('#asset-add-button');
            expect(d3.select('#assets-container').getChildren().length).toBe(3);
            d3.select('#assets-container').getChildren()[2].getCallbacks().click();
            await promise;
            expect(testmodel().model3Ds.length).toBe(3);
        });
    });
});