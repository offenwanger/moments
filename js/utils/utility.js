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

// point and polygon in {x,y} format. 
function pointInPolygon(point, polygon) {
    const num_vertices = polygon.length;
    const x = point.x;
    const y = point.y;
    let inside = false;

    let p1 = polygon[0];
    let p2;

    let onZeroEdge = false;
    for (let i = 1; i <= num_vertices; i++) {
        p2 = polygon[i % num_vertices];

        if (y > Math.min(p1.y, p2.y)) {
            if (y <= Math.max(p1.y, p2.y)) {
                if (x <= Math.max(p1.x, p2.x)) {
                    const x_intersection = ((y - p1.y) * (p2.x - p1.x)) / (p2.y - p1.y) + p1.x;

                    if (p1.x === p2.x || x <= x_intersection) {
                        inside = !inside;
                    }
                }
            }
        }

        // catch an edge case
        if (p1.x == 0 && p2.x == 0 && point.x == 0) {
            if (point.y <= Math.max(p1.y, p2.y)
                && point.y >= Math.min(p1.y, p2.y)) {
                return true;
            }
        }

        p1 = p2;
    }

    return inside;
};

function breakUpUVSelection(uvs) {
    // we support 3 cases. 
    // 1 drawing a simple convex shape over the line
    // 2 circling the bottom or the top
    // 3 drawing a line with no crossovers

    let sets = []
    let currentSet = [uvs[0], uvs[1]];
    let lastPoint = [uvs[0], uvs[1]];
    for (let i = 2; i < uvs.length; i += 2) {
        let point = [uvs[i], uvs[i + 1]];
        if (lastPoint[0] < 0.25 && point[0] > 0.75) {
            // cross left
            if (lastPoint[0] != 0 || point[0] != 1) {
                let v = getYIntercept(point[0] - 1, point[1], lastPoint[0], lastPoint[1]);
                currentSet.push(0, v);
                sets.push(currentSet);
                currentSet = [1, v]
            } else {
                sets.push(currentSet);
                currentSet = []
            }
        } else if (lastPoint[0] > 0.75 && point[0] < 0.25) {
            // cross right
            if (lastPoint[0] != 1 || point[0] != 0) {
                let v = getYIntercept(point[0], point[1], lastPoint[0] - 1, lastPoint[1]);
                currentSet.push(1, v);
                sets.push(currentSet);
                currentSet = [0, v]
            } else {
                // if we're already lined up with the split all is good. 
                sets.push(currentSet);
                currentSet = []
            }
        } else {
            // no cross
        }
        currentSet.push(point[0], point[1]);
        lastPoint = point;
    }
    sets.push(currentSet);

    if (sets.length == 0) {
        console.error("No idea how this happened.");
        sets = [];
    } else if (sets.length == 1) {
        // simple case of no crossover, nothing to do. 
    } else if (sets.length == 2) {
        // we crossed the line exactly once
        // we either circled the whole bottom or not. 
        let p1 = sets[0][0]
        let p2 = sets[1][sets[1].length - 2];
        if (Math.abs(p1 - p2) < 0.6) {
            // whole bottom case. 
            let set = sets[1].concat(sets[0]);
            let v = set[1] + set[set.length - 1] / 2 > 0.5 ? 1 : 0;
            set.unshift(set[0], v);
            set.push(set[set.length - 2], v);
            sets = [set];
        } else {
            // convex shape case
            let v = getYIntercept(sets[0][0], sets[0][1], sets[1][sets[1].length - 2], sets[1][sets[1].length - 1])
            sets[0].push(sets[sets.length - 2], v);
            sets[1].unshift(sets[0], v);
        }
    } else {
        // if the middle sets crosses the same side twice, then 
        // this is a handled case
        if (sets[1][0] == sets[1][sets[1].length - 2]) {
            // we turn the two end points sets inside out so that
            // it's clear where the diving line is. 
            sets = [sets[1], sets[2].concat(sets[0])]
        } else {
            // we don't handle this so it's going to go weird. 
            return sets;
        }
    }
    return sets;
}

function getYIntercept(x1, y1, x2, y2) {
    return -x1 * (y2 - y1) / (x2 - x1) + y1
}

const longHelper = new THREE.Object3D();
const latHelper = new THREE.Object3D();
const pointHelper = new THREE.Object3D();
longHelper.add(latHelper);
latHelper.add(pointHelper);
const temp = new THREE.Vector3();
function uvToPoint(u, v) {
    const lat = ((1 - v) - 0.5) * Math.PI;
    const long = (1 - u) * Math.PI * 2;
    return new THREE.Vector3(...getPoint(lat, long))
}

function getPoint(lat, long) {
    pointHelper.position.z = 1;
    latHelper.rotation.x = lat;
    longHelper.rotation.y = long;
    longHelper.updateMatrixWorld(true);
    return pointHelper.getWorldPosition(temp).toArray();
}


function updateHoverTargetHighlight(target, interactionState, toolMode, isPrimary, sessionController, helperPointController) {
    let currentTarget = isPrimary ? interactionState.primaryHovered : interactionState.secondaryHovered;
    let currentId = currentTarget?.getId()
    let targetId = target?.getId();
    if (currentTarget && currentId != targetId) {
        if (isPrimary) {
            interactionState.primaryHovered.idle(toolMode);
            interactionState.primaryHovered = null;
        } else {
            interactionState.secondaryHovered.idle(toolMode);
            interactionState.secondaryHovered = null;
        }
        sessionController.hovered(false, isPrimary)
        helperPointController.hidePoint(isPrimary);
    }

    if (target) {
        helperPointController.showPoint(isPrimary, target.getIntersection().point);
    }

    if (target && currentId != targetId) {
        sessionController.hovered(true, isPrimary)
        if (isPrimary) {
            interactionState.primaryHovered = target;
            interactionState.primaryHovered.highlight(toolMode);
        } else {
            interactionState.secondaryHovered = target;
            interactionState.secondaryHovered.highlight(toolMode);
        }
    }
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
    pointInPolygon,
    breakUpUVSelection,
    uvToPoint,
    updateHoverTargetHighlight,
}
