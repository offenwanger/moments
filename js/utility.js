import * as THREE from 'three';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';

function getSphereIntersection(fromPoint, toPoint, spherePos, sphereRadius) {
    let closestPoint = Util.closestPointOnLine(fromPoint, toPoint, spherePos);
    if (closestPoint.distanceTo(spherePos) > sphereRadius) {
        return null;
    } else {
        let a = spherePos.distanceTo(closestPoint);
        let c = sphereRadius;
        let b = Math.sqrt(c * c - a * a);
        let len = fromPoint.distanceTo(closestPoint) - b;
        return v().subVectors(closestPoint, fromPoint).normalize().multiplyScalar(len).add(fromPoint);
    }
}

function hasSphereIntersection(fromPoint, toPoint, spherePos, sphereRadius) {
    if (fromPoint.distanceTo(spherePos) < sphereRadius) return true;
    let closestPoint = Util.closestPointOnLine(fromPoint, toPoint, spherePos);
    return closestPoint.distanceTo(spherePos) < sphereRadius && v().subVectors(fromPoint, closestPoint).dot(v().subVectors(fromPoint, toPoint)) >= 0;
}

function planeCoordsToWorldCoords(vec, normal, up, position) {
    let vy = up.clone().projectOnPlane(normal).normalize();
    let vx = v().crossVectors(normal, vy);
    return v().addVectors(
        vx.multiplyScalar(vec.x),
        vy.multiplyScalar(vec.y)).add(position);
}

function random(min, max, round = false) {
    let random = Math.random() * (max - min) + min;
    return round ? Math.floor(random) : random;
}

function closestPointOnLine(l1, l2, p) {
    let lineDirection = v().subVectors(l2, l1);
    return l1.clone().addScaledVector(lineDirection, (lineDirection.dot(p) - lineDirection.dot(l1)) / lineDirection.dot(lineDirection));
}

function planeIntersection(fromPoint, direction, normal, planePoint) {
    let demoniator = direction.dot(normal);
    if (demoniator == 0) return null;
    let d = v().subVectors(planePoint, fromPoint).dot(normal) / demoniator;
    let intersection = v().addVectors(fromPoint, direction.clone().multiplyScalar(d));
    return intersection;
}

function v(x = 0, y = 0, z = 0) {
    return new THREE.Vector3(x, y, z);
}

function getClosestPointOnLine(points, p) {
    if (points.length < 2) return p[0];
    let dist = points[1].distanceTo(p);
    let index = 1;
    for (let i = 2; i < points.length - 1; i++) {
        let d = p.distanceTo(points[i]);
        if (d < dist) {
            index = i;
            dist = d;
        }
    }

    let length = new THREE.CatmullRomCurve3(points).getLength();
    let segment = new THREE.Line3(points[index - 1], points[index]);
    let segmentPoint = segment.closestPointToPoint(p, true, new THREE.Vector3());
    let segmentPercent = segment.closestPointToPointParameter(p, true);
    let t1 = index == 1 ? 0 : new THREE.CatmullRomCurve3(points.slice(0, index)).getLength() / length;
    let t2 = new THREE.CatmullRomCurve3(points.slice(0, index + 1)).getLength() / length;
    if (segmentPercent == 1 && index < points.length - 1) {
        segment = new THREE.Line3(points[index], points[index + 1]);
        segmentPoint = segment.closestPointToPoint(p, true, new THREE.Vector3());
        segmentPercent = segment.closestPointToPointParameter(p, true);
        t1 = new THREE.CatmullRomCurve3(points.slice(0, index + 1)).getLength() / length;
        t2 = new THREE.CatmullRomCurve3(points.slice(0, index + 2)).getLength() / length;
    }

    return {
        point: segmentPoint,
        t: (t2 - t1) * segmentPercent + t1,
        tangent: new THREE.Vector3().subVectors(segment.end, segment.start),
    }
}

export const Util = {
    getSphereIntersection,
    hasSphereIntersection,
    planeCoordsToWorldCoords,
    random,
    closestPointOnLine,
    planeIntersection,
    getClosestPointOnLine,

    //// Debug Utils ////
    console: {
        log: {
            point,
            onchange,
            vertexNormalHelper,
        }
    }
}

//// DEBUG Utils ////
const debug_data = {};
function point(id, vec, scene) {
    if (!debug_data[id]) {
        debug_data[id] = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.1, 15),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        )
        scene.add(debug_data[id]);

    }
    debug_data[id].position.copy(vec)
}

function vertexNormalHelper(mesh, scene) {
    let vnh = new VertexNormalsHelper(mesh, 0.5);
    scene.add(vnh);
}

function onchange(id, obj) {
    let different = false;
    if (obj instanceof THREE.Vector3) {
        different = !debug_data[id] || debug_data[id].distanceTo(obj) > 0.000001;
        debug_data[id] = obj.clone();
    } else if (obj instanceof String) {
        different = !debug_data[id] || debug_data[id] != obj;
        debug_data[id] = obj;
    } else if (typeof obj == 'number') {
        different = !debug_data[id] || Math.abs(obj - debug_data[id]) > 0.000001;
        debug_data[id] = obj;
    } else {
        console.error("Not supported!")
    }
    if (different) {
        (console).log(id, obj);
    }
}