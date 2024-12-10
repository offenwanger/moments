import * as THREE from 'three';
import { Data } from "../../data.js";
import { InteractionTargetInterface } from "./interaction_target_interface.js";
import { BrushToolButtons, ToolButtons } from '../../constants.js';

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
    let mBlurCtx = mBlur.getContext('2d')
    let mColor = document.createElement('canvas');
    let mColorCtx = mColor.getContext('2d')
    let mOriginalBlur = document.createElement('canvas');
    let mOriginalColor = document.createElement('canvas');

    const mCanvas = document.createElement('canvas');
    mCanvas.width = BASE_CANVAS_WIDTH;
    mCanvas.height = BASE_CANVAS_HEIGHT;
    const mCtx = mCanvas.getContext('2d');
    const mCanvasMaterial = new THREE.CanvasTexture(mCanvas);

    const mMaterial = new THREE.MeshStandardMaterial({ map: mCanvasMaterial });

    const mSphere = new THREE.Mesh(mGeometry, mMaterial);

    async function update(photosphereId, model, assetUtil) {
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

        if (mPhotosphere.imageAssetId) {
            mImage = await assetUtil.loadImage(mPhotosphere.imageAssetId);
        } else {
            mImage = await (new THREE.ImageLoader()).loadAsync(DEFAULT_TEXTURE)
        }
        mOriginalColor = await assetUtil.loadImage(mPhotosphere.colorAssetId);
        mOriginalBlur = await assetUtil.loadImage(mPhotosphere.blurAssetId);
        mBlur.height = mOriginalBlur.height
        mBlur.width = mOriginalBlur.width
        resetBlur();
        mColor.height = mOriginalColor.height
        mColor.width = mOriginalColor.width
        resetColor();

        drawTexture();
    }

    function drawTexture() {
        mCtx.reset();
        mCtx.drawImage(mBlur, 0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT)
        mCtx.globalCompositeOperation = 'source-atop'
        mCtx.drawImage(mImage, 0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT);
        mCtx.filter = 'blur(15px)'
        mCtx.globalCompositeOperation = 'destination-over'
        mCtx.drawImage(mImage, 0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT)
        mCtx.drawImage(mImage, 0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT)
        mCtx.globalCompositeOperation = 'source-over'
        mCtx.filter = null;
        mCtx.drawImage(mColor, 0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT)
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

    function getTargets(ray, toolMode) {
        if (toolMode.tool == ToolButtons.BRUSH ||
            toolMode.tool == ToolButtons.SURFACE ||
            toolMode.tool == ToolButtons.SCISSORS) {
        } else {
            return []
        }

        let targetedAssetId;
        if (toolMode.tool == ToolButtons.BRUSH) {
            if (toolMode.brushSettings.mode == BrushToolButtons.BLUR ||
                toolMode.brushSettings.mode == BrushToolButtons.UNBLUR) {
                targetedAssetId = mPhotosphere.blurAssetId;
            } else if (toolMode.brushSettings.mode == BrushToolButtons.COLOR) {
                targetedAssetId = mPhotosphere.colorAssetId;
            } else {
                console.error('Unhandled mode: ' + toolMode.brushSettings.mode);
            }
        } else {
            // it's complicated.
            console.error("Impliment me!");
            return [];
        }

        let intersect = ray.intersectObject(mSphere);
        if (intersect.length == 0) return [];
        intersect = intersect[0];

        mInteractionTarget.getIntersection = () => intersect;
        mInteractionTarget.getId = () => targetedAssetId;
        mInteractionTarget.highlight = function (toolMode) {
            if (toolMode.tool == ToolButtons.BRUSH) {
                if (toolMode.brushSettings.mode == BrushToolButtons.UNBLUR) {
                    resetBlur();
                    drawBlur(intersect.uv.x, intersect.uv.y, toolMode.brushSettings.brushWidth, false)
                    drawTexture();
                } else if (toolMode.brushSettings.mode == BrushToolButtons.BLUR) {
                    resetBlur();
                    drawBlur(intersect.uv.x, intersect.uv.y, toolMode.brushSettings.brushWidth, true)
                    drawTexture();
                }
            } else if (toolMode.tool == ToolButtons.SURFACE) {

            }
        };
        mInteractionTarget.select = (toolMode) => {
            if (toolMode.tool == ToolButtons.BRUSH) {
                if (toolMode.brushSettings.mode == BrushToolButtons.UNBLUR) {
                    drawBlur(intersect.uv.x, intersect.uv.y, toolMode.brushSettings.brushWidth, false)
                    drawTexture();
                } else if (toolMode.brushSettings.mode == BrushToolButtons.BLUR) {
                    drawBlur(intersect.uv.x, intersect.uv.y, toolMode.brushSettings.brushWidth, true)
                    drawTexture();
                }
            } else if (toolMode.tool == ToolButtons.SURFACE) {

            }
        }
        mInteractionTarget.idle = (toolMode) => {
            if (toolMode.tool == ToolButtons.BRUSH) {
                resetBlur();
                drawTexture();
            } else if (toolMode.tool == ToolButtons.SURFACE) {

            }
        }
        return [mInteractionTarget];
    }

    function drawBlur(u, v, brushWidth, blur) {
        mBlurCtx.save();
        mBlurCtx.filter = "blur(16px)";
        mBlurCtx.fillStyle = 'black';
        if (blur) {
            mBlurCtx.globalCompositeOperation = "destination-out"
        }
        drawWrappedCircle(u, v, brushWidth, mBlur, mBlurCtx);
        mBlurCtx.restore();
    }

    function resetBlur() {
        mBlurCtx.clearRect(0, 0, mBlur.width, mBlur.height);
        mBlurCtx.drawImage(mOriginalBlur, 0, 0);
    }

    function drawColor(u, v, brushWidth, color) {
        mColorCtx.save();
        mColorCtx.filter = "blur(16px)";
        mColorCtx.fillStyle = color;
        drawWrappedCircle(u, v, brushWidth, mColor, mColorCtx);
        mColorCtx.restore();
    }

    function resetColor() {
        mColorCtx.drawImage(mOriginalColor, 0, 0);
    }

    function drawWrappedCircle(u, v, brushWidth, canvas, ctx) {
        let x = Math.round(u * canvas.width);
        let y = Math.round((1 - v) * canvas.height);
        ctx.beginPath();
        let widthX = brushWidth / 2 * canvas.width
        let widthY = brushWidth * canvas.height;
        ctx.ellipse(x, y, widthX, widthY, 0, 0, Math.PI * 2, true);
        if (x + widthX > canvas.width) {
            ctx.ellipse(x - canvas.width, y, widthX, widthY, 0, 0, Math.PI * 2, true);
        } else if (x - widthX < 0) {
            ctx.ellipse(x + canvas.width, y, widthX, widthY, 0, 0, Math.PI * 2, true);
        }
        ctx.fill();
    }

    function createInteractionTarget() {
        let target = new InteractionTargetInterface();
        target.getObject3D = () => { return mSphere; }
        target.getBlurCanvas = () => mBlur;
        target.getColorCanvas = () => mColor;
        return target;
    }

    this.getTargets = getTargets;
    this.update = update;
    this.getId = getId;
    this.remove = remove;
}