import * as THREE from 'three';
import { Data } from "../../data_structs.js";
import { InteractionTargetWrapper } from './interaction_target_wrapper.js';

export function Model3DWrapper(parent) {
    let mParent = parent;
    let mModel3D = new Data.Model3D();
    let mGLTF = null;
    let mModelSize = 1;
    let mInteractionTargets = [];

    async function update(model3D, model, assetUtil) {
        let oldModel = mModel3D;
        mModel3D = model3D;

        if (mModel3D.assetId != oldModel.assetId) {
            if (mGLTF) remove();
            try {
                mGLTF = await assetUtil.loadAssetModel(mModel3D.assetId)
                mParent.add(mGLTF.scene);
                const box = new THREE.Box3().setFromObject(mGLTF.scene);
                mModelSize = Math.max(...box.getSize(new THREE.Vector3()).toArray());

                mGLTF.scene.traverse(function (child) {
                    if (child.isMesh) {
                        child.material.userData.originalColor = new THREE.Color(0xffffff);
                        child.material.userData.originalColor.copy(child.material.color);
                    }
                });
            } catch (error) {
                console.error(error);
            }
        }

        mGLTF.scene.setRotationFromQuaternion(new THREE.Quaternion().fromArray(model3D.orientation));
        mGLTF.scene.position.set(model3D.x, model3D.y, model3D.z);
        mGLTF.scene.scale.set(model3D.size / mModelSize, model3D.size / mModelSize, model3D.size / mModelSize);

        mInteractionTargets = makeInteractionTargets();
    }

    function getId() {
        return mModel3D.id;
    }

    function remove() {
        mParent.remove(mGLTF.scene)
    }

    function getIntersections(ray) {
        if (!mGLTF) return []
        const intersects = ray.intersectObjects(mGLTF.scene.children);
        let targets = intersects.map(i => {
            let name;
            if (i.object.type == "Mesh") {
                name = (i.object.parent && i.object.parent.type == "Bone") ?
                    i.object.parent.name : i.object.name;
            } else if (i.object.type == 'SkinnedMesh') {
                let skinnedMesh = i.object;
                if (!i.face) { console.error("Not sure why this happened.", i); return null; }

                let vi = i.face.a;
                let sw = skinnedMesh.geometry.attributes.skinWeight;
                let bi = skinnedMesh.geometry.attributes.skinIndex;

                let bindices = [bi.getX(vi), bi.getY(vi), bi.getZ(vi), bi.getW(vi)];
                let weights = [sw.getX(vi), sw.getY(vi), sw.getZ(vi), sw.getW(vi)];
                let w = weights[0];
                let bestI = bindices[0];
                for (let i = 1; i < 4; i++) {
                    if (weights[i] > w) {
                        w = weights[i];
                        bestI = bindices[i];
                    }
                }
                let bone = skinnedMesh.skeleton.bones[bestI];
                name = bone.name;
            } else {
                console.error("Didn't know there were other types. " + i.object.type);
                return null;
            }

            let pose = mModel3D.assetComponentPoses.find(p => p.name == name);
            if (!pose) { console.error("Invalid object!", i.object); return null; };
            return mInteractionTargets.find(t => t.getId() == pose.id);
        }).filter(t => t);
        return targets;
    }

    const highlightColor = new THREE.Color(0xff0000)

    function highlight() {
        mGLTF.scene.traverse(function (child) {
            if (child.isMesh) {
                child.material.color.copy(highlightColor)
            }
        });
    }

    function unhighlight() {
        mGLTF.scene.traverse(function (child) {
            if (child.isMesh) {
                child.material.color.copy(child.material.userData.originalColor)
            }
        });
    }

    function makeInteractionTargets() {
        return mModel3D.assetComponentPoses.map(pose => {
            let interactionTarget = new InteractionTargetWrapper();

            interactionTarget.getPosition = () => {
                return pose.getWorldPosition(new THREE.Vector3());
            }
            interactionTarget.setPosition = (pos) => {
                if (mGLTF) mGLTF.scene.getObjectByName(pose.name).position.copy(pos)
            }
            interactionTarget.highlight = highlight;
            interactionTarget.unhighlight = unhighlight;
            interactionTarget.getId = () => pose.id;
            return interactionTarget;
        });
    }

    this.update = update;
    this.getId = getId;
    this.remove = remove;
    this.getIntersections = getIntersections;
    this.highlight = highlight;
    this.unhighlight = unhighlight;
}