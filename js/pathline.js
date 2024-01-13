import * as THREE from 'three';
import * as C from './constants.js';
import { Util } from './utility.js';

export function PathLine(parent) {
    const mLinePoints = [];
    const mLine = new THREE.CatmullRomCurve3();
    let mTimelineSurface = null;
    let mLineLength = 1;
    let mLineWidth = 1;

    function loadFromObject(obj) {
        mLinePoints.splice(0, mLinePoints.length, ...obj.line.map(p => new THREE.Vector3().fromArray(p)))
        mLine.points = mLinePoints;

        mLineLength = mLine.getLength();
        mLineWidth = Math.max(mLineWidth, ...obj.moments.map(momentData => Math.abs(momentData.offset.x) + momentData.size));

        mTimelineSurface = new THREE.Mesh(new THREE.ExtrudeGeometry(
            new THREE.Shape([new THREE.Vector2(-mLineWidth, 0), new THREE.Vector2(mLineWidth, 0)]), {
            steps: 100,
            bevelEnabled: false,
            extrudePath: mLine
        }));
        mTimelineSurface.layers.set(C.CAST_ONLY_LAYER)
        parent.add(mTimelineSurface);
    }

    function getNormal(t) {
        let tangent = mLine.getTangentAt(t);
        let up = new THREE.Vector3(0, 1, 0);
        return up.sub(up.clone().projectOnVector(tangent));
    }

    function getPosition(t, offset) {
        let tPoint = mLine.getPointAt(t);
        let normal = getNormal(t);
        let tangent = mLine.getTangentAt(t);
        let position = Util.planeCoordsToWorldCoords(offset, tangent.clone().multiplyScalar(-1), normal, tPoint);
        return { tPoint, normal, tangent, position };
    }

    this.loadFromObject = loadFromObject;
    this.getPosition = getPosition;
    this.getLineSurface = () => mTimelineSurface;
    this.getLinePoints = () => mLinePoints;
}