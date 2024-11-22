import * as THREE from 'three';
import { Data } from "../../data.js";
import { GLTKUtil } from '../../utils/gltk_util.js';
import { InteractionTargetWrapper } from './interaction_target_interface.js';

export function PoseableAssetWrapper(parent) {
    let mModel = new Data.StoryModel();
    let mParent = parent;
    let mPoseableAsset = new Data.PoseableAsset();
    let mPoses = [];
    let mGLTF = null;
    let mTargets = [];
    let mInteractionTargets = [];
    let mModelGroup = new THREE.Group();
    mParent.add(mModelGroup);

    const BoneMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(0x0000ff),
        depthTest: false,
        depthWrite: false,
        transparent: true
    });

    async function update(poseableAsset, model, assetUtil) {
        mModel = model;

        mPoses = mModel.assetPoses.filter(p => poseableAsset.poseIds.includes(p.id));

        let oldModel = mPoseableAsset;
        mPoseableAsset = poseableAsset;

        // ensure the interaction targets exist because we're going
        // to add things to them.
        mInteractionTargets = makeInteractionTargets();

        if (mPoseableAsset.assetId != oldModel.assetId) {
            if (mGLTF) remove();
            try {
                mGLTF = await assetUtil.loadAssetModel(mPoseableAsset.assetId)
                mModelGroup.add(mGLTF.scene);

                mTargets = []
                let targets = GLTKUtil.getInteractionTargetsFromGTLKScene(mGLTF.scene);
                targets.forEach(target => {
                    if (target.isMesh) {
                        let pose = mPoses.find(p => p.name == target.name);
                        if (!pose) { console.error("Mismatched PoseableAsset and asset!"); return; }
                        target.userData.poseId = pose.id;
                        if (!target.material) { target.material = new THREE.MeshBasicMaterial() }
                        target.userData.originalColor = target.material.color.getHex();

                        mTargets.push(target)
                    } else if (target.type == "Bone") {
                        let pose = mPoses.find(p => p.name == target.name);
                        if (!pose) { console.error("Mismatched PoseableAsset and asset!"); return; }
                        let targetGroup = attachBoneTarget(target, pose.id);
                        mTargets.push(targetGroup);
                    } else {
                        console.error("Unexpected target type!", target);
                    }
                })

            } catch (error) {
                console.error(error);
            }
        }

        mPoses.forEach(pose => {
            let object = mGLTF.scene.getObjectByName(pose.name);
            if (!object) { console.error("Invalid pose!", pose); return; }
            object.setRotationFromQuaternion(new THREE.Quaternion().fromArray(pose.orientation));
            object.position.set(pose.x, pose.y, pose.z);
            object.scale.set(pose.scale, pose.scale, pose.scale);
        })
    }

    function getId() {
        return mPoseableAsset.id;
    }

    function remove() {
        mParent.remove(mModelGroup)
    }

    function getTargets(ray) {
        if (!mGLTF) return [];
        const intersects = ray.intersectObjects(mTargets);
        let targets = intersects.map(i => {
            if (!i.object) { console.error("Invalid Intersect!"); return null; }
            let poseId = i.object.userData.poseId;

            let target = mInteractionTargets.find(t => t.getId() == poseId);
            if (!target) { console.error("Invalid intersect mesh, no target!", poseId); return null; }
            target.getIntersection = () => { return i }

            return target;
        }).filter(t => t);
        return targets;
    }

    function makeInteractionTargets() {
        return mPoses.map(pose => {
            let interactionTarget = new InteractionTargetWrapper();

            interactionTarget.getLocalPosition = () => {
                let p = new THREE.Vector3();
                if (mGLTF) {
                    let obj = mGLTF.scene.getObjectByName(pose.name);
                    p.copy(obj.position)
                }
                return p;
            }

            interactionTarget.getWorldPosition = () => {
                let worldPos = new THREE.Vector3();
                if (mGLTF) {
                    let obj = mGLTF.scene.getObjectByName(pose.name);
                    obj.getWorldPosition(worldPos);
                }
                return worldPos;
            }

            interactionTarget.setWorldPosition = (worldPos) => {
                if (mGLTF) {
                    let obj = mGLTF.scene.getObjectByName(pose.name);
                    let localPosition = obj.parent.worldToLocal(worldPos);
                    obj.position.copy(localPosition)
                }
            }

            interactionTarget.getLocalOrientation = () => {
                let q = new THREE.Quaternion();
                if (mGLTF) {
                    let obj = mGLTF.scene.getObjectByName(pose.name);
                    q.copy(obj.quaternion);
                }
                return q;
            }

            interactionTarget.setLocalOrientation = (orientation) => {
                if (mGLTF) {
                    let obj = mGLTF.scene.getObjectByName(pose.name);
                    obj.quaternion.copy(orientation)
                }
            }

            interactionTarget.getScale = () => {
                let scale = 1;
                if (mGLTF) {
                    let obj = mGLTF.scene.getObjectByName(pose.name);
                    scale = obj.scale.x;
                }
                return scale;
            }

            interactionTarget.setScale = (scale) => {
                if (mGLTF) {
                    let obj = mGLTF.scene.getObjectByName(pose.name);
                    obj.scale.set(scale, scale, scale);
                }
            }

            interactionTarget.getParent = () => {
                let obj = mGLTF.scene.getObjectByName(pose.name);
                if (!obj.parent || obj.parent == mGLTF.scene) return null;
                let parentPose = mPoses.find(p => p.name == obj.parent.name);
                if (!parentPose) { console.error("Invalid target: " + obj.parent.name); return null; };
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

                let rootPose = mPoses.find(p => p.name == root.name);
                if (!rootPose) { console.error("Invalid target!", root); return null; };
                let target = mInteractionTargets.find(t => t.getId() == rootPose.id);
                return target;
            }

            interactionTarget.getDepth = () => {
                let obj = mGLTF.scene.getObjectByName(pose.name);
                let root = obj;
                let count = 0;
                while (root.parent && root.parent != mGLTF.scene && root.parent.type == "Bone") {
                    root = root.parent;
                    count++;
                }

                return count;
            }

            interactionTarget.getObject3D = () => {
                let obj = mGLTF.scene.getObjectByName(pose.name);
                return obj
            }

            interactionTarget.highlight = () => {
                let obj = interactionTarget.getObject3D();
                if (obj.isMesh) {
                    obj.material.color.set(0x0000ff);
                } else if (obj.type == "Bone") {
                    let lineGroup = obj.children.find(c => c.userData.boneLines);
                    if (!lineGroup) { console.error("Malformed target", obj) }
                    lineGroup.visible = true;
                } else {
                    console.error("Unexpected target object!", obj);
                }
            };
            interactionTarget.unhighlight = () => {
                let obj = interactionTarget.getObject3D();
                if (obj.isMesh) {
                    obj.material.color.set(obj.userData.originalColor);
                } else if (obj.type == "Bone") {
                    let lineGroup = obj.children.find(c => c.userData.boneLines);
                    if (!lineGroup) { console.error("Malformed target", obj) }
                    lineGroup.visible = false;
                } else {
                    console.error("Unexpected target object!", obj);
                }
            }

            interactionTarget.getId = () => pose.id;
            return interactionTarget;
        });
    }

    function attachBoneTarget(bone, poseId) {
        const group = new THREE.Group();
        group.userData.boneLines = true;
        group.visible = false;
        group.name = bone.name;
        bone.add(group);
        // group.visible = false;
        let childBones = bone.children.filter(i => i.type == "Bone");
        if (childBones.length > 0) {
            let point1 = new THREE.Vector3();
            bone.getWorldPosition(point1);

            childBones.forEach(b => {
                const point2 = new THREE.Vector3();
                b.getWorldPosition(point2);
                const geometry = new THREE.BufferGeometry();
                geometry.setFromPoints([point1, point2]);
                const line = new THREE.Line(geometry, BoneMaterial);
                line.userData.poseId = poseId;
                line.name = bone.name;
                group.attach(line);
            })
        } else {
            const geometry = new THREE.SphereGeometry(0.03, 4, 2);
            const sphere = new THREE.Mesh(geometry, BoneMaterial);
            sphere.userData.poseId = poseId;
            bone.getWorldPosition(sphere.position);
            group.attach(sphere);
        }

        return group;
    }

    this.update = update;
    this.getId = getId;
    this.remove = remove;
    this.getTargets = getTargets;
}