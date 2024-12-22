
import { cleanup, setup } from './test_utils/test_environment.js';

import { AssetTypes, MenuNavButtons } from '../js/constants.js';
import { canvasClickMenuButton, createAndOpenStoryMoment, testmodel, uploadImageAsset } from './test_utils/test_actions.js';


describe('Test menu buttons', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('init tests', function () {
        it('should open a story', async function () {
            await createAndOpenStoryMoment();
        });
    });

    describe('add tests', function () {
        it('should add a story picture', async function () {
            await createAndOpenStoryMoment();
            await uploadImageAsset();
            let assetId = testmodel().assets.find(a => a.type == AssetTypes.IMAGE).id;

            await canvasClickMenuButton(MenuNavButtons.ADD);
            await canvasClickMenuButton(MenuNavButtons.ADD_PICTURE);
            await canvasClickMenuButton(assetId);

            expect(testmodel().pictures.length).toBe(1);
            await canvasClickMenuButton(assetId);
            await canvasClickMenuButton(assetId);
            expect(testmodel().pictures.length).toBe(3);
        });
    });
});