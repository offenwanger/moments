import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MENU_WIDTH, MenuNavButtons, USER_HEIGHT } from '../../constants.js';
import { WindowEventManager } from '../../window_event_manager.js';

export function PageSessionController(parentContainer) {
    let mWindowEventManager = new WindowEventManager();

    let mUserMovedCallback = async () => { }
    let mPointerMoveCallback = async () => { }
    let mPointerDownCallback = async () => { }
    let mPointerUpCallback = async () => { }

    let mWidth = 10;
    let mHeight = 10;

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

    let mSceneContainer = new THREE.Group();

    let mMainCanvas = document.createElement('canvas');
    mMainCanvas.setAttribute('id', 'main-canvas')
    mMainCanvas.style['display'] = 'block';
    mMainCanvas.addEventListener('pointerdown', async (e) => await onPointerDown({ x: e.clientX, y: e.clientY }))
    mMainCanvas.addEventListener('wheel', (e) => onWheel({ x: e.clientX, y: e.clientY, amount: e.wheelDelta }))
    parentContainer.appendChild(mMainCanvas)

    let mPageRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: mMainCanvas });

    const MENU_DIST = 0.3;

    const fov = 75, aspect = 2, near = 0.1, far = 200;
    const mPageCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    mPageCamera.position.set(0, USER_HEIGHT, 0);

    const mMenuContainer = new THREE.Group();
    mSceneContainer.add(mMenuContainer);
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
        mPageCamera.updateMatrixWorld()

        mUserMovedCallback({
            x: mPageCamera.position.x,
            y: mPageCamera.position.y,
            z: mPageCamera.position.z,
            orientation: mPageCamera.quaternion.toArray()
        });

        mRaycaster.setFromCamera(canvasToNomralizedCoords({ x: 0, y: 0 }), mPageCamera)
        let result = mRaycaster.ray.at(MENU_DIST, new THREE.Vector3());
        mMenuContainer.position.copy(result);
        mMenuHelper.getWorldQuaternion(mMenuContainer.quaternion);
    })

    function resize(width, height) {
        mWidth = width;
        mHeight = height;

        if (!mPageRenderer) return;
        mPageRenderer.setSize(width, height, false);

        mMainCanvas.setAttribute('width', width);
        mMainCanvas.setAttribute('height', height);

        mPageCamera.aspect = width / height;
        mPageCamera.updateProjectionMatrix();

        mRaycaster.setFromCamera(canvasToNomralizedCoords({ x: 0, y: 0 }), mPageCamera)
        let p1 = mRaycaster.ray.at(MENU_DIST, new THREE.Vector3());
        mRaycaster.setFromCamera(canvasToNomralizedCoords({ x: 300, y: 0 }), mPageCamera)
        let p2 = mRaycaster.ray.at(MENU_DIST, new THREE.Vector3());
        let menuWidth = p1.distanceTo(p2);
        let scale = menuWidth / MENU_WIDTH;
        mMenuContainer.scale.set(scale, scale, scale)
    }

    function onWheel(coords) {
        let dir = new THREE.Vector3()
        mPageCamera.getWorldDirection(dir);
        mOrbitControls.target.addScaledVector(dir, coords.amount / 1000);
        mOrbitControls.update();
    }

    async function onPointerDown(screenCoords) {
        let pointer = screenToNomralizedCoords(screenCoords);
        mRaycaster.setFromCamera(pointer, mPageCamera);
        await mPointerDownCallback(mRaycaster)
    }

    mWindowEventManager.onPointerMove(async (screenCoords) => {
        let pointer = screenToNomralizedCoords(screenCoords);
        mRaycaster.setFromCamera(pointer, mPageCamera);
        await mPointerMoveCallback(mRaycaster)
    });

    mWindowEventManager.onPointerUp(async (screenCoords) => {
        let pointer = screenToNomralizedCoords(screenCoords);
        mRaycaster.setFromCamera(pointer, mPageCamera);
        await mPointerUpCallback(mRaycaster)
    });

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

    this.hovered = (hovered, isPrimary) => { mOrbitControls.enabled = !hovered }
    this.resize = resize;
    this.setUserPositionAndDirection = setUserPositionAndDirection;
    this.getUserPositionAndDirection = getUserPositionAndDirection;
    this.getObject = () => mSceneContainer;
    this.getRenderer = () => mPageRenderer;
    this.render = () => {/* nothing special to do */ }
    this.getCamera = () => mPageCamera;

    this.getMenuContainers = () => [mMenuContainer];
    this.onUserMoved = (func) => { mUserMovedCallback = func }
    this.onPointerMove = (func) => { mPointerMoveCallback = func }
    this.onPointerDown = (func) => { mPointerDownCallback = func }
    this.onPointerUp = (func) => { mPointerUpCallback = func }
    this.onTransformMany = (func) => { mTransformManyCallback = func }
}