import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

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
    let centerPoint = new THREE.Vector3(-15, 1.5, 3);
    let cameraStart = new THREE.Vector3(-11, 5, 4);
    let dist = new THREE.Vector3().subVectors(centerPoint, cameraStart).length();
    let defaultDirection = new THREE.Vector3().subVectors(centerPoint, cameraStart).normalize();

    const innerScene = new THREE.Scene();
    const innerRenderers = []
    const innerCameras = []
    let drawingCanvases = [];
    let materials = [];

    drawingCanvases[0] = document.getElementById('drawing-canvas1');
    drawingCanvases[1] = document.getElementById('drawing-canvas2');

    materials[0] = new THREE.MeshBasicMaterial();
    materials[1] = new THREE.MeshBasicMaterial();
    materials.forEach((m, index) => {
        m.map = new THREE.CanvasTexture(drawingCanvases[index]);
        // m.alphaMap = new THREE.TextureLoader().load('textures/circle_mask.png');
        // m.transparent = true;
    })

    innerRenderers[0] = new THREE.WebGLRenderer({ antialias: true, canvas: drawingCanvases[0] });
    innerRenderers[0].setSize(512, 512, false);
    innerCameras[0] = new THREE.PerspectiveCamera(fov, aspect, near, far);
    innerCameras[0].position.set(0, 1.6, 0);

    innerRenderers[1] = new THREE.WebGLRenderer({ antialias: true, canvas: drawingCanvases[1] });
    innerRenderers[1].setSize(512, 512, false);
    innerCameras[1] = new THREE.PerspectiveCamera(fov, aspect, near, far);
    innerCameras[1].position.set(0, 1.6, 0);

    const color = 0xFFFFFF;
    const intensity = 3;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(- 1, 2, 4);
    scene.add(light);
    innerScene.add(light);

    let gltfScene;
    function loadGLTF() {
        // Instantiate a loader
        const loader = new GLTFLoader();

        // Optional: Provide a DRACOLoader instance to decode compressed mesh data
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('../module/three/examples/jsm/libs/draco/');
        loader.setDRACOLoader(dracoLoader);

        // Load a glTF resource
        loader.load(
            // resource URL
            'assets/scenes/test_scene.glb',
            // called when the resource is loaded
            function (gltf) {
                gltfScene = gltf.scene;
                innerScene.add(gltf.scene);

                gltf.animations; // Array<THREE.AnimationClip>
                gltf.scene; // THREE.Group
                gltf.scenes; // Array<THREE.Group>
                gltf.cameras; // Array<THREE.Camera>
                gltf.asset; // Object

            },
            // called while loading is progressing
            function (xhr) {

                console.log((xhr.loaded / xhr.total * 100) + '% loaded');

            },
            // called when loading has errors
            function (error) {

                console.log('An error happened');

            }
        );
    }

    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials[0]);
    cube.position.copy(new THREE.Vector3(2, 1.6, -2));
    scene.add(cube);

    let planes = [];
    planes[0] = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32, 0, 2 * Math.PI), materials[0]);
    planes[0].layers.set(1)
    planes[0].position.copy(new THREE.Vector3(0, 1.6, -2));
    planes[1] = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32, 0, 2 * Math.PI), materials[1]);
    planes[1].layers.set(2)
    planes[1].position.copy(new THREE.Vector3(0, 1.6, -2));
    planes.forEach(plane => scene.add(plane));

    // const hdrEquirect = new RGBELoader().load(
    //     "textures/empty_warehouse_01_2k.hdr",
    //     () => {
    //         hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
    //     }
    // );

    var loader = new THREE.CubeTextureLoader();
    loader.setPath('assets/envbox/');

    var textureCube = loader.load([
        'px.jpg', 'nx.jpg',
        'py.jpg', 'ny.jpg',
        'pz.jpg', 'nz.jpg'
    ]);

    const sphere = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.5, 15),
        new THREE.MeshPhysicalMaterial({
            roughness: 0,
            metalness: 0,
            // color: 0xFFEA00,
            transmission: 1,
            thickness: 0.5,
            envMap: textureCube
        })
    )
    sphere.position.copy(new THREE.Vector3(0, 1.6, -2));
    scene.add(sphere);


    loadGLTF();

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


        // slide
        // planes[0].position.x += 0.01;
        // if (planes[0].position.x > 1) planes[0].position.x = -1;

        // planes[1].position.x += 0.01;
        // if (planes[1].position.x > 1) planes[1].position.x = -1;

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        planes.forEach(plane => {
            let qt = new THREE.Quaternion()
                .setFromRotationMatrix(new THREE.Matrix4().lookAt(
                    camera.position,
                    plane.position,
                    new THREE.Vector3(0, 1, 0)));
            plane.quaternion.copy(qt);
        })

        let cameras = renderer.xr.getCamera().cameras;
        if (cameras.length == 0) {
            cameras = [camera];
            planes[0].layers.set(0)
        } else if (cameras.length == 2) {
            planes[0].layers.set(1)
        }
        cameras.forEach((camera, index) => {
            // defaultDirection in local coords is <0,0,1> in world coords. 
            // we need to get dir in local coods. 
            // camera orientation = toLocalCoords(dir)
            // camera position = orientation*dist + centerpoint;
            let intoBubble = new THREE.Vector3().copy(planes[index].position).sub(camera.position).normalize();
            let qt = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camera.position, planes[index].position, new THREE.Vector3(0, 1, 0)));
            innerCameras[index].quaternion.copy(qt);
            innerCameras[index].position.copy(centerPoint).addScaledVector(intoBubble, -dist);
        })

        cube.rotation.x = time;
        cube.rotation.y = time;


        if (gltfScene) {
            // gltfScene.rotation.y = time;
        }

        innerRenderers.forEach((renderer, index) => {
            renderer.render(innerScene, innerCameras[index]);
            materials[index].map.needsUpdate = true;
        })

        renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(render);

}

main();