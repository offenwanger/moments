
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
        it('should add a story picture', async function () {
            await createAndEditStory();
            await clickButtonInput('#moment-pictures-add-button');
            expect(testmodel().pictures.length).toBe(1);
            await clickButtonInput('#moment-pictures-add-button');
            await clickButtonInput('#moment-pictures-add-button');
            expect(testmodel().pictures.length).toBe(3);
        });

        it('should add a story poseableAsset', async function () {
            await createAndEditStory();
            await loadRealFile('sample.glb');
            // prime the pipeline with the file which will be 'chosen'
            window.files.push(new mockFile('sample.glb', global.fileSystem['sample.glb']));
            // open the model add
            let promise = clickButtonInput('#moment-poseable-asset-add-button');
            // add an asset (auto selects the primed file)
            await clickButtonInput('#asset-add-button');
            // should now have a menu item
            expect(d3.select('#assets-container').getChildren().length).toBe(1);
            // click it
            d3.select('#assets-container').getChildren()[0].getCallbacks().click();
            // wait for everything to finish.
            await promise;
            // check that we now have a model. 
            expect(testmodel().moments[0].poseableAssetIds.length).toBe(1);
            // do it all again a couple times. 
            window.files.push(new mockFile('sample.glb', global.fileSystem['sample.glb']));
            promise = clickButtonInput('#moment-poseable-asset-add-button');
            await clickButtonInput('#asset-add-button');
            d3.select('#assets-container').getChildren()[1].getCallbacks().click();
            await promise;
            window.files.push(new mockFile('sample.glb', global.fileSystem['sample.glb']));
            promise = clickButtonInput('#moment-poseable-asset-add-button');
            await clickButtonInput('#asset-add-button');
            d3.select('#assets-container').getChildren()[2].getCallbacks().click();
            await promise;
            expect(testmodel().moments[0].poseableAssetIds.length).toBe(3);
        });
    });
});