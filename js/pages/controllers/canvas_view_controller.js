import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { USER_HEIGHT } from '../../constants.js';

export function CanvasViewController(parentContainer) {

    let mWidth = 10;
    let mHeight = 10;

    let mSceneController;
    let mRendering = false;

    let mMainCanvas = parentContainer.append('canvas')
        .attr('id', 'main-canvas')
        .style('display', 'block')

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

    function onResize(width, height) {
        mWidth = width;
        mHeight = height;

        if (!mPageRenderer) return;
        mPageRenderer.setSize(width, height, false);

        mPageCamera.aspect = width / height;
        mPageCamera.updateProjectionMatrix();
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredItems = []

    function onPointerMove(screenCoords) {
        if (!mRendering) return;
        let bb = mMainCanvas.node().getBoundingClientRect();
        pointer.x = ((screenCoords.x - bb.x) / bb.width) * 2 - 1;
        pointer.y = - ((screenCoords.y - bb.y) / bb.height) * 2 + 1;

        // update the picking ray with the camera and pointer position
        raycaster.setFromCamera(pointer, mPageCamera);

        let intersections = mSceneController.getIntersections(raycaster);
        if (intersections.map(i => i.getId()).sort().join() != hoveredItems.map(i => i.getId()).sort().join()) {
            hoveredItems.forEach(item => item.unhighlight());
            hoveredItems = intersections;
            hoveredItems.forEach(item => item.highlight())
        }
    }

    this.onResize = onResize;

    this.startRendering = () => { mPageRenderer.setAnimationLoop(pageRender); mRendering = true; }
    this.stopRendering = () => { mPageRenderer.setAnimationLoop(null); mRendering = false; }
    this.setScene = (scene) => { mSceneController = scene }
    this.onPointerMove = onPointerMove;
}