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

function unique(arr) {
    if (arr.length == 0) return arr;
    if (arr[0].id) {
        return [...new Map(arr.map(item =>
            [item.id, item])).values()];
    } else {
        return [...new Map(arr.map(item =>
            [item, item])).values()];
    }
}

function limit(val, v1, v2) {
    if (v1 < v2) {
        return Math.min(v2, Math.max(v1, val));
    } else {
        return Math.min(v1, Math.max(v2, val));
    }
}

function setComponentListLength(arr, length, createCallback) {
    for (let i = arr.length; i < length; i++) {
        arr.push(createCallback());
    }
    for (let i = length; i < arr.length; i++) {
        if (typeof arr[i].remove == 'function') { arr[i].remove(); }
        arr.splice(i, 1);
    }
}

function v(x = 0, y = 0, z = 0) {
    return new THREE.Vector3(x, y, z);
}

function simplify3DLine(points, epsilon = 0.1) {
    const p1 = points[0];
    const p2 = points[points.length - 1];
    const { index, dist } = furthestPoint(p1, p2, points);

    if (dist > epsilon) {
        return [
            ...simplify3DLine(points.slice(0, index + 1), epsilon),
            ...simplify3DLine(points.slice(index).slice(1), epsilon)
        ];
    } else {
        return p1.equals(p2) ? [p1] : [p1, p2];
    }
}

function furthestPoint(p1, p2, points) {
    let dmax = 0;
    let maxI = -1;
    for (let i = 0; i < points.length; i++) {
        const dtemp = perpendicularDist(points[i], p1, p2);

        if (dtemp > dmax) {
            dmax = dtemp;
            maxI = i;
        }
    }

    return { index: maxI, dist: dmax };
}

function perpendicularDist(p, p1, p2) {
    if (p.equals(p1) || p.equals(p2)) return 0;
    const line = new THREE.Line3(p1, p2);
    let closestPoint = new THREE.Vector3();
    line.closestPointToPoint(p, true, closestPoint)
    return closestPoint.distanceTo(p);
}

function pivot(vector, pivot, quaternion) {
    let v = new THREE.Vector3().subVectors(vector, pivot)
    v.applyQuaternion(quaternion)
    v.add(pivot);
    return v;
}


export const Util = {
    getSphereIntersection,
    hasSphereIntersection,
    planeCoordsToWorldCoords,
    random,
    closestPointOnLine,
    planeIntersection,
    unique,
    limit,
    setComponentListLength,
    simplify3DLine,
    pivot,

    //// Debug Utils ////
    console: {
        log: {
            point,
            arrow,
            onchange,
            vertexNormalHelper,
        }
    }
}

//// DEBUG Utils ////
const debug_data = {};
function point(id, vec, scene, color = 0x00ff00) {
    if (!debug_data[id]) {
        debug_data[id] = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.1, 15),
            new THREE.MeshBasicMaterial({
                color,
                depthTest: false,
                depthWrite: false,
                transparent: true
            })
        )
        scene.add(debug_data[id]);

    }
    debug_data[id].position.copy(vec)
}

function arrow(id, origin, direction, scene, color = 0x00ff00) {
    if (!debug_data[id]) {
        debug_data[id] = new THREE.ArrowHelper(direction, origin, 1, color);
        debug_data[id].line.material.linewidth = 0.05;
        scene.add(debug_data[id]);
    }
    debug_data[id].setDirection(direction)
    debug_data[id].position.copy(origin)
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