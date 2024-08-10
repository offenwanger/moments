import * as THREE from 'three';
import { EditMode } from '../../constants.js';
import { DataModel } from "../../data_model.js";
import { SceneUtil } from '../../utils/scene_util.js';
import { AnnotationWrapper } from "./annotation_wrapper.js";
import { Model3DWrapper } from "./model3D_wrapper.js";

export function StoryWrapper(parent) {
    let mModel = new DataModel();
    let mMode = EditMode.MODEL;
    let mLinePoints = []
    let mLine = new THREE.Line();
    const mLineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 });

    let mStoryGroup = new THREE.Group();
    parent.add(mStoryGroup);

    let mDirectionAmbientLight = new THREE.DirectionalLight(0xFFFFFF, 2);
    mStoryGroup.add(mDirectionAmbientLight);
    let mReverseAmbientLight = new THREE.DirectionalLight(0xFF1111, 2);
    mStoryGroup.add(mReverseAmbientLight);

    let mSpotlights = [new THREE.SpotLight(0xffffff, 1), new THREE.SpotLight(0xffffff, 1), new THREE.SpotLight(0xffffff, 1)];
    mSpotlights.forEach((light, i) => {
        light.angle = Math.PI / 3;
        light.penumbra = 1;
        light.decay = 2;
        light.distance = 0;
        light.castShadow = false;
    })
    mStoryGroup.add(...mSpotlights);
    mStoryGroup.add(...mSpotlights.map(s => s.target));

    setSpotlight(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1));

    let mLastUserPosition = new THREE.Vector3();

    let mModel3DWrappers = [];
    let mAnnotationWrappers = [];

    async function updateModel(model, assetUtil) {
        mModel = model;
        let story = mModel.getStory();
        mLinePoints = story.timeline.map(p => new THREE.Vector3(p.x, p.y, p.z));
        mStoryGroup.remove(mLine);

        const geometry = new THREE.BufferGeometry().setFromPoints(mLinePoints);
        mLine = new THREE.Line(geometry, mLineMaterial);
        mStoryGroup.add(mLine);

        await SceneUtil.updateWrapperArray(mModel3DWrappers, story.model3Ds, mModel, assetUtil, async (model3D) => {
            let newModel3DWrapper = new Model3DWrapper(mStoryGroup);
            return newModel3DWrapper;
        });

        await SceneUtil.updateWrapperArray(mAnnotationWrappers, story.annotations, mModel, assetUtil, async (annotation) => {
            let newAnnotationWrapper = new AnnotationWrapper(mStoryGroup);
            return newAnnotationWrapper;
        });

        updateLights();
    }


    function render() {

    }

    function onUserMove(globalPosition) {
        mLastUserPosition.copy(globalPosition);
        updateLights()
    }

    function updateLights() {
        let { pos, dir } = mLinePoints.reduce((prev, p, i) => {
            if (i == mLinePoints.length - 1) {
                // we're at the end of the line, don't need dist anymore.
                return prev;
            }
            let line = new THREE.Line3(p, mLinePoints[i + 1])
            let possiblePoint = new THREE.Vector3();
            line.closestPointToPoint(mLastUserPosition, true, possiblePoint);
            let possibleDist = possiblePoint.distanceTo(mLastUserPosition);
            if (possibleDist < prev.dist) {
                return {
                    pos: possiblePoint,
                    dir: new THREE.Vector3().subVectors(mLinePoints[i + 1], p).normalize(),
                    dist: possibleDist
                };
            } else return prev;
        }, { pos: new THREE.Vector3(), dir: new THREE.Vector3(), dist: Infinity })

        setSpotlight(pos, dir);
    }

    function globalToLocalPosition(globalPosition) {
        return globalPosition;
    }

    function localToGlobalPosition(localPosition) {
        return localPosition;
    }

    function getTargets(ray) {
        return [
            ...mModel3DWrappers.map(w => w.getTargets(ray)).flat(),
            ...mAnnotationWrappers.map(w => w.getTargets(ray)).flat(),
        ]
    }

    function setSpotlight(pos, dir) {
        let offsets = [new THREE.Vector3(0.5, 0, 0.5), new THREE.Vector3(-0.5, 0, 0.5), new THREE.Vector3(0, 0.5, 0.5)]
        mSpotlights.forEach((light, i) => {
            light.position.copy(pos);
            light.target.position.addVectors(pos, dir);
            light.updateMatrix()
            let offset = new THREE.Vector3().copy(offsets[i].applyQuaternion(light.quaternion));
            light.position.add(offset);
        });

        mDirectionAmbientLight.position.copy(new THREE.Vector3().addScaledVector(dir, -1))
        mReverseAmbientLight.position.copy(dir)
    }

    function setMode(mode) {
        mMode = mode;
        if (mMode == EditMode.TIMELINE) {
            mLine.material.opacity = 1;
            mStoryGroup.remove(...mSpotlights)
        } else {
            mLine.material.opacity = 0.1;
            mStoryGroup.add(...mSpotlights)
        }

        mModel3DWrappers.forEach(w => w.setMode(mode));
        mAnnotationWrappers.forEach(w => w.setMode(mode));
    }

    this.updateModel = updateModel;
    this.render = render;
    this.onUserMove = onUserMove;
    this.getTargets = getTargets;
    this.setMode = setMode;
}