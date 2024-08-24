import * as THREE from 'three';
import { EditMode } from "../../constants.js";
import { Data } from "../../data.js";
import { InteractionTargetWrapper } from "./interaction_target_wrapper.js";

export function AnnotationWrapper(parent) {
    let mParent = parent;
    let mAnnotation = new Data.Annotation();
    let mMode = EditMode.MODEL;
    let mInteractionTarget = createInteractionTarget();

    const mMaterial = new THREE.SpriteMaterial({ transparent: true });
    const mPlane = new THREE.Sprite(mMaterial);
    parent.add(mPlane);

    async function update(annotation, model, assetUtil) {
        new THREE.TextureLoader().load(annotation.image, (texture) => {
            mMaterial.map = texture;
            mMaterial.needsUpdate = true;
        })
        mPlane.position.set(annotation.x, annotation.y, annotation.z);
        mPlane.scale.set(annotation.size, annotation.size, 1)
        mAnnotation = annotation;
    }

    function getId() {
        return mAnnotation.id;
    }

    function remove() {
        mParent.remove(mPlane);
    }

    function getTargets(ray) {
        if (mAnnotation.isWorld && mMode != EditMode.WORLD) return [];
        if (!mAnnotation.isWorld && mMode != EditMode.MODEL) return [];
        const intersect = ray.intersectObject(mPlane);
        if (intersect.length > 0) {
            mInteractionTarget.getIntersection = () => { return intersect[0]; }
            return [mInteractionTarget];
        } else return [];
    }

    function setMode(mode) {
        mMode = mode;
    }

    function createInteractionTarget() {
        let target = new InteractionTargetWrapper();
        target.getTargetLocalPosition = () => {
            let p = new THREE.Vector3();
            p.copy(mPlane.position)
            return p;
        }
        target.getTargetWorldPosition = () => {
            let worldPos = new THREE.Vector3();
            mPlane.getWorldPosition(worldPos);
            return worldPos;
        }
        target.setTargetWorldPosition = (worldPos) => {
            let localPosition = mPlane.parent.worldToLocal(worldPos);
            mPlane.position.copy(localPosition)
        }
        target.getTargetLocalOrientation = () => {
            let q = new THREE.Quaternion();
            q.copy(mPlane.quaternion);
            return q;
        }
        target.getParent = () => { return null; }
        target.getRoot = () => { return target; }
        target.getObject3D = () => { return mPlane; }
        target.highlight = () => {
            mMaterial.color.set(0xff0000);
            mMaterial.needsUpdate = true;
        };
        target.unhighlight = () => {
            mMaterial.color.set(0xffffff);
            mMaterial.needsUpdate = true;
        }
        target.getId = () => mAnnotation.id;
        return target;
    }

    this.getTargets = getTargets;
    this.setMode = setMode;
    this.update = update;
    this.getId = getId;
    this.remove = remove;
}