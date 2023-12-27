import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Moment } from './moment.js';
import { Util } from './utility.js';
import { Caption } from './caption.js';
import { HighlightRing } from './highlight_ring.js';

const INTERACTION_DISTANCE = 10;

function main() {
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.xr.enabled = true;
    document.body.appendChild(VRButton.createButton(renderer));

    const fov = 75;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 200;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 1.6, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 2;
    controls.maxDistance = 5;
    controls.target.set(0, 2, -2);
    camera.position.set(0, 3, 0);
    controls.update();

    const scene = new THREE.Scene();
    let cubeLoader = new THREE.CubeTextureLoader();
    cubeLoader.setPath('assets/envbox/');
    let envBox = cubeLoader.load([
        'px.jpg', 'nx.jpg',
        'py.jpg', 'ny.jpg',
        'pz.jpg', 'nz.jpg'
    ]);
    scene.background = envBox;

    let mMoments = [];
    let testCount = 16;
    for (let i = 0; i < testCount; i++) {
        let m = new Moment(scene);
        m.setEnvBox(envBox);

        m.setPosition(new THREE.Vector3(
            Math.sin(Math.PI * 3 * i / testCount) * 2 + i / 4,
            Math.cos(Math.PI * 3 * i / testCount) * 2 + i / 4,
            Math.cos(Math.PI * 3 * i / testCount) * -2 + i / 4))
        m.setSize(0.5 + (i % 4) / 8)
        m.setOrientation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * (i % 8) / 8))

        mMoments.push(m)
    }

    let mHighlightRing = new HighlightRing(scene);

    [{ offset: { x: 1, y: 1 }, moment: 0, root: new THREE.Vector3(-15.1, 7, -0.5), text: 'Things are less significant if I am talking. Unfourtunatly, I do need to say things in order to test the speech bubbles.' },
    { offset: { x: 0.75, y: 1.5 }, moment: 2, root: new THREE.Vector3(-15.1, 2.2, 1.2), text: 'There are sometimes things to say.' },
    { offset: { x: -0.25, y: 1.25 }, moment: 2, root: new THREE.Vector3(0, 0, 2), text: 'and they must be readable', },
    ].forEach(c => {
        let caption = new Caption(scene);
        caption.setText(c.text);
        caption.setOffset(c.offset);
        caption.setRoot(c.root);
        mMoments[c.moment].addCaption(caption);
    })

    const color = 0xFFFFFF;
    const intensity = 3;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(- 1, 2, 4);
    scene.add(light);

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }

        return needResize;
    }

    function render(time) {
        time *= 0.001;

        if (renderer.xr.isPresenting) {
            controls.enabled = false;
        } else {
            controls.enabled = true;
        }

        let clock = new THREE.Clock();
        clock.start();

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        let cameras = renderer.xr.getCamera().cameras;
        if (cameras.length == 0) cameras = [camera];

        let sortedMoments = mMoments.map(m => { return { dist: camera.position.distanceTo(m.getPosition()), m } })
            .sort((a, b) => a - b).map(o => o.m);

        let interactionTarget = false;
        // TODO, complete the full initial render pass.
        for (let i = 0; i < sortedMoments.length; i++) {
            if (clock.getElapsedTime() > 0.015) { break; }

            if (!interactionTarget && isTargeted(sortedMoments[i])) {
                interactionTarget = true;
                mHighlightRing.setPosition(sortedMoments[i].getPosition()
                    .add(new THREE.Vector3(0, -sortedMoments[i].getSize(), 0)))
                mHighlightRing.show();
            }

            sortedMoments[i].update(cameras);
        }
        if (!interactionTarget) mHighlightRing.hide();

        // chop the animation time out of rendering, should be cheap
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

        renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(render);

    function isTargeted(moment) {
        if (moment.getPosition().distanceTo(camera.position) > INTERACTION_DISTANCE) return false;
        return Util.hasSphereIntersection(camera.position, new THREE.Vector3(0, 0, - 1).applyQuaternion(camera.quaternion).add(camera.position),
            moment.getPosition(), moment.getSize())
    }

}

main();