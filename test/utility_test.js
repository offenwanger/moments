import * as THREE from 'three';

import { setup, cleanup } from './test_utils/test_environment.js';
import { assertVectorEqual } from './test_utils/utils.js';

import { Util } from '../js/utils/utility.js';
import * as chai from 'chai';

let assert = chai.assert;
let expect = chai.expect;

describe('Test Utility', function () {
    describe('test get closest point', function () {
        it('should work in simple cases', function () {
            assertVectorEqual(
                Util.closestPointOnLine(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 1), new THREE.Vector3(0, 0, 0.5)),
                new THREE.Vector3(0, 1, 0.5));
            assertVectorEqual(
                Util.closestPointOnLine(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 1), new THREE.Vector3(0, 0, -0.5)),
                new THREE.Vector3(0, 1, -0.5));
        });
    })

    describe('test get intersection', function () {
        it('should work in simple cases', function () {
            assertVectorEqual(
                Util.getSphereIntersection(
                    new THREE.Vector3(0, 1, 0),
                    new THREE.Vector3(0, 1, 1),
                    new THREE.Vector3(0, 1, 1),
                    0.5
                ),
                new THREE.Vector3(0, 1, 0.5)
            )

            assertVectorEqual(
                Util.getSphereIntersection(
                    new THREE.Vector3(0, 1, 0),
                    new THREE.Vector3(0, 1, 1),
                    new THREE.Vector3(0, 1, 1),
                    0.5
                ),
                new THREE.Vector3(0, 1, 0.5)
            )
        });
    })

    describe('test has intersection', function () {
        it('should work in simple cases', function () {
            assert.equal(
                Util.hasSphereIntersection(
                    new THREE.Vector3(0, 1, 0),
                    new THREE.Vector3(0, 1, 1),
                    new THREE.Vector3(0, 1, 1),
                    0.5
                ), true
            )

            assert.equal(
                Util.hasSphereIntersection(
                    new THREE.Vector3(0, 1, 0),
                    new THREE.Vector3(0, 1, 1),
                    new THREE.Vector3(0, 1, 1),
                    0.5
                ), true
            )
        });

        it('should handle all angles', function () {
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    for (let k = -1; k <= 1; k++) {
                        let spherePos = new THREE.Vector3(1, 1, 1);
                        let cameraVector = new THREE.Vector3(i, j, k).add(spherePos);
                        assert.equal(
                            Util.hasSphereIntersection(
                                cameraVector,
                                spherePos,
                                spherePos,
                                0.5
                            ), true, "Test failed for (" + i + "," + j + "," + k + ")"
                        )
                    }
                }
            }
        })
    })
});