import * as THREE from 'three';
import { Data } from "../../data_structs.js";
import { InteractionTargetWrapper } from './interaction_target_wrapper.js';

export function Model3DWrapper(parent) {
    let mParent = parent;
    let mModel3D = new Data.Model3D();
    let mGLTF = null;
    let mInteractionTargets = [];

    let mHighlightMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })


    let smesh = null;
    async function update(model3D, model, assetUtil) {
        let oldModel = mModel3D;
        mModel3D = model3D;

        if (mModel3D.assetId != oldModel.assetId) {
            if (mGLTF) remove();
            try {
                mGLTF = await assetUtil.loadAssetModel(mModel3D.assetId)
                mParent.add(mGLTF.scene);

                mGLTF.scene.traverse(function (child) {
                    if (child.type == 'SkinnedMesh') smesh = child
                    if (child.isMesh) {
                        child.userData.originalMaterial = child.material;
                    }
                });
            } catch (error) {
                console.error(error);
            }
        }

        mModel3D.assetComponentPoses.forEach(pose => {
            let object = mGLTF.scene.getObjectByName(pose.name);
            if (!object) { console.error("Invalid pose!", pose); return; }
            object.setRotationFromQuaternion(new THREE.Quaternion().fromArray(pose.orientation));
            object.position.set(pose.x, pose.y, pose.z);
            // object.scale.set(model3D.size / mModelSize, model3D.size / mModelSize, model3D.size / mModelSize);
        })


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
                name = (i.object.parent && i.object.parent.type == "Bone") ? i.object.parent.name : i.object.name;
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

            let target = mInteractionTargets.find(t => t.getId() == pose.id);
            target.getIntersection = () => { return i }
            target.highlight = () => {
                if (!i.object.isMesh) { console.error("I'm confused.", i.object); return; }
                i.object.material = mHighlightMaterial;
            };
            target.unhighlight = () => {
                if (!i.object.isMesh) { console.error("I'm confused.", i.object); return; }
                i.object.material = i.object.userData.originalMaterial
            }
            return target;
        }).filter(t => t);
        return targets;
    }

    function makeInteractionTargets() {
        return mModel3D.assetComponentPoses.map(pose => {
            let interactionTarget = new InteractionTargetWrapper();

            interactionTarget.getTargetLocalPosition = () => {
                let p = new THREE.Vector3();
                if (mGLTF) {
                    let obj = mGLTF.scene.getObjectByName(pose.name);
                    p.copy(obj.position)
                }
                return p;
            }

            interactionTarget.getTargetWorldPosition = () => {
                let worldPos = new THREE.Vector3();
                if (mGLTF) {
                    let obj = mGLTF.scene.getObjectByName(pose.name);
                    obj.getWorldPosition(worldPos);
                }
                return worldPos;
            }

            interactionTarget.setTargetWorldPosition = (worldPos) => {
                if (mGLTF) {
                    let obj = mGLTF.scene.getObjectByName(pose.name);
                    let localPosition = obj.parent.worldToLocal(worldPos);
                    obj.position.copy(localPosition)
                }
            }

            interactionTarget.getTargetLocalOrientation = () => {
                let q = new THREE.Quaternion();
                if (mGLTF) {
                    let obj = mGLTF.scene.getObjectByName(pose.name);
                    q.copy(obj.quaternion);
                }
                return q;
            }

            interactionTarget.getParent = () => {
                let obj = mGLTF.scene.getObjectByName(pose.name);
                if (!obj.parent || obj.parent == mGLTF.scene) return null;
                let parentPose = mModel3D.assetComponentPoses.find(p => p.name == obj.parent.name);
                if (!parentPose) { console.error("Invalid target!", obj.parent); return null; };
                let parentTarget = mInteractionTargets.find(t => t.getId() == parentPose.id);
                if (!parentTarget) { console.error("Invalid target!", root); return null; };
                return parentTarget;
            }

            interactionTarget.getRoot = () => {
                let obj = mGLTF.scene.getObjectByName(pose.name);
                let root = obj;
                while (root.parent && root.parent != mGLTF.scene && root.parent.type == "Bone") {
                    root = root.parent;
                }

                let rootPose = mModel3D.assetComponentPoses.find(p => p.name == root.name);
                if (!rootPose) { console.error("Invalid target!", root); return null; };
                let target = mInteractionTargets.find(t => t.getId() == rootPose.id);
                return target;
            }

            interactionTarget.getObject3D = () => {
                let obj = mGLTF.scene.getObjectByName(pose.name);
                return obj
            }

            interactionTarget.getId = () => pose.id;
            return interactionTarget;
        });
    }

    this.update = update;
    this.getId = getId;
    this.remove = remove;
    this.getIntersections = getIntersections;
}