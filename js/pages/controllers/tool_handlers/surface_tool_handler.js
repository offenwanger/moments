import * as THREE from 'three';
import { InteractionType, ModelUpdateCommands, SurfaceToolButtons } from "../../../constants.js";
import { Data } from "../../../data.js";
import { IdUtil } from "../../../utils/id_util.js";
import { Util } from "../../../utils/utility.js";
import { ModelUpdate } from "../model_controller.js";

// defines simplify2
import '../../../../lib/simplify2.js';

function pointerMove(raycaster, orientation, isPrimary, interactionState, toolMode, model, sessionController, sceneController, helperPointController) {

    if (interactionState.type == InteractionType.NONE) {
        if (isPrimary) {
            let targets = sceneController.getTargets(raycaster, toolMode)
            if (targets.length == 0) {
                sessionController.hovered(false, isPrimary)
            } else {
                if (targets.length > 1) { console.error('Unexpected target result!'); }
                let target = targets[0];
                target.highlight(toolMode);
                helperPointController.showPoint(isPrimary, target.getIntersection().point);
                interactionState.primaryHovered = target;
                sessionController.hovered(true, isPrimary)
            }
        } else {
            // do nothing.
        }
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
        let newOrientation = new THREE.Quaternion()
            .multiplyQuaternions(interactionState.data.startOrientation, rotation);
        let newPosition = new THREE.Vector3().copy(interactionState.data.startPosition)
            .sub(fromRay.origin).applyQuaternion(rotation).add(toRay.origin);

        interactionState.data.rootTarget.setWorldPosition(newPosition);
        interactionState.data.rootTarget.setLocalOrientation(newOrientation);
    } else {
        console.error('invalid state:' + toolMode.tool + ", " + interactionState.type);
    }
}

function pointerDown(raycaster, orientation, isPrimary, interactionState, toolMode, model, sessionController, sceneController, helperPointController) {
    let hovered = isPrimary ? interactionState.primaryHovered : interactionState.secondaryHovered;
    if (hovered) {
        if (interactionState.type == InteractionType.NONE) {
            if (toolMode.surfaceSettings.mode == SurfaceToolButtons.FLATTEN) {
                interactionState.type = InteractionType.BRUSHING;
                interactionState.data = { target: hovered };
            } else if (toolMode.surfaceSettings.mode == SurfaceToolButtons.PULL) {
                startOneHandMove();
            } else {
                console.error("Not handled:" + toolMode.surfaceSettings.mode);
            }
        } else {
            console.error("TODO: Handle this edge case");
        }
    }
}

function pointerUp(raycaster, orientation, isPrimary, interactionState, toolMode, model, sessionController, sceneController, helperPointController) {
    let type = interactionState.type;
    let data = interactionState.data;

    interactionState.type = InteractionType.NONE;
    interactionState.data = {};

    let updates = []

    if (type == InteractionType.BRUSHING) {
        let path = data.target.getDrawnPath();
        let shapes = Util.breakUpUVSelection(path).map(s => {
            let coordArray = []
            for (let i = 0; i < s.length; i += 2) {
                coordArray.push({ x: s[i], y: s[i + 1] });
            }
            return coordArray;
        }).map(arr => {
            return simplify2.douglasPeucker(arr, 0.005);
        })
        let points = shapes.reduce((arr, curr) => arr.concat(curr), [])
            .map(p => [p.x, p.y]).flat();

        let normal = new THREE.Vector3();
        for (let i = 0; i < points.length; i += 2) {
            normal.add(Util.uvToPoint(points[i], points[i + 1]));
        }
        normal.normalize();
        let surfaceId = IdUtil.getUniqueId(Data.PhotosphereSurface);

        let photosphereId = data.target.getId();
        let photosphere = model.photospheres.find(p => p.id == photosphereId);
        if (!photosphere) { console.error('invalid id: ' + photosphereId); return []; }

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
            let bpi = s.basePointIndices.filter(i => !includedIndices.includes(i));
            if (bpi.length != s.basePointIndices.length) {
                u.push(new ModelUpdate({
                    id: s.id,
                    basePointIndices: bpi,
                }));
            }
            let points = []
            for (let shape of shapes) {
                for (let i = 0; i < s.points.length; i += 2) {
                    if (!Util.pointInPolygon({ x: s.points[i], y: s.points[i + 1] }, shape)) {
                        points.push(s.points[i], s.points[i + 1]);
                    }
                }
            }
            if (points.length != s.points.length) {
                u.push(new ModelUpdate({
                    id: s.id,
                    points,
                }));
            }
            if (bpi.length == 0 && points.length == 0) {
                u = [new ModelUpdate({ id: s.id }, ModelUpdateCommands.DELETE)]
            }
            updates.push(...u);
        }

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
    } else if (type == InteractionType.ONE_HAND_MOVE) {
        console.error('not implimented');
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