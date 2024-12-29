import * as THREE from 'three';
import { Data } from "../../data.js";
import { GLTKUtil } from '../../utils/gltk_util.js';
import { InteractionTargetInterface } from './interaction_target_interface.js';
import { ToolButtons } from '../../constants.js';

export function PoseableAssetWrapper(parent, audioListener) {
    let mModel = new Data.StoryModel();
    let mParent = parent;
    let mPoseableAsset = new Data.PoseableAsset();
    let mPoses = [];
    let mGLTF = null;
    let mTargets = [];
    let mInteractionTargets = [];
    let mModelGroup = new THREE.Group();
    mParent.add(mModelGroup);

    const mTeleportMap = new THREE.TextureLoader().load('assets/images/teleportIcon.png');
    const mTeleportSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: mTeleportMap }));
    mTeleportSprite.scale.set(0.1, 0.1, 0.1)
    let mTeleportSprites = {};

    const mAudioMap = new THREE.TextureLoader().load('assets/images/audioIcon.png');
    const mAudioSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: mAudioMap }));
    mAudioSprite.scale.set(0.1, 0.1, 0.1)
    let mAudioSprites = {};

    let mSounds = {};

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
            mTeleportSprites = {};
            mAudioSprites = {};
            mSounds = {};
            try {
                mGLTF = await assetUtil.loadAssetModel(mPoseableAsset.assetId)
                mModelGroup.add(mGLTF);

                mTargets = []
                let targets = GLTKUtil.getInteractionTargetsFromGTLKScene(mGLTF);
                // create and assign the mesh data
                targets.forEach(target => {
                    if (!target.isMesh && target.type != "Bone") { console.error("Unexpected target type!", target); return; }

                    let pose = mPoses.find(p => p.name == target.name);
                    if (!pose) {
                        console.error("Cannot find PoseableAsset for item in asset: " + target.name);
                        return;
                    }

                    if (target.isMesh) {
                        target.userData.id = pose.id;
                        if (!target.material) { target.material = new THREE.MeshBasicMaterial() }
                        target.userData.originalColor = target.material.color.getHex();
                        mTargets.push(target)
                    } else if (target.type == "Bone") {
                        let targetGroup = attachBoneTarget(target, pose.id);
                        mTargets.push(targetGroup);
                    }
                })

            } catch (error) {
                console.error(error);
            }
        }

        for (const pose of mPoses) {
            let object = mGLTF.getObjectByName(pose.name);
            if (!object) { console.error("Invalid pose!", pose); return; }

            object.setRotationFromQuaternion(new THREE.Quaternion().fromArray(pose.orientation));
            object.position.set(pose.x, pose.y, pose.z);
            object.scale.set(pose.scale, pose.scale, pose.scale);
            object.userData.id = pose.id;

            let teleport = model.teleports.find(t => t.attachedId == pose.id);
            if (teleport) {
                if (!mTeleportSprites[pose.id]) {
                    mTeleportSprites[pose.id] = mTeleportSprite.clone();
                    object.add(mTeleportSprites[pose.id]);
                    let bbox = new THREE.Box3().setFromObject(object);
                    let size = new THREE.Vector3();
                    bbox.getSize(size);
                    mTeleportSprites[pose.id].position.set(size.x / 2, size.y / 2, size.z / 2);
                }

                object.userData.isTeleport = true;
            } else {
                if (mTeleportSprites[pose.id]) {
                    mTeleportSprites[pose.id].parent.remove(mTeleportSprites[pose.id]);
                    delete mTeleportSprites[pose.id];
                }
                object.userData.isTeleport = false;
            }

            let audio = model.audios.find(a => a.attachedId == pose.id);
            if (audio) {
                if (!mAudioSprites[pose.id]) {
                    mAudioSprites[pose.id] = mAudioSprite.clone();
                    object.add(mAudioSprites[pose.id]);
                    let bbox = new THREE.Box3().setFromObject(object);
                    let size = new THREE.Vector3();
                    bbox.getSize(size);
                    mAudioSprites[pose.id].position.set(size.x / 2, -size.y / 2, size.z / 2);
                }

                if (!mSounds[pose.id]) {
                    mSounds[pose.id] = new THREE.PositionalAudio(audioListener);
                    let buffer = await assetUtil.loadAudioBuffer(audio.assetId);
                    mSounds[pose.id].setBuffer(buffer);
                    mSounds[pose.id].setLoop(true);
                    mSounds[pose.id].setVolume(audio.volume);
                    if (audio.ambient) try { mSounds[pose.id].play() } catch (e) { console.error(e); }
                }

                object.userData.interactionAudio = !audio.ambient;
                object.userData.isAudio = true;
            } else {
                if (mAudioSprites[pose.id]) {
                    mAudioSprites[pose.id].parent.remove(mAudioSprites[pose.id]);
                    delete mAudioSprites[pose.id];
                }
                object.userData.isAudio = false;
            }
        }

        mGLTF.userData.id = poseableAsset.id;
    }

    function getId() {
        return mPoseableAsset.id;
    }

    function remove() {
        mParent.remove(mModelGroup)
        Object.values(mSounds).forEach(s => {
            try { s.stop() } catch (e) { console.error(e); }
        });
    }

    function getTargets(ray, toolMode) {
        if (!mGLTF) return [];
        if (toolMode.tool != ToolButtons.MOVE) return [];

        const intersects = ray.intersectObjects(mTargets);
        let targets = intersects.map(i => {
            if (!i.object) { console.error("Invalid Intersect!"); return null; }
            let poseId = i.object.userData.id;

            let target = mInteractionTargets.find(t => t.getId() == poseId);
            if (!target) { console.error("Invalid intersect mesh, no target!", poseId); return null; }
            target.getIntersection = () => { return i }

            return target;
        }).filter(t => t);
        return targets;
    }

    function makeInteractionTargets(model) {
        return mPoses.map(pose => {
            let interactionTarget = new InteractionTargetInterface();

            interactionTarget.isTeleport = () => {
                let obj = mGLTF.getObjectByName(pose.name);
                return obj.userData.isTeleport;
            }

            interactionTarget.isAudio = () => {
                let obj = mGLTF.getObjectByName(pose.name);
                return obj.userData.isAudio;
            }

            interactionTarget.getLocalPosition = () => {
                let p = new THREE.Vector3();
                if (mGLTF) {
                    let obj = mGLTF.getObjectByName(pose.name);
                    p.copy(obj.position)
                }
                return p;
            }

            interactionTarget.getWorldPosition = () => {
                let worldPos = new THREE.Vector3();
                if (mGLTF) {
                    let obj = mGLTF.getObjectByName(pose.name);
                    obj.getWorldPosition(worldPos);
                }
                return worldPos;
            }

            interactionTarget.setWorldPosition = (worldPos) => {
                if (mGLTF) {
                    let obj = mGLTF.getObjectByName(pose.name);
                    let localPosition = obj.parent.worldToLocal(worldPos);
                    obj.position.copy(localPosition)
                }
            }

            interactionTarget.getLocalOrientation = () => {
                let q = new THREE.Quaternion();
                if (mGLTF) {
                    let obj = mGLTF.getObjectByName(pose.name);
                    q.copy(obj.quaternion);
                }
                return q;
            }

            interactionTarget.setLocalOrientation = (orientation) => {
                if (mGLTF) {
                    let obj = mGLTF.getObjectByName(pose.name);
                    obj.quaternion.copy(orientation)
                }
            }

            interactionTarget.getScale = () => {
                let scale = 1;
                if (mGLTF) {
                    let obj = mGLTF.getObjectByName(pose.name);
                    scale = obj.scale.x;
                }
                return scale;
            }

            interactionTarget.setScale = (scale) => {
                if (mGLTF) {
                    let obj = mGLTF.getObjectByName(pose.name);
                    obj.scale.set(scale, scale, scale);
                }
            }

            interactionTarget.getParent = () => {
                let obj = mGLTF.getObjectByName(pose.name);
                if (!obj.parent || obj.parent == mGLTF) return null;
                let parentPose = mPoses.find(p => p.name == obj.parent.name);
                if (!parentPose) { console.error("Invalid target: " + obj.parent.name); return null; };
                let parentTarget = mInteractionTargets.find(t => t.getId() == parentPose.id);
                if (!parentTarget) { console.error("Invalid target!", root); return null; };
                return parentTarget;
            }

            interactionTarget.getRoot = () => {
                let obj = mGLTF.getObjectByName(pose.name);
                let root = obj;
                while (root.parent && root.parent != mGLTF && root.parent.type == "Bone") {
                    root = root.parent;
                }

                let rootPose = mPoses.find(p => p.name == root.name);
                if (!rootPose) { console.error("Invalid target!", root); return null; };
                let target = mInteractionTargets.find(t => t.getId() == rootPose.id);
                return target;
            }

            interactionTarget.getDepth = () => {
                let obj = mGLTF.getObjectByName(pose.name);
                let root = obj;
                let count = 0;
                while (root.parent && root.parent != mGLTF && root.parent.type == "Bone") {
                    root = root.parent;
                    count++;
                }

                return count;
            }

            interactionTarget.getObject3D = () => {
                let obj = mGLTF.getObjectByName(pose.name);
                return obj
            }

            interactionTarget.highlight = (toolMode) => {
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
            interactionTarget.select = (toolMode) => {
                let obj = mGLTF.getObjectByName(pose.name);
                if (obj.userData.interactionAudio) try { mSounds[pose.id].play(); } catch (e) { console.error(e); }
            };
            interactionTarget.idle = (toolMode) => {
                let obj = interactionTarget.getObject3D();
                if (obj.userData.interactionAudio) try { mSounds[pose.id].pause(); } catch (e) { console.error(e); }

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
                line.userData.id = poseId;
                line.name = bone.name;
                group.attach(line);
            })
        } else {
            const geometry = new THREE.SphereGeometry(0.03, 4, 2);
            const sphere = new THREE.Mesh(geometry, BoneMaterial);
            sphere.userData.id = poseId;
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