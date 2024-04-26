import * as THREE from 'three';
import { UP } from '../../constants.js';
import { DataModel } from '../../data_model.js';
import { Data } from "../../data_structs.js";
import { SceneUtil } from '../../utils/scene_util.js';
import { AnnotationScene } from './annotation_scene.js';
import { Model3DScene } from './model3d_scene.js';
import { FileUtil } from './../../utils/file_util.js'

const gCanvas = document.createElement('canvas');
gCanvas.width = 1024;
gCanvas.height = 512;

const gRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: gCanvas });
gRenderer.setSize(1024, 512, false);

export function MomentScene(parent) {
    let mMomentGroup = new THREE.Group();
    parent.add(mMomentGroup)
    let mEnvironmentBox;

    let mModel = new DataModel();
    let mMoment = new Data.Moment();

    let mModel3DScenes = [];
    let mAnnotationScenes = [];

    let mPosition = new THREE.Vector3();
    let mOrientation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);

    let mFocalPoint = new THREE.Vector3(-15, 2, 1.5);
    let mFocalDist = 10;
    let mSize = 1;
    let mT = 0;
    let mOffset = { x: 0, y: 0 };
    let mCaptions = [];

    const fov = 75;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 200;

    const mMomentScene = new THREE.Scene();
    mMomentScene.fog = new THREE.Fog(0xcccccc, 0.1, 1000)

    const mCanvases = [document.createElement('canvas'), document.createElement('canvas')];
    mCanvases.forEach(canvas => {
        canvas.width = 512;
        canvas.height = 512;
    });
    const mContexts = mCanvases.map(c => c.getContext('2d'));
    const mMaterials = [new THREE.MeshBasicMaterial(), new THREE.MeshBasicMaterial()];
    mMaterials.forEach((m, index) => m.map = new THREE.CanvasTexture(mCanvases[index]));

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
        mMomentGroup.add(lens)
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
    mMomentGroup.add(mSphere);

    async function update(moment, model, assetUtil) {
        let oldModel = mModel;
        mModel = model;
        mMoment = moment;

        let position = new THREE.Vector3(moment.x, moment.y, moment.t);
        mLenses.forEach(plane => {
            plane.position.copy(position);
        })
        mSphere.position.copy(position);
        mPosition = position;

        let story = mModel.getStory();
        let oldStory = oldModel.getStory();
        if (story.background != oldStory.background || !oldStory.background) {
            if (story.background) {
                mEnvironmentBox = await assetUtil.loadEnvironmentCube(story.background);
            } else {
                mEnvironmentBox = await assetUtil.loadDefaultEnvironmentCube();
            }
            mSphere.material.envMap = mEnvironmentBox;
        }

        await SceneUtil.syncArray(mModel3DScenes, mMoment.model3Ds, model, assetUtil, async (model3D) => {
            let newModel3DScene = new Model3DScene(mMomentGroup);
            await newModel3DScene.update(model3D, mModel, assetUtil)
            return newModel3DScene;
        });

        await SceneUtil.syncArray(mAnnotationScenes, story.annotations, model, assetUtil, async (annotation) => {
            let newAnnotationScene = new AnnotationScene(mMomentGroup);
            await newAnnotationScene.update(annotation, mModel, assetUtil)
            return newAnnotationScene;
        });
    }

    function render() {
        gRenderer.clear();

        gRenderer.setViewport(0, 0, 512, 512);
        gRenderer.render(mMomentScene, mCameras[0]);
        mContexts[0].drawImage(gCanvas, 0, 0, 512, 512, 0, 0, 512, 512);
        mLenses[0].material.map.needsUpdate = true;

        gRenderer.setViewport(512, 0, 512, 512);
        gRenderer.render(mMomentScene, mCameras[1]);
        mContexts[1].drawImage(gCanvas, 512, 0, 512, 512, 0, 0, 512, 512);
        mLenses[1].material.map.needsUpdate = true;
    }

    function onCameraMove(cameraPosition1, cameraPosition2 = null) {
        // rendering VR vs viewer
        if (!cameraPosition2) {
            mLenses[0].layers.set(0)
            cameraPosition2 = new THREE.Vector3(0, 0, 0);
        } else {
            mLenses[0].layers.set(1)
        }

        // face lenses at user
        mLenses.forEach((lens, i) => {
            let rotationMatrix = new THREE.Matrix4().lookAt([cameraPosition1, cameraPosition2][i], lens.position, UP);
            let qt = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
            lens.quaternion.copy(qt);
        })

        let internalCameraOrientation1 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(cameraPosition1, mPosition, UP));
        internalCameraOrientation1 = mOrientation.clone().invert().multiply(internalCameraOrientation1);
        mCameras[0].quaternion.copy(internalCameraOrientation1);
        let internalCameraPosition1 = new THREE.Vector3(0, 0, mFocalDist).applyQuaternion(internalCameraOrientation1).add(mFocalPoint);
        mCameras[0].position.copy(internalCameraPosition1);

        let internalCameraOrientation2 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(cameraPosition2, mPosition, UP));
        internalCameraOrientation2 = mOrientation.clone().invert().multiply(internalCameraOrientation2);
        mCameras[1].quaternion.copy(internalCameraOrientation2);
        let internalCameraPosition2 = new THREE.Vector3(0, 0, mFocalDist).applyQuaternion(internalCameraOrientation2).add(mFocalPoint);
        mCameras[1].position.copy(internalCameraPosition2);
    }

    function getId() {
        return mMoment.id;
    }

    function remove() {
        parent.remove(mMomentGroup);
    }

    this.update = update;
    this.getId = getId;
    this.remove = remove;
    this.render = render;
    this.onCameraMove = onCameraMove;
}