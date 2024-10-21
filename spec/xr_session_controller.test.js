import { setup, cleanup } from './test_utils/test_environment.js';
import { createAndOpenModel3D, lookHead, moveHead, moveXRController, pressXRTrigger, pushXRToggle, releaseXRToggle, releaseXRTrigger, startXR, stopXR, testmodel } from './test_utils/test_actions.js';



describe('Test Moment Panel', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('session tests', function () {
        it('should start a session', async function () {
            await createAndOpenModel3D();
            await startXR();
        });

        it('should stop a session', async function () {
            await createAndOpenModel3D();
            await startXR();
            await stopXR();
        });

        it('should perform a render pass', async function () {
            await createAndOpenModel3D();
            await startXR();
            global.XRRenderer.animationLoop();
        });
    });

    describe('move tests', function () {
        it('should drag', async function () {
            await createAndOpenModel3D();
            await startXR();

            let model3D = testmodel().model3Ds[0];

            let cubePos = testmodel().assetPoses.find(p => p.name == "Cube" && model3D.poseIds.includes(p.id));
            expect(cubePos.x).toBeCloseTo(0.6, 3);
            expect(cubePos.y).toBeCloseTo(0, 4);
            expect(cubePos.z).toBeCloseTo(-1, 4);

            await lookHead(cubePos.x, cubePos.y, cubePos.z);
            await moveXRController(true, cubePos.x, cubePos.y, cubePos.z);
            await pressXRTrigger(true)
            await moveXRController(true, 1, 0, -1);
            await releaseXRTrigger(true);

            let newcubePos = testmodel().assetPoses.find(p => p.name == "Cube" && model3D.poseIds.includes(p.id));
            expect(newcubePos.x).toBeCloseTo(1, 3);
            expect(newcubePos.y).toBeCloseTo(0, 4);
            expect(newcubePos.z).toBeCloseTo(-1, 4);
        });

        it('should pose with left primary', async function () {
            await createAndOpenModel3D();
            await startXR();

            let model3D = testmodel().model3Ds[0];

            let bonePos = testmodel().assetPoses.find(p => p.name == "Bone" && model3D.poseIds.includes(p.id));
            expect(bonePos.x).toBeCloseTo(0.0037, 3);
            expect(bonePos.y).toBeCloseTo(-1.38247, 4);
            expect(bonePos.z).toBeCloseTo(0, 4);

            let bone2Pos = testmodel().assetPoses.find(p => p.name == "Bone002" && model3D.poseIds.includes(p.id));
            expect(bone2Pos.x).toBeCloseTo(0, 3);
            expect(bone2Pos.y).toBeCloseTo(0.4975, 4);
            expect(bone2Pos.z).toBeCloseTo(0, 4);

            let bone3Pos = testmodel().assetPoses.find(p => p.name == "Bone003" && model3D.poseIds.includes(p.id));
            expect(bone3Pos.x).toBeCloseTo(0, 3);
            expect(bone3Pos.y).toBeCloseTo(0.50513, 4);
            expect(bone3Pos.z).toBeCloseTo(0, 4);

            // Grab Bone
            await lookHead(0, -1.25, -1);
            await moveXRController(true, 0, -1.25, -1);
            await pressXRTrigger(true)

            // Grab Bone3
            await lookHead(0, .75, -1);
            await moveXRController(false, 0, .75, -1);
            await pressXRTrigger(false)

            // Move
            await moveXRController(true, 1, 0, -1);
            await moveXRController(false, 0, 0, -1);

            await releaseXRTrigger(false);
            await releaseXRTrigger(true);

            let newbonePos = testmodel().assetPoses.find(p => p.name == "Bone" && model3D.poseIds.includes(p.id));
            // Bone 1 should change
            expect(newbonePos.x).toBeCloseTo(1.004, 3);
            expect(newbonePos.y).toBeCloseTo(-0.1324, 3);
            expect(newbonePos.z).toBeCloseTo(0, 4);

            // Bone 2 should change
            let newbone2Pos = testmodel().assetPoses.find(p => p.name == "Bone002" && model3D.poseIds.includes(p.id));
            expect(newbone2Pos.x).toBeCloseTo(0, 3);
            expect(newbone2Pos.y).toBeCloseTo(0.49754, 4);
            expect(newbone2Pos.z).toBeCloseTo(0, 4);

            // Bone 3 should not
            let newbone3Pos = testmodel().assetPoses.find(p => p.name == "Bone003" && model3D.poseIds.includes(p.id));
            expect(newbone3Pos.x).toBeCloseTo(0, 3);
            expect(newbone3Pos.y).toBeCloseTo(0.50513, 4);
            expect(newbone3Pos.z).toBeCloseTo(0, 4);
        });


        it('should pose with right primary', async function () {
            await createAndOpenModel3D();
            await startXR();

            let model3D = testmodel().model3Ds[0];

            let bonePos = testmodel().assetPoses.find(p => p.name == "Bone" && model3D.poseIds.includes(p.id));
            expect(bonePos.x).toBeCloseTo(0.0037, 3);
            expect(bonePos.y).toBeCloseTo(-1.38247, 4);
            expect(bonePos.z).toBeCloseTo(0, 4);

            let bone2Pos = testmodel().assetPoses.find(p => p.name == "Bone002" && model3D.poseIds.includes(p.id));
            expect(bone2Pos.x).toBeCloseTo(0, 3);
            expect(bone2Pos.y).toBeCloseTo(0.4975, 4);
            expect(bone2Pos.z).toBeCloseTo(0, 4);

            let bone3Pos = testmodel().assetPoses.find(p => p.name == "Bone003" && model3D.poseIds.includes(p.id));
            expect(bone3Pos.x).toBeCloseTo(0, 3);
            expect(bone3Pos.y).toBeCloseTo(0.50513, 4);
            expect(bone3Pos.z).toBeCloseTo(0, 4);

            // Grab Bone
            await lookHead(0, -1.25, -1);
            await moveXRController(false, 0, -1.25, -1);
            await pressXRTrigger(false)

            // Grab Bone3
            await lookHead(0, .75, -1);
            await moveXRController(true, 0, .75, -1);
            await pressXRTrigger(true)

            // Move
            await moveXRController(false, 1, 0, -1);
            await moveXRController(true, 0, 0, -1);

            await releaseXRTrigger(true);
            await releaseXRTrigger(false);

            let newbonePos = testmodel().assetPoses.find(p => p.name == "Bone" && model3D.poseIds.includes(p.id));
            // Bone 1 should change
            expect(newbonePos.x).toBeCloseTo(1.004, 3);
            expect(newbonePos.y).toBeCloseTo(-0.1324, 3);
            expect(newbonePos.z).toBeCloseTo(0, 4);

            // Bone 2 should change
            let newbone2Pos = testmodel().assetPoses.find(p => p.name == "Bone002" && model3D.poseIds.includes(p.id));
            expect(newbone2Pos.x).toBeCloseTo(0, 3);
            expect(newbone2Pos.y).toBeCloseTo(0.49754, 4);
            expect(newbone2Pos.z).toBeCloseTo(0, 4);

            // Bone 3 should not
            let newbone3Pos = testmodel().assetPoses.find(p => p.name == "Bone003" && model3D.poseIds.includes(p.id));
            expect(newbone3Pos.x).toBeCloseTo(0, 3);
            expect(newbone3Pos.y).toBeCloseTo(0.50513, 4);
            expect(newbone3Pos.z).toBeCloseTo(0, 4);
        });


        it('should rotate', async function () {
            await createAndOpenModel3D();
            await startXR();

            let model3D = testmodel().model3Ds[0];
            let cubePos = testmodel().assetPoses.find(p => p.name == "Cube" && model3D.poseIds.includes(p.id));

            expect(cubePos.x).toBeCloseTo(0.6, 3);
            expect(cubePos.y).toBeCloseTo(0, 4);
            expect(cubePos.z).toBeCloseTo(-1, 4);

            await lookHead(cubePos.x, cubePos.y, cubePos.z);
            await moveXRController(true, cubePos.x, cubePos.y, cubePos.z);
            await pressXRTrigger(true)
            await moveXRController(true, 1, 0, -1);
            await releaseXRTrigger(true);

            expect(testmodel().assetPoses
                .find(p => p.name == "Cube" && model3D.poseIds.includes(p.id)).x)
                .toBeCloseTo(1, 3);
            expect(testmodel().assetPoses
                .find(p => p.name == "Cube" && model3D.poseIds.includes(p.id)).y)
                .toBeCloseTo(0, 4);
            expect(testmodel().assetPoses
                .find(p => p.name == "Cube" && model3D.poseIds.includes(p.id)).z)
                .toBeCloseTo(-1, 4);
            expect("done").toBe('true');
        });
    });
});