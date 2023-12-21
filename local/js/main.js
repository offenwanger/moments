import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Moment } from './moment.js';

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

    const scene = new THREE.Scene();

    let mMoments = [];
    for (let i = 0; i < 3; i++) {
        let m = new Moment(scene);
        m.setPosition(new THREE.Vector3(
            Math.sin(Math.PI * 2 * i / 8) * 2,
            Math.sin(Math.PI * 2 * i / 8) * 2,
            Math.cos(Math.PI * 2 * i / 8) * -2))
        mMoments.push(m)
    }

    const color = 0xFFFFFF;
    const intensity = 3;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(- 1, 2, 4);
    scene.add(light);

    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    cube.position.copy(new THREE.Vector3(2, 1.6, -2));
    scene.add(cube);

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

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        let cameras = renderer.xr.getCamera().cameras;
        if (cameras.length == 0) cameras = [camera];
        mMoments.forEach(m => m.render(time, cameras))

        cube.rotation.x = time;
        cube.rotation.y = time;

        renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(render);

}

main();