const THREE = require('three');
const TestUtils = require('./test_utils');

const { Util } = require('../js/utility');
let chai = require('chai');

let assert = chai.assert;
let expect = chai.expect;

describe('Test Utility', function () {
    describe('test get closest point', function () {
        it('should work in simple cases', function () {
            TestUtils.assertVectorEqual(
                Util.closestPointOnLine(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 1), new THREE.Vector3(0, 0, 0.5)),
                new THREE.Vector3(0, 1, 0.5));
            TestUtils.assertVectorEqual(
                Util.closestPointOnLine(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 1), new THREE.Vector3(0, 0, -0.5)),
                new THREE.Vector3(0, 1, -0.5));
        });
    })

    describe('test get intersection', function () {
        it('should work in simple cases', function () {
            TestUtils.assertVectorEqual(
                Util.getIntersection(
                    new THREE.Vector3(0, 1, 0),
                    new THREE.Vector3(0, 1, 1),
                    new THREE.Vector3(0, 1, 1),
                    0.5
                ),
                new THREE.Vector3(0, 1, 0.5)
            )

            TestUtils.assertVectorEqual(
                Util.getIntersection(
                    new THREE.Vector3(0, 1, 0),
                    new THREE.Vector3(0, 1, 1),
                    new THREE.Vector3(0, 1, 1),
                    0.5
                ),
                new THREE.Vector3(0, 1, 0.5)
            )
        });
    })
});