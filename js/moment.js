import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const UP = new THREE.Vector3(0, 1, 0);
const BLUR_MAX = 0.1;
const BLUR_MIN = 0;

const gCanvases = [document.createElement('canvas'), document.createElement('canvas')];
gCanvases.forEach(canvas => {
    canvas.width = 512;
    canvas.height = 512;
})
const gRenderers = [
    new THREE.WebGLRenderer({ antialias: true, canvas: gCanvases[0] }),
    new THREE.WebGLRenderer({ antialias: true, canvas: gCanvases[1] })
]
gRenderers.forEach(renderer => renderer.setSize(512, 512, false))

export function Moment(parentScene) {
    let mFocalPoint = new THREE.Vector3(-15, 2, 1.5);
    let mFocalDist = 10;

    let mOrientation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
    let mPosition = new THREE.Vector3();

    let mCaption = "There is a man sitting under a tree"
    let mSpeech = 'Things are less significant if I am talking.'
    let mSoundEffect = 'Whoosh!'

    const fov = 75;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 200;

    const mScene = new THREE.Scene();
    mScene.fog = new THREE.Fog(0xcccccc, 0.1, 1000)

    const mCanvases = [document.createElement('canvas'), document.createElement('canvas')];
    mCanvases.forEach(canvas => {
        canvas.width = 512;
        canvas.height = 512;
    });

    const mContexts = mCanvases.map(c => c.getContext('2d'));
    const mMaterials = [new THREE.MeshBasicMaterial(), new THREE.MeshBasicMaterial()];
    mMaterials.forEach((m, index) => {
        m.map = new THREE.CanvasTexture(mCanvases[index]);
    })
    const mCameras = [
        new THREE.PerspectiveCamera(fov, aspect, near, far),
        new THREE.PerspectiveCamera(fov, aspect, near, far),
    ]
    mCameras.forEach(camera => camera.position.set(0, 1.6, 0))

    const mLenses = [
        new THREE.Mesh(new THREE.CircleGeometry(0.5, 32, 0, 2 * Math.PI), mMaterials[0]),
        new THREE.Mesh(new THREE.CircleGeometry(0.5, 32, 0, 2 * Math.PI), mMaterials[1])
    ];
    mLenses.forEach((lens, i) => {
        lens.position.copy(mPosition);
        lens.layers.set(i + 1);
        parentScene.add(lens)
    })

    let cubeLoader = new THREE.CubeTextureLoader();
    cubeLoader.setPath('assets/envbox/');
    let envBox = cubeLoader.load([
        'px.jpg', 'nx.jpg',
        'py.jpg', 'ny.jpg',
        'pz.jpg', 'nz.jpg'
    ]);

    const mSphere = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.5, 15),
        new THREE.MeshPhysicalMaterial({
            roughness: 0,
            metalness: 0,
            transmission: 1,
            thickness: 0.5,
            roughness: BLUR_MAX,
            envMap: envBox
        })
    )
    mSphere.position.copy(mPosition);
    parentScene.add(mSphere);

    const imageLoader = new THREE.ImageLoader();
    imageLoader.load(
        'assets/scenes/test_scene.png',
        function (image) {
            mContexts.forEach(ctx => ctx.drawImage(image, 0, 0));
            mMaterials.forEach(m => m.map.needsUpdate = true);
        }, null,
        function (error) {
            console.error('An error happened.', error);
        }
    );

    let mSceneModel;
    const modelLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('../module/three/examples/jsm/libs/draco/');
    modelLoader.setDRACOLoader(dracoLoader);
    modelLoader.load('assets/scenes/test_scene.glb',
        function (gltf) {
            mSceneModel = gltf.scene;
            mScene.add(gltf.scene);
        },
        // called while loading is progressing
        function (xhr) {
            (console).log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // called when loading has errors
        function (error) {
            console.error('An error happened', error);
        }
    );

    function updateLenses(cameras) {
        // rendering VR vs viewer
        if (cameras.length == 1) {
            mLenses[0].layers.set(0)
        } else if (cameras.length == 2) {
            mLenses[0].layers.set(1)
        }

        // face lenses at camera
        mLenses.forEach(lens => {
            let rotationMatrix = new THREE.Matrix4().lookAt(cameras[0].position, lens.position, UP);
            let qt = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
            lens.quaternion.copy(qt);
        })
    }

    function render(delta, cameras) {
        if (!mSceneModel) return;
        decrementBlur(delta);

        // Position camera
        cameras.forEach((camera, index) => {
            let rotationMatrix = new THREE.Matrix4().lookAt(camera.position, mPosition, UP);
            let qt = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
            qt = new THREE.Quaternion().copy(mOrientation).invert().multiply(qt);
            mCameras[index].quaternion.copy(qt);
            let position = new THREE.Vector3(0, 0, mFocalDist).applyQuaternion(qt).add(mFocalPoint);
            mCameras[index].position.copy(position);
        })

        // TODO: Think about performance
        // Either we should prebake a bunch of images
        // but also every render pass we can render from near to far until we run out of time. 

        // render
        gRenderers.forEach((renderer, index) => {
            renderer.render(mScene, mCameras[index]);
            mContexts[index].drawImage(gCanvases[index], 0, 0);
            mMaterials[index].map.needsUpdate = true;
        })
    }

    function setPosition(position) {
        mLenses.forEach(plane => {
            plane.position.copy(position);
        })
        mSphere.position.copy(position);
        mPosition = position;
    }

    function getPosition() {
        return mPosition;
    }


    const BLUR_SPEED = 0.1;
    function incrementBlur(delta) {
        if (mSphere.material.roughness < BLUR_MAX) {
            mSphere.material.roughness += delta * BLUR_SPEED;
        }
    }

    function decrementBlur(delta) {
        if (mSphere.material.roughness > BLUR_MIN) {
            mSphere.material.roughness -= delta * BLUR_SPEED;
        }
    }

    this.updateLenses = updateLenses;
    this.render = render;
    this.setPosition = setPosition;
    this.getPosition = getPosition;
    this.setOrientation = (o) => { mOrientation.copy(o) };
    this.getOrientation = () => { return new THREE.Quaternion().copy(mOrientation) };
    this.incrementBlur = incrementBlur;
    this.decrementBlur = decrementBlur;
}