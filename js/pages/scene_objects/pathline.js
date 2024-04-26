import * as THREE from 'three';
import { Util } from '../utils/utility.js';

export function PathLineController(parent) {
    const mLinePoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)];
    const mPointNormals = [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0)];
    const mPointTangents = [new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -1)];
    const mPointTs = [0, 1];
    const mPointLengths = [0, 1]
    let mLineLength = 1;
    let mCurveLength = 1;
    const mLine = new THREE.CatmullRomCurve3(mLinePoints);

    function updatePath(path) {
        if (!Array.isArray(path)) { console.error("Invalid Path"); return; }
        if (path.length == 0) {
            path = [[0, 0, 0], [0, 0, -10]];
        }

        mLinePoints.splice(0, mLinePoints.length, ...path.map(p => new THREE.Vector3().fromArray(p)))
        mLine.points = mLinePoints;
        mCurveLength = mLine.getLength();

        mPointLengths.splice(0, mPointLengths.length, ...generateLengths(mLinePoints));
        mLineLength = mPointLengths[mPointLengths.length - 1];

        mPointTs.splice(0, mPointTs.length, ...mPointLengths.map(l => l / mLineLength));

        mPointTangents.splice(0, mPointTangents.length, ...mPointTs.map(t => mLine.getTangentAt(t)));
        mPointNormals.splice(0, mPointNormals.length, ...generateNormals(mLinePoints));

        for (let i = 0; i < 50; i++) {
            let pos = getData(i / 50);
            Util.console.log.point("line" + i, pos.tPoint, parent);
            Util.console.log.point("linenormal" + i, pos.normal.add(pos.tPoint), parent, 0x0000ff);
        }
    }

    function getNormal(t) {
        for (let i = 1; i < mPointTs.length; i++) {
            if (t >= mPointTs[i - 1] && t <= mPointTs[i]) {
                let normal1 = mPointNormals[i - 1]
                let normal2 = mPointNormals[i]
                let t1 = mPointTs[i - 1];
                let t2 = mPointTs[i];
                let segmentPercent = (t - t1) / (t2 - t1);
                return normal1.clone().multiplyScalar(1 - segmentPercent).add(normal2.clone().multiplyScalar(segmentPercent));
            }
        }
    }

    function getData(t, offset = { x: 0, y: 0 }) {
        let tPoint = mLine.getPointAt(t);
        let normal = getNormal(t);
        let tangent = mLine.getTangentAt(t);
        let position = Util.planeCoordsToWorldCoords(offset, tangent.clone().multiplyScalar(-1), normal, tPoint);

        let upRotation = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0));
        let currentForward = tangent.clone().applyQuaternion(upRotation);
        let forwardRotation = new THREE.Quaternion().setFromUnitVectors(currentForward, new THREE.Vector3(0, 0, -1));
        let rotation = forwardRotation.multiply(upRotation);

        return { tPoint, normal, tangent, position, rotation };
    }

    function generateNormals(points) {
        let prevTangent = mPointTangents[0].clone();
        prevTangent.y = 0;
        prevTangent.normalize()
        let prevNormal = new THREE.Vector3(0, 1, 0);

        let result = [];
        for (let i = 0; i < points.length; i++) {
            let rotation = new THREE.Quaternion().setFromUnitVectors(prevTangent, mPointTangents[i])
            let normal = prevNormal.clone().applyQuaternion(rotation);
            result.push(normal);
            prevNormal = normal;
            prevTangent = mPointTangents[i];
        }
        return result;
    }

    function generateLengths(points) {
        let result = [0];
        for (let i = 1; i < points.length; i++) {
            let segmentLength = points[i].distanceTo(points[i - 1]);
            result.push(segmentLength + result[result.length - 1]);
        }
        return result;
    }

    function getClosestPoint(p) {
        let dist = mLinePoints[1].distanceTo(p);
        let index = 1;
        for (let i = 2; i < mLinePoints.length - 1; i++) {
            let d = p.distanceTo(mLinePoints[i]);
            if (d < dist) {
                index = i;
                dist = d;
            }
        }

        let segment = new THREE.Line3(mLinePoints[index - 1], mLinePoints[index]);
        let segmentPoint = segment.closestPointToPoint(p, true, new THREE.Vector3());
        let segmentPercent = segment.closestPointToPointParameter(p, true);
        let t1 = mPointTs[index - 1];
        let t2 = mPointTs[index];
        if (segmentPercent == 1 && index < mLinePoints.length - 1) {
            segment = new THREE.Line3(mLinePoints[index], mLinePoints[index + 1]);
            segmentPoint = segment.closestPointToPoint(p, true, new THREE.Vector3());
            segmentPercent = segment.closestPointToPointParameter(p, true);
            t1 = mPointTs[index];
            t2 = mPointTs[index + 1];
        }
        let t = (t2 - t1) * segmentPercent + t1;
        return {
            position: segmentPoint,
            t,
            tangent: mLine.getTangentAt(t),
            normal: getNormal(t),
        }
    }

    this.updatePath = updatePath;
    this.getData = getData;
    this.getClosestPoint = getClosestPoint;
    this.getPoints = () => mLinePoints;
}