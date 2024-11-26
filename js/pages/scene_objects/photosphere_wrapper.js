import * as THREE from 'three';
import { Data } from "../../data.js";
import { InteractionTargetInterface } from "./interaction_target_interface.js";

const DEFAULT_TEXTURE = 'assets/images/default_sphere_texture.png';

const BASE_CANVAS_WIDTH = 2048;
const BASE_CANVAS_HEIGHT = 1024;

const POSITION_NUM_COMPONENTS = 3;
const UV_NUM_COMPONENTS = 2;
const COLOR_NUM_COMPONENTS = 4;
const NORMAL_NUM_COMPONENTS = 3;

export function PhotosphereWrapper(parent) {
    let mParent = parent;
    let mModel = new Data.StoryModel();
    let mPhotosphere = new Data.Photosphere();
    let mInteractionTarget = createInteractionTarget();

    const mGeometry = new THREE.BufferGeometry();
    let mPositionAttribute;
    let mPositionArray;
    let mUVAttribute;
    let mUVArray;
    let mColorAttribute;
    let mColorArray;
    let mNormalsAttribute;
    let mNormalsArray;
    let mIndicesArray;

    let mImage = document.createElement('canvas');
    let mBlur = document.createElement('canvas');
    let mColor = document.createElement('canvas');

    const mCanvas = document.createElement('canvas');
    mCanvas.width = BASE_CANVAS_WIDTH;
    mCanvas.height = BASE_CANVAS_HEIGHT;
    const ctx = mCanvas.getContext('2d');
    const mCanvasMaterial = new THREE.CanvasTexture(mCanvas);

    const mMaterial = new THREE.MeshStandardMaterial({ map: mCanvasMaterial });

    const mSphere = new THREE.Mesh(mGeometry, mMaterial);

    async function update(photosphereId, model, assetUtil) {
        drawTexture();
        let oldSphere = mPhotosphere;
        mPhotosphere = model.find(photosphereId);
        mModel = model;

        if (!mPhotosphere.enabled) {
            mParent.remove(mSphere);
            return;
        } else {
            mParent.add(mSphere)
        }

        // TODO: Might need to fix performance here. 
        updateMesh();


        let redraw = false;
        if (mPhotosphere.imageAssetId) {
            mImage = await assetUtil.loadImage(mPhotosphere.imageAssetId);
        } else {
            mImage = await (new THREE.ImageLoader()).loadAsync(DEFAULT_TEXTURE)
        }
        mColor = await assetUtil.loadImage(mPhotosphere.colorAssetId);
        mBlur = await assetUtil.loadImage(mPhotosphere.blurAssetId);

        if (redraw) drawTexture();
    }

    function drawTexture() {
        ctx.reset();
        ctx.drawImage(mBlur, 0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT)
        ctx.globalCompositeOperation = 'source-atop'
        ctx.drawImage(mImage, 0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT);
        ctx.filter = 'blur(15px)'
        ctx.globalCompositeOperation = 'destination-over'
        ctx.drawImage(mImage, 0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT)
        ctx.drawImage(mImage, 0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT)
        ctx.globalCompositeOperation = 'source-over'
        ctx.filter = null;
        ctx.drawImage(mColor, 0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT)
        mCanvasMaterial.needsUpdate = true;
    }

    function updateMesh() {
        let numVertices = mPhotosphere.pointIds.length;
        mPositionArray = new Float32Array(numVertices * POSITION_NUM_COMPONENTS);
        mNormalsArray = new Float32Array(numVertices * NORMAL_NUM_COMPONENTS);
        mUVArray = new Float32Array(numVertices * UV_NUM_COMPONENTS);
        mColorArray = new Float32Array(numVertices * COLOR_NUM_COMPONENTS);

        const longHelper = new THREE.Object3D();
        const latHelper = new THREE.Object3D();
        const pointHelper = new THREE.Object3D();
        longHelper.add(latHelper);
        latHelper.add(pointHelper);
        const temp = new THREE.Vector3();

        function getPoint(lat, long, dist) {
            pointHelper.position.z = dist * mPhotosphere.scale;
            latHelper.rotation.x = lat;
            longHelper.rotation.y = long;
            longHelper.updateMatrixWorld(true);
            return pointHelper.getWorldPosition(temp).toArray();
        }

        let points = mModel.photospherePoints.filter(p => mPhotosphere.pointIds.includes(p.id));
        for (let i = 0; i < points.length; i++) {
            let p = points[i];
            const lat = ((1 - p.v) - 0.5) * Math.PI;
            const long = (1 - p.u) * Math.PI * 2;
            mPositionArray.set(getPoint(lat, long, p.dist), i * POSITION_NUM_COMPONENTS);
            mNormalsArray.set(getPoint(lat, long, 1), i * NORMAL_NUM_COMPONENTS);
            mUVArray.set([p.u, p.v], i * UV_NUM_COMPONENTS);
            mColorArray.set([0, 0, 1, 0], i * COLOR_NUM_COMPONENTS);
        }

        mPositionAttribute = new THREE.BufferAttribute(mPositionArray, POSITION_NUM_COMPONENTS);
        mPositionAttribute.setUsage(THREE.DynamicDrawUsage);
        mUVAttribute = new THREE.BufferAttribute(mUVArray, UV_NUM_COMPONENTS);
        mUVAttribute.setUsage(THREE.DynamicDrawUsage);
        mColorAttribute = new THREE.BufferAttribute(mColorArray, COLOR_NUM_COMPONENTS)
        mColorAttribute.setUsage(THREE.DynamicDrawUsage);
        mNormalsAttribute = new THREE.BufferAttribute(mNormalsArray, NORMAL_NUM_COMPONENTS)
        mNormalsAttribute.setUsage(THREE.DynamicDrawUsage);

        let delauny = new Delaunator(mUVArray);
        mIndicesArray = Array.from(delauny.triangles);
        for (let i = 0; i < mIndicesArray.length; i += 3) {
            let x = mIndicesArray[i]
            mIndicesArray[i] = mIndicesArray[i + 2]
            mIndicesArray[i + 2] = x;
        }

        mGeometry.setAttribute('position', mPositionAttribute);
        mGeometry.setAttribute('color', mColorAttribute);
        mGeometry.setAttribute('uv', mUVAttribute);
        mGeometry.setAttribute('normal', mNormalsAttribute);
        mGeometry.setIndex(mIndicesArray);
    }

    function getId() {
        return mPhotosphere.id;
    }

    function remove() {
        mParent.remove(mSphere);
    }

    function getTargets(ray) {
        const intersect = ray.intersectObject(mPlane);
        if (intersect.length > 0) {
            mInteractionTarget.getIntersection = () => { return intersect[0]; }
            return [mInteractionTarget];
        } else return [];
    }

    function createInteractionTarget() {
        let target = new InteractionTargetInterface();
        target.getLocalPosition = () => {
            let p = new THREE.Vector3();
            p.copy(mPlane.position)
            return p;
        }
        target.getWorldPosition = () => {
            let worldPos = new THREE.Vector3();
            mPlane.getWorldPosition(worldPos);
            return worldPos;
        }
        target.setWorldPosition = (worldPos) => {
            let localPosition = mPlane.parent.worldToLocal(worldPos);
            mPlane.position.copy(localPosition)
        }
        target.getLocalOrientation = () => {
            let q = new THREE.Quaternion();
            q.copy(mPlane.quaternion);
            return q;
        }
        target.setLocalOrientation = (orientation) => {
            // can't set angle on these.
        }
        target.getScale = () => {
            let scale = 1;
            scale = mPlane.scale.x;
            return scale;
        }
        target.setScale = (scale) => {
            mPlane.scale.set(scale, scale, scale);
        }
        target.getParent = () => { return null; }
        target.getRoot = () => { return target; }
        target.getObject3D = () => { return mPlane; }
        target.highlight = () => {
            mMaterial.color.set(0xff0000);
            mMaterial.needsUpdate = true;
        };
        target.idle = () => {
            mMaterial.color.set(0xffffff);
            mMaterial.needsUpdate = true;
        }
        target.getId = () => mPhotosphere.id;
        return target;
    }

    this.getTargets = getTargets;
    this.update = update;
    this.getId = getId;
    this.remove = remove;
}