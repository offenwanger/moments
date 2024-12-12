import * as THREE from 'three';

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
    while (arr.length > length) {
        let i = arr.length - 1;
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

function getClosestTarget(ray, targets) {
    if (targets.length == 0) return null;
    if (targets.length == 1) return targets[0];

    let sortation = targets.map(t => {
        return { t, distance: ray.distanceToPoint(t.getIntersection().point) }
    })

    sortation.sort((a, b) => a.distance - b.distance)
    return sortation[0].t;
}

function getNextName(name, nameList) {
    let maxNumber = Math.max(0, ...nameList
        .filter(n => n.includes(name))
        .map(n => parseInt(n.split(name)[1]))
        .filter(n => !isNaN(n)));
    return name + (maxNumber + 1)
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
    getClosestTarget,
    getNextName,
}
