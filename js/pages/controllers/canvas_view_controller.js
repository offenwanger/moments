import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { USER_HEIGHT } from '../../constants.js';

export function CanvasViewController(parentContainer) {

    let mWidth = 10;
    let mHeight = 10;

    let mSceneController;

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


    this.onResize = onResize;

    this.startRendering = () => { mPageRenderer.setAnimationLoop(pageRender); }
    this.stopRendering = () => { mPageRenderer.setAnimationLoop(null); }
    this.setScene = (scene) => { mSceneController = scene }
}