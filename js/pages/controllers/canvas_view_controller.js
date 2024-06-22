import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DOUBLE_CLICK_SPEED, USER_HEIGHT } from '../../constants.js';

export function CanvasViewController(parentContainer) {
    const DRAGGING = 'dragging'
    const NAVIGATING = 'navigating'

    let mMoveCallback = async () => { }

    let mWidth = 10;
    let mHeight = 10;

    let mSceneController;
    let mRendering = false;

    let mInteraction = false;
    let mHovered = []
    let mFreeze = []
    let mHighlight = [];
    let mHold = null;
    let mLastPointerDown = { time: 0, pos: { x: 0, y: 0 } }
    const mRaycaster = new THREE.Raycaster();

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
            let intersection = target.getIntersection();
            let targetToPos = new THREE.Vector3().subVectors(target.getPosition(), intersection.point)

            mInteraction = {
                type: DRAGGING,
                start: screenCoords,
                target,
                targetToPos,
                distance: intersection.distance,
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
            }
        }
    }

    function pointerMove(screenCoords) {
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
            mInteraction.target.setPosition(position);
        }
    }

    async function pointerUp(screenCoords) {
        let interaction = mInteraction;
        mInteraction = false;
        if (interaction) {
            if (interaction.type == DRAGGING) {
                let pointer = screenToNomralizedCoords(screenCoords);
                mRaycaster.setFromCamera(pointer, mPageCamera);
                let position = mRaycaster.ray.at(interaction.distance, new THREE.Vector3());
                position.add(interaction.targetToPos)
                let localPos = interaction.target.setPosition(position);

                await mMoveCallback(interaction.target.getId(), localPos);
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
}