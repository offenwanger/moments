import * as THREE from 'three';
import { CCDIKHelper, CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DOUBLE_CLICK_SPEED, USER_HEIGHT } from '../../constants.js';

export function CanvasViewController(parentContainer) {
    const DRAGGING = 'dragging'
    const DRAGGING_KINEMATIC = 'draggingKinematic'
    const NAVIGATING = 'navigating'

    let mMoveCallback = async () => { }
    let mMoveChainCallback = async () => { }

    let mWidth = 10;
    let mHeight = 10;

    let mSceneController;
    let mRendering = false;

    let mInteraction = false;
    let mHovered = []
    let mFreeze = []
    let mFreezeRoots = []
    let mHighlight = [];
    let mHold = null;
    let mLastPointerDown = { time: 0, pos: { x: 0, y: 0 } }
    const mRaycaster = new THREE.Raycaster();

    let mIKSolver
    let mCCDIKHelper

    let mMainCanvas = parentContainer.append('canvas')
        .attr('id', 'main-canvas')
        .style('display', 'block')
        .on('pointerdown', (e) => onPointerDown({ x: e.clientX, y: e.clientY }))

    let mPageRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: mMainCanvas.node() });

    const fov = 75, aspect = 2, near = 0.1, far = 200;
    const mPageCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    mPageCamera.position.set(0, USER_HEIGHT, 0);

    const mOrbitControls = new OrbitControls(mPageCamera, mPageRenderer.domElement);
    mOrbitControls.minDistance = 2;
    mOrbitControls.maxDistance = 2;
    mOrbitControls.target.set(0, 2, -2);
    mOrbitControls.update();
    mOrbitControls.addEventListener('change', () => {
        if (!mSceneController) return;
        mSceneController.onCameraMove(mPageCamera.position);
    })

    function pageRender(time) {
        if (time < 0) return;
        if (!mSceneController) return;
        mPageRenderer.render(mSceneController.getScene(), mPageCamera);
    }

    function resize(width, height) {
        mWidth = width;
        mHeight = height;

        if (!mPageRenderer) return;
        mPageRenderer.setSize(width, height, false);

        mPageCamera.aspect = width / height;
        mPageCamera.updateProjectionMatrix();
    }

    function onPointerDown(screenCoords) {
        if (Date.now() - mLastPointerDown.time < DOUBLE_CLICK_SPEED && new THREE.Vector2().subVectors(screenCoords, mLastPointerDown.pos).length() < 10) {
            onDoubleDown(screenCoords);
            return;
        }
        mLastPointerDown.time = Date.now();
        mLastPointerDown.pos = screenCoords;

        let validHoverTargets = mHovered.filter(h => !mFreeze.find(f => f.getId() == h.getId()));

        if (validHoverTargets.length > 0) {
            let target = validHoverTargets[0];
            let rootTarget = target.getRoot();
            if (mFreezeRoots.find(f => f.getId() == rootTarget.getId())) {
                let targetBone = target.getObject3D();
                let rootBone = rootTarget.getObject3D();

                let intersection = target.getIntersection();
                let controlBone = new THREE.Bone();

                let targetChild = targetBone.children.find(b => b.type == "Bone");
                let localPosition = targetChild.worldToLocal(intersection.point);

                controlBone.position.copy(localPosition)
                targetChild.add(controlBone);

                let bones = []
                rootBone.traverse(b => {
                    if (b.type == "Bone") bones.push(b);
                })

                const skeleton = new THREE.Skeleton(bones);
                const mesh = new THREE.SkinnedMesh();
                mesh.bind(skeleton);

                let freezeChain = []
                let freezeTarget = mFreeze.find(f => f.getRoot().getId() == rootTarget.getId());
                let freezeParent = freezeTarget;
                while (freezeParent && freezeParent.getId() != rootTarget.getId()) {
                    freezeChain.push(freezeParent);
                    freezeParent = freezeParent.getParent();
                }

                let affectedTargets = []

                let affectedParent = target;
                while (affectedParent.getId() != rootTarget.getId() &&
                    !freezeChain.find(i => i.getId() == affectedParent.getId())) {
                    affectedTargets.push(affectedParent);
                    affectedParent = affectedParent.getParent();
                }

                let links = affectedTargets.map(t => {
                    return { index: bones.indexOf(t.getObject3D()) };
                })
                links.unshift({ index: bones.indexOf(target.getObject3D()) })

                const iks = [{
                    target: bones.indexOf(controlBone),
                    effector: bones.indexOf(targetChild),
                    links,
                }];
                mIKSolver = new CCDIKSolver(mesh, iks);
                mCCDIKHelper = new CCDIKHelper(mesh, iks, 0.01);
                mSceneController.getScene().add(mCCDIKHelper);

                mInteraction = {
                    type: DRAGGING_KINEMATIC,
                    controlBone,
                    targetChild,
                    affectedTargets,
                    start: screenCoords,
                    distance: intersection.distance,
                }
            } else {
                let intersection = target.getIntersection();
                let rootTarget = target.getRoot();
                let targetToPos = new THREE.Vector3().subVectors(rootTarget.getTargetWorldPosition(), intersection.point)

                mInteraction = {
                    type: DRAGGING,
                    start: screenCoords,
                    target: rootTarget,
                    targetToPos,
                    distance: intersection.distance,
                }
            }
        } else {
            mInteraction = { type: NAVIGATING }
        }
    }

    function onDoubleDown() {
        if (mHovered.length > 0) {
            let target = mHovered[0];
            if (mFreeze.find(f => f.getId() == target.getId())) {
                mFreeze.splice(mFreeze.findIndex(f => f.getId() == target.getId()), 1);
            } else {
                mFreeze.push(target);
                mFreezeRoots.push(target.getRoot())
            }
        } else {
            mFreeze = []
        }
        mFreezeRoots = mFreezeRoots.filter(r => mFreeze.find(f => f.getRoot().getId() == r.getId()));
    }

    function pointerMove(screenCoords) {
        mIKSolver?.update();
        if (!mRendering) return;
        if (!mInteraction) {
            let pointer = screenToNomralizedCoords(screenCoords);
            mRaycaster.setFromCamera(pointer, mPageCamera);

            let intersections = mSceneController.getIntersections(mRaycaster);
            if (intersections.map(i => i.getId()).sort().join() != mHovered.map(i => i.getId()).sort().join()) {
                mHovered = intersections;
                updateHighlight();
            }

            if (mHovered.length == 0) {
                mOrbitControls.enabled = true;
            } else {
                mOrbitControls.enabled = false;
            }
        } else if (mInteraction.type == DRAGGING) {
            let pointer = screenToNomralizedCoords(screenCoords);
            mRaycaster.setFromCamera(pointer, mPageCamera);
            let position = mRaycaster.ray.at(mInteraction.distance, new THREE.Vector3());
            position.add(mInteraction.targetToPos)
            mInteraction.target.setTargetWorldPosition(position);
        } else if (mInteraction.type == DRAGGING_KINEMATIC) {
            let pointer = screenToNomralizedCoords(screenCoords);
            mRaycaster.setFromCamera(pointer, mPageCamera);
            let position = mRaycaster.ray.at(mInteraction.distance, new THREE.Vector3());
            let localPosition = mInteraction.targetChild.worldToLocal(position);
            mInteraction.controlBone.position.copy(localPosition);
        }
    }

    async function pointerUp(screenCoords) {
        mIKSolver = null
        mSceneController.getScene().remove(mCCDIKHelper);
        let interaction = mInteraction;
        mInteraction = false;
        if (interaction) {
            if (interaction.type == DRAGGING) {
                let pointer = screenToNomralizedCoords(screenCoords);
                mRaycaster.setFromCamera(pointer, mPageCamera);
                let position = mRaycaster.ray.at(interaction.distance, new THREE.Vector3());
                position.add(interaction.targetToPos)
                let localPos = interaction.target.getTargetLocalPosition();

                await mMoveCallback(interaction.target.getId(), localPos);
            } else if (interaction.type == DRAGGING_KINEMATIC) {
                mMoveChainCallback(interaction.affectedTargets.map(t => {
                    return {
                        id: t.getId(),
                        position: t.getTargetLocalPosition(),
                        orientation: t.getTargetLocalOrientation(),
                    }
                }))
            }
        }
    }

    function updateHighlight() {
        mHighlight.forEach(item => item.unhighlight());
        mHighlight = mHovered.concat(mFreeze);
        if (mHold) mHighlight.push(mHold.target);
        // some basic validation.
        mHighlight = mHighlight.filter(item => {
            if (!item || typeof item.unhighlight != "function" || typeof item.highlight != "function") {
                return false;
            }
            return true;
        });
        mHighlight.forEach(item => item.highlight())
    }

    function screenToNomralizedCoords(screenCoords) {
        let bb = mMainCanvas.node().getBoundingClientRect();
        let x = ((screenCoords.x - bb.x) / bb.width) * 2 - 1;
        let y = - ((screenCoords.y - bb.y) / bb.height) * 2 + 1;
        return { x, y }
    }

    this.resize = resize;

    this.startRendering = () => { mPageRenderer.setAnimationLoop(pageRender); mRendering = true; }
    this.stopRendering = () => { mPageRenderer.setAnimationLoop(null); mRendering = false; }
    this.setScene = (scene) => { mSceneController = scene }
    this.pointerMove = pointerMove;
    this.pointerUp = pointerUp;

    this.onMove = (func) => { mMoveCallback = func }
    this.onMoveChain = (func) => { mMoveChainCallback = func }
}