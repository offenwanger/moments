import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Util } from './utility.js';

const UP = new THREE.Vector3(0, 1, 0);
const BLUR_MAX = 0.1;
const BLUR_MIN = 0;
const BLUR_SPEED = 0.0;

const gCanvas = document.createElement('canvas');
gCanvas.width = 1024;
gCanvas.height = 512;

const gRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: gCanvas });
gRenderer.setSize(1024, 512, false);

export function Moment(parentScene) {
    // computed values
    this.tDist = Infinity;

    // exposed variable
    let mPosition = new THREE.Vector3();

    // internal values
    let mFocalPoint = new THREE.Vector3(-15, 2, 1.5);
    let mFocalDist = 10;

    // external values
    let mOrientation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
    let mSize = 1;
    let mT = 0;
    let mOffset = { x: 0, y: 0 };

    let mCaptions = [];

    let mBlur = false;

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
        new THREE.Mesh(new THREE.CircleGeometry(1, 32, 0, 2 * Math.PI), mMaterials[0]),
        new THREE.Mesh(new THREE.CircleGeometry(1, 32, 0, 2 * Math.PI), mMaterials[1])
    ];
    mLenses.forEach((lens, i) => {
        lens.position.copy(mPosition);
        lens.layers.set(i + 1);
        parentScene.add(lens)
    })

    const mSphere = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 15),
        new THREE.MeshPhysicalMaterial({
            color: 'white',
            metalness: 0.0,
            transmission: 1,
            reflectivity: 0.42,
            ior: 1.44,
            thickness: 0.3,
            roughness: 0.08,
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

    function update(userOffset) {
        // face lenses at camera
        mLenses.forEach(lens => {
            let rotationMatrix = new THREE.Matrix4().lookAt(userOffset, lens.position, UP);
            let qt = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
            lens.quaternion.copy(qt);
        })

        mCaptions.forEach(caption =>
            caption.update(mPosition,
                mSize,
                userOffset,
                localCoordsToSphereSurface(caption.getRoot(), userOffset)))
    }

    let mLastTime;
    function animate(time) {
        if (!mLastTime) mLastTime = time;
        let delta = time - mLastTime;

        if (mBlur && mSphere.material.roughness < BLUR_MAX) {
            mSphere.material.roughness = Math.min(mSphere.material.roughness + delta * BLUR_SPEED, BLUR_MAX);
        } else if (!mBlur && mSphere.material.roughness > BLUR_MIN) {
            mSphere.material.roughness = Math.max(mSphere.material.roughness - delta * BLUR_SPEED, BLUR_MIN);
        }

        mLastTime = time;
    }

    function render(cameras) {
        if (!mSceneModel) return;

        // rendering VR vs viewer
        if (cameras.length == 1) {
            mLenses[0].layers.set(0)
        } else if (cameras.length == 2) {
            mLenses[0].layers.set(1)
        }

        // Position camera
        cameras.forEach((camera, index) => {
            let rotationMatrix = new THREE.Matrix4().lookAt(camera.position, mPosition, UP);
            let qt = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
            qt = mOrientation.clone().invert().multiply(qt);
            mCameras[index].quaternion.copy(qt);
            let position = new THREE.Vector3(0, 0, mFocalDist).applyQuaternion(qt).add(mFocalPoint);
            mCameras[index].position.copy(position);
        })

        gRenderer.clear();

        gRenderer.setViewport(0, 0, 512, 512);
        gRenderer.render(mScene, mCameras[0]);
        mContexts[0].drawImage(gCanvas, 0, 0, 512, 512, 0, 0, 512, 512);
        mMaterials[0].map.needsUpdate = true;

        gRenderer.setViewport(512, 0, 512, 512);
        gRenderer.render(mScene, mCameras[1]);
        mContexts[1].drawImage(gCanvas, 512, 0, 512, 512, 0, 0, 512, 512);
        mMaterials[1].map.needsUpdate = true;
    }

    function setPosition(position) {
        mLenses.forEach(plane => {
            plane.position.copy(position);
        })
        mSphere.position.copy(position);
        mPosition = position;
    }

    function getPosition() {
        return mPosition.clone();
    }

    function setEnvBox(envBox) {
        mSphere.material.envMap = envBox;
    }

    function setSize(size) {
        mSphere.scale.setScalar(size);
        mLenses.forEach(lens => lens.scale.setScalar(size));
        mSize = size;
    }

    function getSize() {
        return mSize;
    }

    function addCaption(caption, index = null) {
        if (index) {
            mCaptions.splice(index, 0, caption);
        } else {
            mCaptions.push(caption);
        }
    }

    function localCoordToWorldCoords(localCoord) {
        let coord = localCoord.clone();
        coord.sub(mFocalPoint);
        coord.multiplyScalar(1 / mFocalDist);
        coord.applyQuaternion(mOrientation)
        coord.multiplyScalar(mSize);
        coord.add(mPosition);
        return coord;
    }

    function localCoordsToSphereSurface(localcoords, cameraPosition) {
        let worldCoords = localCoordToWorldCoords(localcoords);
        let intersection = Util.getSphereIntersection(cameraPosition, worldCoords, mPosition, mSize);
        if (!intersection || cameraPosition.distanceTo(worldCoords) < cameraPosition.distanceTo(intersection)) {
            let normal = new THREE.Vector3().subVectors(cameraPosition, mPosition).normalize();
            let planeCoords = worldCoords.sub(cameraPosition).projectOnPlane(normal);
            let circleCoord = planeCoords.normalize().multiplyScalar(mSize).add(mPosition);
            return circleCoord;
        } else {
            return intersection;
        }
    }

    this.update = update;
    this.animate = animate;
    this.render = render;
    this.setPosition = setPosition;
    this.getPosition = getPosition;
    this.setOrientation = (o) => { mOrientation.copy(o) };
    this.getOrientation = () => { return new THREE.Quaternion().copy(mOrientation) };
    this.setT = (t) => { mT = t; };
    this.getT = () => { return mT };
    this.setOffset = (o) => { mOffset = o; };
    this.getOffset = () => { return { x: mOffset.x, y: mOffset.y } };
    this.addCaption = addCaption;
    this.setEnvBox = setEnvBox;
    this.setSize = setSize;
    this.getSize = getSize;
    this.setBlur = (blur) => mBlur = blur;
}