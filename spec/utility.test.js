import { setup, cleanup } from './test_utils/test_environment.js';

import * as THREE from 'three'
import { Util } from '../js/utils/utility.js';

describe('Test Utility', function () {
    beforeEach(async function () {
        await setup();
    });

    afterEach(async function () {
        await cleanup();
    })

    describe('test get closest point', function () {
        it('should work in simple cases', function () {
            expect(Util.closestPointOnLine(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 1), new THREE.Vector3(0, 0, 0.5)))
                .toEqual(new THREE.Vector3(0, 1, 0.5));

            expect(Util.closestPointOnLine(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 1), new THREE.Vector3(0, 0, -0.5)))
                .toEqual(new THREE.Vector3(0, 1, -0.5));
        });
    })

    describe('test get intersection', function () {
        it('should work in simple cases', function () {
            expect(Util.getSphereIntersection(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, 1, 1),
                new THREE.Vector3(0, 1, 1),
                0.5
            )).toEqual(new THREE.Vector3(0, 1, 0.5))

            expect(Util.getSphereIntersection(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, 1, 1),
                new THREE.Vector3(0, 1, 1),
                0.5
            )).toEqual(new THREE.Vector3(0, 1, 0.5))
        });
    })

    describe('test has intersection', function () {
        it('should work in simple cases', function () {
            expect(Util.hasSphereIntersection(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, 1, 1),
                new THREE.Vector3(0, 1, 1),
                0.5
            )).toEqual(true)

            expect(Util.hasSphereIntersection(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, 1, 1),
                new THREE.Vector3(0, 1, 1),
                0.5
            )).toEqual(true)
        });

        it('should handle all angles', function () {
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    for (let k = -1; k <= 1; k++) {
                        let spherePos = new THREE.Vector3(1, 1, 1);
                        let cameraVector = new THREE.Vector3(i, j, k).add(spherePos);
                        if (!Util.hasSphereIntersection(cameraVector, spherePos, spherePos, 0.5)) {
                            fail("Test failed for (" + i + "," + j + "," + k + ")");
                        }
                    }
                }
            }
        })
    })
});