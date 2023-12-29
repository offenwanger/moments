import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Moment } from './moment.js';
import { Util } from './utility.js';
import { Caption } from './caption.js';
import { HighlightRing } from './highlight_ring.js';

const INTERACTION_DISTANCE = 10;

function main() {
    const mRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.querySelector('#c') });
    mRenderer.xr.enabled = true;
    document.body.appendChild(VRButton.createButton(mRenderer));

    const fov = 75;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 200;

    const mCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    mCamera.position.set(0, 1.6, 0);

    const controls = new OrbitControls(mCamera, mRenderer.domElement);
    controls.minDistance = 2;
    controls.maxDistance = 5;
    controls.target.set(0, 2, -2);
    mCamera.position.set(0, 3, 0);
    controls.update();

    const mEnvironmentBox = getEnvBox();

    const mScene = new THREE.Scene();
    mScene.background = mEnvironmentBox;

    const mMoments = getMoments();
    const mHighlightRing = new HighlightRing(mScene);

    const light = new THREE.DirectionalLight(0xFFFFFF, 3);
    light.position.set(- 1, 2, 4);
    mScene.add(light);

    function render(time) {
        time *= 0.001;
        let clock = new THREE.Clock();
        clock.start();

        if (resizeRendererToDisplaySize(mRenderer)) {
            const canvas = mRenderer.domElement;
            mCamera.aspect = canvas.clientWidth / canvas.clientHeight;
            mCamera.updateProjectionMatrix();
        }

        let cameras;
        if (mRenderer.xr.isPresenting) {
            controls.enabled = false;
            cameras = mRenderer.xr.getCamera().cameras;
        } else {
            controls.enabled = true;
            cameras = [mCamera]
        }

        let interactionTargetIndex = -1;

        let sortedMoments = mMoments.map(m => { return { dist: mCamera.position.distanceTo(m.getPosition()), m } })
            .sort((a, b) => a - b).map(o => o.m);
        for (let i = 0; i < sortedMoments.length; i++) {
            if (clock.getElapsedTime() > 0.015) { break; }

            if (interactionTargetIndex == false && isTargeted(sortedMoments[i])) {
                interactionTargetIndex = i;
            }
            sortedMoments[i].update(cameras);
        }

        if (interactionTargetIndex >= 0) {
            let moment = sortedMoments.splice(interactionTargetIndex, 1)[0];
            sortedMoments.unshift(moment);

            mHighlightRing.setPosition(moment.getPosition()
                .add(new THREE.Vector3(0, -moment.getSize(), 0)))
            mHighlightRing.show();
        } else {
            mHighlightRing.hide();
        }

        // chop the animation time out of rendering, it should be cheap
        sortedMoments.forEach(moment => {
            moment.animate(time);
        })

        for (let i = 0; i < sortedMoments.length; i++) {
            if (clock.getElapsedTime() < 0.02) {
                sortedMoments[i].setBlur(false);
                sortedMoments[i].render();
            } else {
                // if we've going to drop below 60fps, stop rendering
                sortedMoments[i].setBlur(true);
            }
        }

        mMoments[0].setOrientation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), time));
        mHighlightRing.animate(time);

        mRenderer.render(mScene, mCamera);
    }

    mRenderer.setAnimationLoop(render);

    function isTargeted(moment) {
        if (moment.getPosition().distanceTo(mCamera.position) > INTERACTION_DISTANCE) return false;
        return Util.hasSphereIntersection(mCamera.position, new THREE.Vector3(0, 0, - 1).applyQuaternion(mCamera.quaternion).add(mCamera.position),
            moment.getPosition(), moment.getSize())
    }

    function resizeRendererToDisplaySize(mRenderer) {
        const canvas = mRenderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            mRenderer.setSize(width, height, false);
        }

        return needResize;
    }

    function getEnvBox() {
        let cubeLoader = new THREE.CubeTextureLoader();
        cubeLoader.setPath('assets/envbox/');
        return cubeLoader.load([
            'px.jpg', 'nx.jpg',
            'py.jpg', 'ny.jpg',
            'pz.jpg', 'nz.jpg'
        ]);
    }

    function getMoments() {
        let result = [];

        let testCount = 16;
        for (let i = 0; i < testCount; i++) {
            let m = new Moment(mScene);
            m.setEnvBox(mEnvironmentBox);

            m.setPosition(new THREE.Vector3(
                Math.sin(Math.PI * 3 * i / testCount) * 2 + i / 4,
                Math.cos(Math.PI * 3 * i / testCount) * 2 + i / 4,
                Math.cos(Math.PI * 3 * i / testCount) * -2 + i / 4))
            m.setSize(0.5 + (i % 4) / 8)
            m.setOrientation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * (i % 8) / 8))

            result.push(m)
        }

        [{ offset: { x: 1, y: 1 }, moment: 0, root: new THREE.Vector3(-15.1, 7, -0.5), text: 'Things are less significant if I am talking. Unfourtunatly, I do need to say things in order to test the speech bubbles.' },
        { offset: { x: 0.75, y: 1.5 }, moment: 2, root: new THREE.Vector3(-15.1, 2.2, 1.2), text: 'There are sometimes things to say.' },
        { offset: { x: -0.25, y: 1.25 }, moment: 2, root: new THREE.Vector3(0, 0, 2), text: 'and they must be readable', },
        { offset: { x: 1.5, y: 0 }, moment: 3, root: new THREE.Vector3(0, 0, 2), text: 'And they could go anywhere', },
        { offset: { x: 0, y: -1.5 }, moment: 4, root: new THREE.Vector3(0, 0, 2), text: 'Anywhere at all', },
        ].forEach(c => {
            let caption = new Caption(mScene);
            caption.setText(c.text);
            caption.setOffset(c.offset);
            caption.setRoot(c.root);
            result[c.moment].addCaption(caption);
        })

        return result;
    }

}

main();