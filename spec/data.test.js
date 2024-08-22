import { cleanup, setup } from './test_utils/test_environment.js';

import { Data } from '../js/data.js';
import { TestUtils } from './test_utils/utils.js';


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
            let model = TestUtils.createStoryModel();
            let clone = model.clone();

            expect(clone).not.toBe(model);
            expect(clone).toEqual(model);
        });
    })

    describe('find tests', function () {
        it('should find asset', function () {
            let model = TestUtils.createStoryModel();
            let assetId = model.assets[0].id;
            let asset = model.find(assetId);
            expect(asset).toBe(model.assets[0]);
        })

        it('should find assetPose', function () {
            let model = TestUtils.createStoryModel();
            let assetPoseId = model.assetPoses[0].id;
            let assetPose = model.find(assetPoseId);
            expect(assetPose).toBe(model.assetPoses[0]);
        })

        it('should find model3D', function () {
            let model = TestUtils.createStoryModel();
            let model3DId = model.model3Ds[0].id;
            let model3D = model.find(model3DId);
            expect(model3D).toBe(model.model3Ds[0]);
        })

        it('should find annotation', function () {
            let model = TestUtils.createStoryModel();
            let annotationId = model.annotations[0].id;
            let annotation = model.find(annotationId);
            expect(annotation).toBe(model.annotations[0]);
        })

        it('should find annotationItem', function () {
            let model = TestUtils.createStoryModel();
            let annotationItemId = model.annotationItems[0].id;
            let annotationItem = model.find(annotationItemId);
            expect(annotationItem).toBe(model.annotationItems[0]);
        })

        it('should not find invalid id', function () {
            let model = TestUtils.createStoryModel();
            let result = model.find("Not an Id");
            expect(result).toBeNull();
        })
    })

    describe('delete tests', function () {
        it('should delete model3D', function () {
            let model = TestUtils.createStoryModel();
            let id = model.model3Ds[0].id;
            let model3D = model.find(id);
            expect(model3D).not.toBeNull()
                ;
            model.delete(id);

            model3D = model.find(id);
            expect(model3D).toBeNull()
        });

        it('should delete ids from arrays', function () {
            let model = TestUtils.createStoryModel();
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
            let model = TestUtils.createStoryModel();
            let str = JSON.stringify(model);
            let obj = JSON.parse(str);

            expect(obj).not.toBeInstanceOf(Data.StoryModel);

            let parsedModel = Data.StoryModel.fromObject(obj);

            expect(model).toEqual(parsedModel);
        });
    })
});