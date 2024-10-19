import * as THREE from 'three';
import { EditMode } from '../../constants.js';
import { Data } from "../../data.js";
import { GLTKUtil } from '../../utils/gltk_util.js';
import { InteractionTargetWrapper } from './interaction_target_wrapper.js';

export function Model3DWrapper(parent) {
    let mModel = new Data.StoryModel();
    let mParent = parent;
    let mModel3D = new Data.Model3D();
    let mPoses = [];
    let mGLTF = null;
    let mMode = EditMode.MODEL;
    let mTargets = [];
    let mInteractionTargets = [];
    let mModelGroup = new THREE.Group();
    mParent.add(mModelGroup);

    const mHighlightMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000
    })
    const BoneMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(0xff0000),
        depthTest: false,
        depthWrite: false,
        transparent: true
    });

    async function update(model3D, model, assetUtil) {
        mModel = model;

        mPoses = mModel.assetPoses.filter(p => model3D.poseIds.includes(p.id));

        let oldModel = mModel3D;
        mModel3D = model3D;

        // ensure the interaction targets exist because we're going
        // to add things to them.
        mInteractionTargets = makeInteractionTargets();

        if (mModel3D.assetId != oldModel.assetId) {
            if (mGLTF) remove();
            try {
                mGLTF = await assetUtil.loadAssetModel(mModel3D.assetId)
                mModelGroup.add(mGLTF.scene);

                mTargets = []
                let targets = GLTKUtil.getInteractionTargetsFromGTLKScene(mGLTF.scene);
                targets.forEach(target => {
                    if (target.isMesh) {
                        let pose = mPoses.find(p => p.name == target.name);
                        if (!pose) { console.error("Mismatched Model3D and asset!"); return; }
                        target.userData.poseId = pose.id;
                        target.userData.originalMaterial = target.material;

                        mTargets.push(target)
                    } else if (target.type == "Bone") {
                        let pose = mPoses.find(p => p.name == target.name);
                        if (!pose) { console.error("Mismatched Model3D and asset!"); return; }
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
            // object.scale.set(model3D.size / mModelSize, model3D.size / mModelSize, model3D.size / mModelSize);
        })
    }

    function getId() {
        return mModel3D.id;
    }

    function remove() {
        mParent.remove(mModelGroup)
    }

    function getTargets(ray) {
        if (mModel3D.isWorld && mMode != EditMode.WORLD) return [];
        if (!mModel3D.isWorld && mMode != EditMode.MODEL) return [];

        if (!mGLTF) return []

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
                    console.log("Something is wrong here...")
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
                let parentPose = mPoses.find(p => p.name == obj.parent.name);
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

                let rootPose = mPoses.find(p => p.name == root.name);
                if (!rootPose) { console.error("Invalid target!", root); return null; };
                let target = mInteractionTargets.find(t => t.getId() == rootPose.id);
                return target;
            }

            interactionTarget.getObject3D = () => {
                let obj = mGLTF.scene.getObjectByName(pose.name);
                return obj
            }

            interactionTarget.highlight = () => {
                let obj = interactionTarget.getObject3D();
                if (obj.isMesh) {
                    obj.material = mHighlightMaterial;
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
                    obj.material = obj.userData.originalMaterial
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

    function setMode(mode) {
        mMode = mode;
    }

    this.update = update;
    this.getId = getId;
    this.remove = remove;
    this.getTargets = getTargets;
    this.setMode = setMode;
}