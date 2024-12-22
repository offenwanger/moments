import * as THREE from 'three';
import { InteractionType, ModelUpdateCommands, SurfaceToolButtons } from "../../../constants.js";
import { Data } from "../../../data.js";
import { IdUtil } from "../../../utils/id_util.js";
import { Util } from "../../../utils/utility.js";
import { ModelUpdate } from "../model_controller.js";

// defines simplify2
import '../../../../lib/simplify2.js';

function pointerMove(raycaster, orientation, isPrimary, interactionState, toolMode, model, sessionController, sceneController, helperPointController) {

    if (isPrimary) {
        if (interactionState.type == InteractionType.NONE) {
            let targets = sceneController.getTargets(raycaster, toolMode)
            if (targets.length > 1) { console.error('Unexpected target result!'); }
            Util.updateHoverTargetHighlight(targets[0], interactionState, toolMode, isPrimary, sessionController, helperPointController);
        } else if (interactionState.type == InteractionType.BRUSHING) {
            let targets = sceneController.getTargets(raycaster, toolMode)
            if (targets.length == 0) { /* we moved off the sphere, do nothing. */ } else {
                if (targets.length > 1) { console.error('Unexpected target result!'); }
                let target = targets[0];
                target.select(toolMode);
                helperPointController.showPoint(isPrimary, target.getIntersection().point);
            }
        } else if (interactionState.type == InteractionType.ONE_HAND_MOVE && isPrimary) {
            // Move the moving thing. 
            let fromRay = interactionState.data.startRay;
            let fromOrientation = new THREE.Quaternion().copy(interactionState.data.startRayOrientation);
            let toRay = raycaster.ray;
            let toOrientation = orientation;

            let rotation = new THREE.Quaternion()
                .multiplyQuaternions(toOrientation, fromOrientation.invert());
            let newPosition = new THREE.Vector3().copy(interactionState.data.startPosition)
                .sub(fromRay.origin).applyQuaternion(rotation).add(toRay.origin);

            interactionState.data.rootTarget.setWorldPosition(newPosition);
        } else {
            console.error('invalid state:' + toolMode.tool + ", " + interactionState.type);
        }
    } else {
        // secondary controller does nothing.
    }
}

function pointerDown(raycaster, orientation, isPrimary, interactionState, toolMode, model, sessionController, sceneController, helperPointController) {
    let hovered = isPrimary ? interactionState.primaryHovered : interactionState.secondaryHovered;
    if (hovered) {
        if (interactionState.type == InteractionType.NONE) {
            if (toolMode.surfaceSettings.mode == SurfaceToolButtons.FLATTEN ||
                toolMode.surfaceSettings.mode == SurfaceToolButtons.RESET) {
                interactionState.type = InteractionType.BRUSHING;
                interactionState.data = { target: hovered };
            } else if (toolMode.surfaceSettings.mode == SurfaceToolButtons.PULL) {
                startOneHandMove(raycaster, orientation, hovered, interactionState);
            } else {
                console.error("Not handled:" + toolMode.surfaceSettings.mode);
            }
        } else {
            console.error("TODO: Handle this edge case");
        }
    }
}

function pointerUp(raycaster, orientation, isPrimary, interactionState, toolMode, model, sessionController, sceneController, helperPointController) {
    // secondary controller has no effect.
    if (!isPrimary) return [];

    let type = interactionState.type;
    let data = interactionState.data;

    interactionState.type = InteractionType.NONE;
    interactionState.data = {};

    let updates = []

    helperPointController.hidePoint();

    if (type == InteractionType.BRUSHING) {
        // we are either flattening or resetting.

        let photosphereId = data.target.getId();
        let photosphere = model.photospheres.find(p => p.id == photosphereId);
        if (!photosphere) { console.error('invalid id: ' + photosphereId); return []; }

        // for both flatten and reset, clear circled points out of 
        // other surfaces
        let path = data.target.getDrawnPath();
        let shapes = Util.breakUpUVSelection(path).map(s => {
            let coordArray = []
            for (let i = 0; i < s.length; i += 2) {
                coordArray.push({ x: s[i], y: s[i + 1] });
            }
            return coordArray;
        }).map(arr => {
            return simplify2.douglasPeucker(arr, 0.0001);
        })

        let basePointUVs = Data.Photosphere.basePointUVs;
        let includedIndices = []
        for (let shape of shapes) {
            for (let i = 0; i < basePointUVs.length; i += 2) {
                if (Util.pointInPolygon({ x: basePointUVs[i], y: basePointUVs[i + 1] }, shape)) {
                    let index = i / 2;
                    includedIndices.push(index);
                }
            }
        }
        includedIndices = Util.unique(includedIndices);

        let otherSurfaces = model.surfaces.filter(s => photosphere.surfaceIds.includes(s.id));
        for (let s of otherSurfaces) {
            let u = []

            let points = []
            for (let shape of shapes) {
                for (let i = 0; i < s.points.length; i += 2) {
                    let point = { x: s.points[i], y: s.points[i + 1] };
                    if (!Util.pointInPolygon(point, shape)) {
                        points.push(point.x, point.y);
                    }
                }
            }
            if (points.length == 0) {
                u = [new ModelUpdate({ id: s.id }, ModelUpdateCommands.DELETE)]
            } else if (points.length != s.points.length) {
                u.push(new ModelUpdate({
                    id: s.id,
                    points,
                }));
                let bpi = s.basePointIndices.filter(i => !includedIndices.includes(i));
                if (bpi.length != s.basePointIndices.length) {
                    u.push(new ModelUpdate({
                        id: s.id,
                        basePointIndices: bpi,
                    }));
                }
            }
            updates.push(...u);
        }

        // if we are flattening, create the new surface.
        if (toolMode.surfaceSettings.mode == SurfaceToolButtons.FLATTEN) {
            let points = shapes.reduce((arr, curr) => arr.concat(curr), [])
                .map(p => [p.x, p.y]).flat();

            let normal = new THREE.Vector3();
            for (let i = 0; i < points.length; i += 2) {
                normal.add(Util.uvToPoint(points[i], points[i + 1]));
            }
            normal.normalize();
            let surfaceId = IdUtil.getUniqueId(Data.PhotosphereSurface);
            updates.push(
                new ModelUpdate({
                    id: photosphereId,
                    surfaceIds: photosphere.surfaceIds.concat([surfaceId]),
                }),
                new ModelUpdate({
                    id: surfaceId,
                    points,
                    normal: normal.toArray(),
                    basePointIndices: includedIndices,
                    dist: -1,
                }),
            );
        }
    } else if (type == InteractionType.ONE_HAND_MOVE) {
        let { normal, dist } = data.target.getNormalAndDist();
        let id = data.target.getId();
        updates.push(new ModelUpdate({ id, normal, dist }));
    }

    return updates;
}

function startOneHandMove(raycaster, orientation, target, interactionState) {
    interactionState.type = InteractionType.ONE_HAND_MOVE;
    let rootTarget = target.getRoot();
    interactionState.data = {
        target,
        rootTarget,
        startRay: new THREE.Ray().copy(raycaster.ray),
        startRayOrientation: new THREE.Quaternion().copy(orientation),
        startOrientation: rootTarget.getLocalOrientation(),
        startPosition: rootTarget.getWorldPosition(),
    }
}

export const SurfaceToolHandler = {
    pointerMove,
    pointerDown,
    pointerUp,
}