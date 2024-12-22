import { cleanup, setup } from './test_utils/test_environment.js';

import { Data } from '../js/data.js';
import { createStoryModel } from './test_utils/test_actions.js';


describe('Test Data', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('clone tests', function () {
        it('should clone empty story', function () {
            let model = new Data.StoryModel();
            let clone = model.clone();

            expect(clone).not.toBe(model);
            expect(clone).toEqual(model);
        });

        it('should clone full story', function () {
            let model = createStoryModel();
            let clone = model.clone();

            expect(clone).not.toBe(model);
            expect(clone).toEqual(model);
        });
    })

    describe('find tests', function () {
        it('should find asset', function () {
            let model = createStoryModel();
            let assetId = model.assets[0].id;
            let asset = model.find(assetId);
            expect(asset).toBe(model.assets[0]);
        })

        it('should find assetPose', function () {
            let model = createStoryModel();
            let assetPoseId = model.assetPoses[0].id;
            let assetPose = model.find(assetPoseId);
            expect(assetPose).toBe(model.assetPoses[0]);
        })

        it('should find poseableAsset', function () {
            let model = createStoryModel();
            let poseableAssetId = model.moments[0].poseableAssetIds[0];
            let poseableAsset = model.find(poseableAssetId);
            expect(poseableAsset.id).toBe(model.moments[0].poseableAssetIds[0]);
        })

        it('should find picture', function () {
            let model = createStoryModel();
            let pictureId = model.moments[0].pictureIds[0];
            let picture = model.find(pictureId);
            expect(picture.id).toBe(model.moments[0].pictureIds[0]);
        })

        it('should not find invalid id', function () {
            let model = createStoryModel();
            let result = model.find("Not an Id");
            expect(result).toBeNull();
        })
    })

    describe('delete tests', function () {
        it('should delete a moment', function () {
            let model = createStoryModel();
            let id = model.moments[0].id;
            let moment = model.find(id);
            expect(moment).not.toBeNull();
            model.delete(id);
            moment = model.find(id);
            expect(moment).toBeNull()
        });

        it('should delete poseableAsset', function () {
            let model = createStoryModel();
            let id = model.moments[0].poseableAssetIds[0];
            let poseableAsset = model.find(id);
            expect(poseableAsset).not.toBeNull();
            model.delete(id);

            poseableAsset = model.find(id);
            expect(poseableAsset).toBeNull()
        });

        it('should delete ids from arrays', function () {
            let model = createStoryModel();
            let id = model.assetPoses[0].id;
            let pose = model.find(id);
            expect(pose).not.toBeNull();
            expect(model.assets[0].poseIds).toContain(id);
            expect(model.assets[0].poseIds.length).toEqual(3);

            model.delete(id);

            pose = model.find(id);
            expect(pose).toBeNull();
            expect(model.assets[0].poseIds).not.toContain(id);
            expect(model.assets[0].poseIds.length).toEqual(2)
        });
    })

    describe('from object tests', function () {
        it('should parse empty story to and from json', function () {
            let model = new Data.StoryModel();
            let str = JSON.stringify(model);
            let obj = JSON.parse(str);

            expect(obj).not.toBeInstanceOf(Data.StoryModel);

            let parsedModel = Data.StoryModel.fromObject(obj);

            expect(model).toEqual(parsedModel);
        });

        it('should parse full story to and from json', function () {
            let model = createStoryModel();
            let str = JSON.stringify(model);
            let obj = JSON.parse(str);

            expect(obj).not.toBeInstanceOf(Data.StoryModel);

            let parsedModel = Data.StoryModel.fromObject(obj);

            expect(model).toEqual(parsedModel);
        });
    })
});