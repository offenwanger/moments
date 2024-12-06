import * as THREE from 'three';
import { CCDIKHelper, CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DOUBLE_CLICK_SPEED, ItemButtons, MenuNavButtons, ToolButtons, USER_HEIGHT } from '../../constants.js';
import { GLTKUtil } from '../../utils/gltk_util.js';

export function CanvasViewController(parentContainer, mWebsocketController) {
    const DRAGGING = 'dragging'
    const DRAGGING_KINEMATIC = 'draggingKinematic'
    const NAVIGATING = 'navigating'
    const BUTTON_CLICK = 'click'

    let mTransformCallback = async () => { }
    let mTransformManyCallback = async () => { }

    let mWidth = 10;
    let mHeight = 10;

    let mSceneController;
    let mMenuController;
    let mRendering = false;

    let mToolMode = MenuNavButtons.MOVE;
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

    let mMainCanvas = document.createElement('canvas');
    mMainCanvas.setAttribute('id', 'main-canvas')
    mMainCanvas.style['display'] = 'block';
    mMainCanvas.addEventListener('pointerdown', (e) => onPointerDown({ x: e.clientX, y: e.clientY }))
    mMainCanvas.addEventListener('wheel', (e) => onWheel({ x: e.clientX, y: e.clientY, amount: e.wheelDelta }))
    parentContainer.appendChild(mMainCanvas)

    let mInterfaceCanvas = document.createElement('canvas');
    mInterfaceCanvas.setAttribute('id', 'interface-canvas')
    mInterfaceCanvas.style['display'] = 'none';
    mInterfaceCanvas.style['position'] = 'absolute';
    mInterfaceCanvas.style['top'] = '0';
    mInterfaceCanvas.style['left'] = '0';
    mInterfaceCanvas.addEventListener('pointerdown', (e) => onPointerDown({ x: e.clientX, y: e.clientY }))
    parentContainer.appendChild(mInterfaceCanvas)

    let mPageRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: mMainCanvas });

    const MENU_DIST = 0.3;

    const fov = 75, aspect = 2, near = 0.1, far = 200;
    const mPageCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    mPageCamera.position.set(0, USER_HEIGHT, 0);

    const mMenuContainer = new THREE.Group();
    const mMenuHelper = new THREE.Mesh(new THREE.BoxGeometry(0.0001, 0.0001, 0.0001));
    mPageCamera.add(mMenuHelper);

    const mOrbitControls = new OrbitControls(mPageCamera, mPageRenderer.domElement);
    mOrbitControls.enableKeys = true;
    mOrbitControls.minDistance = 1;
    mOrbitControls.maxDistance = 1;
    mOrbitControls.enableZoom = false;
    mOrbitControls.target.set(0, 2, -2);
    mOrbitControls.update();
    mOrbitControls.addEventListener('change', () => {
        if (!mSceneController) return;
        mPageCamera.updateMatrixWorld()

        mSceneController.userMove(mPageCamera.position);
        mWebsocketController.updateParticipant({
            x: mPageCamera.position.x,
            y: mPageCamera.position.y,
            z: mPageCamera.position.z,
            orientation: mPageCamera.quaternion.toArray()
        })

        mRaycaster.setFromCamera(canvasToNomralizedCoords({ x: 0, y: 0 }), mPageCamera)
        let result = mRaycaster.ray.at(MENU_DIST, new THREE.Vector3());
        mMenuContainer.position.copy(result);
        mMenuHelper.getWorldQuaternion(mMenuContainer.quaternion);
    })

    function pageRender(time) {
        if (time < 0) return;
        if (!mSceneController) return;
        mPageRenderer.render(mSceneController.getScene(), mPageCamera);
        mMenuController?.render();
    }

    function resize(width, height) {
        mWidth = width;
        mHeight = height;

        if (!mPageRenderer) return;
        mPageRenderer.setSize(width, height, false);

        mInterfaceCanvas.setAttribute('width', width);
        mInterfaceCanvas.setAttribute('height', height);

        mPageCamera.aspect = width / height;
        mPageCamera.updateProjectionMatrix();

        mRaycaster.setFromCamera(canvasToNomralizedCoords({ x: 0, y: 0 }), mPageCamera)
        let p1 = mRaycaster.ray.at(MENU_DIST, new THREE.Vector3());
        mRaycaster.setFromCamera(canvasToNomralizedCoords({ x: 300, y: 0 }), mPageCamera)
        let p2 = mRaycaster.ray.at(MENU_DIST, new THREE.Vector3());
        let menuWidth = p1.distanceTo(p2);
        let scale = menuWidth / mMenuController.getWidth();
        mMenuContainer.scale.set(scale, scale, scale)
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

        if (mHovered[0]?.isButton()) {
            mHovered[0].select();

            let buttonId = mHovered[0].getId();
            if (Object.values(ToolButtons).includes(buttonId)) {
                if (mToolMode == buttonId && buttonId != ToolButtons.MOVE) {
                    buttonId = ToolButtons.MOVE;
                }
                mToolMode = buttonId;
                mMenuController.setMode(mToolMode);
            } else if (Object.values(MenuNavButtons).includes(buttonId)) {
                mMenuController.navigate(buttonId);
            } else if (Object.values(ItemButtons).includes(buttonId)) {
                console.error("Impliment me!")
            } else {
                console.error('Invalid button id: ' + buttonId);
            }

            mInteraction = {
                type: BUTTON_CLICK,
                target: mHovered[0]
            }
        } else {

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
            updateHighlight();
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

            let targets = mMenuController.getTargets(mRaycaster);
            if (targets.length == 0) targets = mSceneController.getTargets(mRaycaster);
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
            } else if (interaction.type == BUTTON_CLICK) {
                interaction.target.idle();
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
        mHighlight.forEach(item => item.idle());
        mHighlight = mHovered.concat(mFreeze);
        if (mHold) mHighlight.push(mHold.target);
        // some basic validation.
        mHighlight = mHighlight.filter(item => {
            if (!item || typeof item.idle != "function" || typeof item.highlight != "function") {
                return false;
            }
            return true;
        });
        mHighlight.forEach(item => item.highlight())
    }

    function screenToNomralizedCoords(screenCoords) {
        let bb = mMainCanvas.getBoundingClientRect();
        return canvasToNomralizedCoords({
            x: screenCoords.x - bb.x,
            y: screenCoords.y - bb.y
        })
    }

    function canvasToNomralizedCoords(canvasCoords) {
        let bb = mMainCanvas.getBoundingClientRect();
        let x = (canvasCoords.x / bb.width) * 2 - 1;
        let y = - (canvasCoords.y / bb.height) * 2 + 1;
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

    function setSceneController(sceneContoller) {
        mSceneController = sceneContoller;
        mSceneController.getScene().add(mMenuContainer)
    }

    function setMenuController(controller) {
        mMenuController = controller;
        mMenuController.setContainer(mMenuContainer);
        mMenuController.setMode(mToolMode);
    }

    this.resize = resize;

    this.pointerMove = pointerMove;
    this.pointerUp = pointerUp;
    this.startRendering = startRendering;
    this.stopRendering = stopRendering;
    this.setUserPositionAndDirection = setUserPositionAndDirection;
    this.getUserPositionAndDirection = getUserPositionAndDirection;

    this.getMenuContainer = () => mMenuContainer;
    this.setSceneController = setSceneController;
    this.setMenuController = setMenuController;
    this.onTransform = (func) => { mTransformCallback = func }
    this.onTransformMany = (func) => { mTransformManyCallback = func }
}