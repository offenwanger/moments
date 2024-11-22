import * as THREE from 'three';
import { CCDIKHelper, CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DOUBLE_CLICK_SPEED, USER_HEIGHT } from '../../constants.js';
import { GLTKUtil } from '../../utils/gltk_util.js';

export function CanvasViewController(parentContainer, mWebsocketController) {
    const DRAGGING = 'dragging'
    const DRAGGING_KINEMATIC = 'draggingKinematic'
    const NAVIGATING = 'navigating'

    let mTransformCallback = async () => { }
    let mTransformManyCallback = async () => { }

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
    mRaycaster.near = 0.2;

    let mLastPointerPosition = { x: -10, y: -10 }

    let mIKSolver
    let mCCDIKHelper

    let mMainCanvas = parentContainer.append('canvas')
        .attr('id', 'main-canvas')
        .style('display', 'block')
        .on('pointerdown', (e) => onPointerDown({ x: e.clientX, y: e.clientY }))
        .on('wheel', (e) => onWheel({ x: e.clientX, y: e.clientY, amount: e.wheelDelta }))

    let mInterfaceCanvas = parentContainer.append('canvas')
        .attr('id', 'interface-canvas')
        .style('display', 'none')
        .style('position', 'absolute')
        .style('top', '0')
        .style('left', '0')
        .on('pointerdown', (e) => onPointerDown({ x: e.clientX, y: e.clientY }))
    let mInterfaceCanvasContext = mInterfaceCanvas.node().getContext('2d');

    let mPageRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: mMainCanvas.node() });

    const fov = 75, aspect = 2, near = 0.1, far = 200;
    const mPageCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    mPageCamera.position.set(0, USER_HEIGHT, 0);

    const mOrbitControls = new OrbitControls(mPageCamera, mPageRenderer.domElement);
    mOrbitControls.minDistance = 1;
    mOrbitControls.maxDistance = 1;
    mOrbitControls.enableZoom = false;
    mOrbitControls.target.set(0, 2, -2);
    mOrbitControls.update();
    mOrbitControls.addEventListener('change', () => {
        if (!mSceneController) return;
        mSceneController.userMove(mPageCamera.position);
        mWebsocketController.updateParticipant({
            x: mPageCamera.position.x,
            y: mPageCamera.position.y,
            z: mPageCamera.position.z,
            orientation: mPageCamera.quaternion.toArray()
        })
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

        mInterfaceCanvas.attr('width', width);
        mInterfaceCanvas.attr('height', height);

        mPageCamera.aspect = width / height;
        mPageCamera.updateProjectionMatrix();
    }

    function onWheel(coords) {
        let dir = new THREE.Vector3()
        mPageCamera.getWorldDirection(dir);
        mOrbitControls.target.addScaledVector(dir, coords.amount / 1000);
        mOrbitControls.update();
    }

    function onPointerDown(screenCoords) {
        if (Date.now() - mLastPointerDown.time < DOUBLE_CLICK_SPEED && new THREE.Vector2().subVectors(screenCoords, mLastPointerDown.pos).length() < 10) {
            onDoubleDown(screenCoords);
            return;
        }
        mLastPointerDown.time = Date.now();
        mLastPointerDown.pos = screenCoords;

        let nonfrozenTargets = mHovered.filter(h => !mFreeze.find(f => f.getId() == h.getId()));

        if (nonfrozenTargets.length > 0) {
            let target = getClosestTarget(nonfrozenTargets, screenCoords);
            let rootTarget = target.getRoot();
            if (mFreezeRoots.find(f => f.getId() == rootTarget.getId())) {
                let freezeTarget = mFreeze.find(f => f.getRoot().getId() == rootTarget.getId());

                let { mesh, iks, affectedTargets, controlBone } = GLTKUtil.createIK(freezeTarget, target);
                mIKSolver = new CCDIKSolver(mesh, iks);
                mCCDIKHelper = new CCDIKHelper(mesh, iks, 0.01);
                mSceneController.getContent().add(mCCDIKHelper);

                let intersection = target.getIntersection();
                let rootBone = rootTarget.getObject3D();
                mInteraction = {
                    type: DRAGGING_KINEMATIC,
                    controlBone,
                    rootBone,
                    affectedTargets,
                    start: screenCoords,
                    distance: intersection.distance,
                }
            } else {
                let intersection = target.getIntersection();
                let rootTarget = target.getRoot();
                let targetToPos = new THREE.Vector3().subVectors(rootTarget.getWorldPosition(), intersection.point)

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

    function onDoubleDown(screenCoords) {
        if (mHovered.length > 0) {
            let target = getClosestTarget(mHovered, screenCoords);
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

    async function pointerMove(screenCoords) {
        mLastPointerPosition = screenCoords;
        let pointer = screenToNomralizedCoords(screenCoords);

        mIKSolver?.update();
        if (!mRendering) return;
        if (!mInteraction) {
            mRaycaster.setFromCamera(pointer, mPageCamera);

            let targets = mSceneController.getTargets(mRaycaster);
            let closest = getClosestTarget(targets, screenCoords);
            targets = closest ? [closest] : [];
            if (targets.map(i => i.getId()).sort().join() != mHovered.map(i => i.getId()).sort().join()) {
                mHovered = targets;
                updateHighlight();
            }

            if (mHovered.length == 0) {
                mOrbitControls.enabled = true;
            } else {
                mOrbitControls.enabled = false;
            }
        } else if (mInteraction.type == DRAGGING) {
            mRaycaster.setFromCamera(pointer, mPageCamera);
            let position = mRaycaster.ray.at(mInteraction.distance, new THREE.Vector3());
            position.add(mInteraction.targetToPos)
            mInteraction.target.setWorldPosition(position);
        } else if (mInteraction.type == DRAGGING_KINEMATIC) {
            mRaycaster.setFromCamera(pointer, mPageCamera);
            let position = mRaycaster.ray.at(mInteraction.distance, new THREE.Vector3());
            let localPosition = mInteraction.rootBone.worldToLocal(position);
            mInteraction.controlBone.position.copy(localPosition);
        }
    }

    async function pointerUp(screenCoords) {
        mIKSolver = null
        mSceneController.getContent().remove(mCCDIKHelper);
        let interaction = mInteraction;
        mInteraction = false;
        if (interaction) {
            if (interaction.type == DRAGGING) {
                if (Array.isArray(interaction.target.getId())) {
                    await mTransformManyCallback(interaction.target.getPointPositions());
                } else {
                    let localPos = interaction.target.getLocalPosition();
                    await mTransformCallback(interaction.target.getId(), localPos);
                }
            } else if (interaction.type == DRAGGING_KINEMATIC) {
                await mTransformManyCallback(interaction.affectedTargets.map(t => {
                    return {
                        id: t.getId(),
                        position: t.getLocalPosition(),
                        orientation: t.getLocalOrientation(),
                    }
                }))
            }
        }
    }

    function startRendering() {
        mPageRenderer.setAnimationLoop(pageRender);
        mRendering = true;
    }

    function stopRendering() {
        mPageRenderer.setAnimationLoop(null);
        mRendering = false;
    }


    function getClosestTarget(targets, screenCoords) {
        if (targets.length == 0) return null;
        if (targets.length == 1) return targets[0];

        let pointer = screenToNomralizedCoords(screenCoords);
        mRaycaster.setFromCamera(pointer, mPageCamera);

        let sortation = targets.map(t => {
            return { t, distance: mRaycaster.ray.distanceToPoint(t.getIntersection().point) }
        })

        sortation.sort((a, b) => a.distance - b.distance)
        return sortation[0].t;
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

    function setUserPositionAndDirection(worldPosition, unitDirection) {
        mPageCamera.position.subVectors(worldPosition, unitDirection);
        mOrbitControls.target.copy(worldPosition);
        mOrbitControls.update()
    }

    function getUserPositionAndDirection() {
        let pos = new THREE.Vector3();
        let dir = new THREE.Vector3();

        mPageCamera.getWorldDirection(dir);
        mPageCamera.getWorldPosition(pos);

        return { pos, dir };
    }

    this.resize = resize;

    this.pointerMove = pointerMove;
    this.pointerUp = pointerUp;
    this.startRendering = startRendering;
    this.stopRendering = stopRendering;
    this.setUserPositionAndDirection = setUserPositionAndDirection;
    this.getUserPositionAndDirection = getUserPositionAndDirection;

    this.setSceneController = (sceneContoller) => { mSceneController = sceneContoller }
    this.onTransform = (func) => { mTransformCallback = func }
    this.onTransformMany = (func) => { mTransformManyCallback = func }
}