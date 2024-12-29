import * as THREE from 'three';
import { Data } from "../../data.js";
import { InteractionTargetInterface } from "./interaction_target_interface.js";
import { BrushToolButtons, SurfaceToolButtons, ToolButtons } from '../../constants.js';
import { CanvasUtil } from '../../utils/canvas_util.js';
import { Util } from '../../utils/utility.js';

const DEFAULT_TEXTURE = 'assets/images/default_sphere_texture.png';

const BASE_CANVAS_WIDTH = 2048;
const BASE_CANVAS_HEIGHT = 1024;

const POSITION_NUM_COMPONENTS = 3;
const UV_NUM_COMPONENTS = 2;
const COLOR_NUM_COMPONENTS = 4;
const NORMAL_NUM_COMPONENTS = 3;

const SURFACE_COLORS = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080', '#ffffff', '#000000']

export function PhotosphereWrapper(parent) {
    let mParent = parent;
    let mModel = new Data.StoryModel();
    let mPhotosphere = new Data.Photosphere();
    let mSurfaces = [];
    let mSurfacePivots = [];
    let mInteractionTarget = createInteractionTarget();

    let mBasePointUVs = Data.Photosphere.basePointUVs;
    let mSurfaceOffsets = [];

    let mSurfaceSelectLine = [];

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
    let mSurfacesOverlay = document.createElement('canvas');
    mSurfacesOverlay.height = 256;
    mSurfacesOverlay.width = 512;
    let mSurfacesOverlayCtx = mSurfacesOverlay.getContext('2d')

    const mCanvas = document.createElement('canvas');
    mCanvas.width = BASE_CANVAS_WIDTH;
    mCanvas.height = BASE_CANVAS_HEIGHT;
    const mCtx = mCanvas.getContext('2d');
    const mCanvasMaterial = new THREE.CanvasTexture(mCanvas);

    const mMaterial = new THREE.MeshStandardMaterial({ map: mCanvasMaterial });

    const mSphere = new THREE.Mesh(mGeometry, mMaterial);

    const mPlaneHelper = new THREE.Plane();
    const mRayHelper = new THREE.Ray();

    async function update(photosphereId, model, assetUtil) {
        mPhotosphere = model.photospheres.find(p => p.id == photosphereId);
        mSurfaces = model.surfaces.filter(s => mPhotosphere.surfaceIds.includes(s.id));

        mModel = model;

        if (!mPhotosphere.enabled) {
            mParent.remove(mSphere);
            return;
        } else {
            mParent.add(mSphere)
        }

        mSurfacePivots = mSurfaces.map(s => {
            let center = new THREE.Vector3();
            for (let i = 0; i < s.points.length; i += 2) {
                center.add(Util.uvToPoint(s.points[i], s.points[i + 1]));
            }
            center.normalize();

            let pivot = new THREE.Vector3();
            mPlaneHelper.normal.set(...s.normal);
            mPlaneHelper.constant = s.dist;
            mRayHelper.direction.copy(center);
            mRayHelper.intersectPlane(mPlaneHelper, pivot);
            if (pivot.length() == 0) {
                console.error('Invalid pivot:' + pivot.toArray())
                pivot.copy(center);
            }
            return pivot;
        })

        // TODO: Might need to fix performance here. 
        updateMesh();

        if (mPhotosphere.imageAssetId) {
            mImage = await assetUtil.loadImage(mPhotosphere.imageAssetId);
        } else {
            mImage = await (new THREE.ImageLoader()).loadAsync(DEFAULT_TEXTURE)
        }
        mOriginalBlur = await assetUtil.loadImage(mPhotosphere.blurAssetId);
        if (mOriginalBlur) {
            mBlur.height = mOriginalBlur.height
            mBlur.width = mOriginalBlur.width
            resetBlur();
        }

        mOriginalColor = await assetUtil.loadImage(mPhotosphere.colorAssetId);
        if (mOriginalColor) {
            mColor.height = mOriginalColor.height
            mColor.width = mOriginalColor.width
            resetColor();
        }
        mSphere.userData.id = photosphereId;

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
        mCtx.filter = "none";
        mCtx.drawImage(mColor, 0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT)
        if (mTool == ToolButtons.SURFACE) {
            mCtx.drawImage(mSurfacesOverlay, 0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT);
        }
        mCanvasMaterial.needsUpdate = true;
    }

    function updateMesh() {
        let numVertices = mBasePointUVs.length / 2 + mSurfaces.reduce((sum, surface) => {
            // add the length of the array /2 since it's a flat u,v array
            sum += surface.points.length / 2;
            return sum;
        }, 0);
        mPositionArray = new Float32Array(numVertices * POSITION_NUM_COMPONENTS);
        mNormalsArray = new Float32Array(numVertices * NORMAL_NUM_COMPONENTS);
        mUVArray = new Float32Array(numVertices * UV_NUM_COMPONENTS);
        mColorArray = new Float32Array(numVertices * COLOR_NUM_COMPONENTS);

        let points = [...mBasePointUVs];
        mSurfaceOffsets = [];
        for (let surface of mSurfaces) {
            // the offset where this surfaces points start. 
            mSurfaceOffsets.push(points.length / 2);
            points.push(...surface.points);
        }
        for (let i = 0; i < numVertices; i++) {
            let u = points[i * 2];
            let v = points[i * 2 + 1];
            let point = Util.uvToPoint(u, v);
            let scaledPoint = new THREE.Vector3();
            let surface = getSurfaceForPointIndex(i);
            if (surface) {
                mPlaneHelper.normal.set(...surface.normal);
                mPlaneHelper.constant = surface.dist;
                mRayHelper.direction.copy(point);
                mRayHelper.intersectPlane(mPlaneHelper, scaledPoint);
                if (scaledPoint.length() == 0) {
                    console.error('Invalid point:' + [u, v] + ", " + scaledPoint.toArray())
                    scaledPoint.copy(point);
                }
            } else {
                scaledPoint.copy(point);
            }
            scaledPoint.multiplyScalar(mPhotosphere.scale);

            mPositionArray.set(scaledPoint.toArray(), i * POSITION_NUM_COMPONENTS);
            mNormalsArray.set(point, i * NORMAL_NUM_COMPONENTS);
            mUVArray.set([u, v], i * UV_NUM_COMPONENTS);
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

    function getSurfaceForPointIndex(pointIndex) {
        if (pointIndex < mBasePointUVs.length / 2) {
            return mSurfaces.find(s => s.basePointIndices.includes(pointIndex));
        } else {
            // if it's base the end of the offsets, it's in the last surface.
            if (pointIndex > mSurfaceOffsets[mSurfaceOffsets.length - 1]) {
                return mSurfaces[mSurfaces.length - 1];
            } else {
                for (let i = 1; i < mSurfaceOffsets.length; i++) {
                    if (pointIndex < mSurfaceOffsets[i]) {
                        return mSurfaces[i - 1];
                    }
                }
            }
        }
    }

    function getId() {
        return mPhotosphere.id;
    }

    function remove() {
        mParent.remove(mSphere);
    }

    // TODO: This is terrible and needs to be done better
    let mTool = ToolButtons.MOVE;
    function getTargets(ray, toolMode) {
        let lastTool = mTool;
        mTool = toolMode.tool;
        if (mTool != lastTool) { drawTexture() }

        if (toolMode.tool == ToolButtons.BRUSH ||
            toolMode.tool == ToolButtons.SURFACE ||
            toolMode.tool == ToolButtons.SCISSORS) {
        } else {
            return []
        }

        let intersect = ray.intersectObject(mSphere);
        if (intersect.length == 0) return [];
        intersect = intersect[0];

        let targetedId;
        if (toolMode.tool == ToolButtons.BRUSH &&
            (toolMode.brushSettings.mode == BrushToolButtons.BLUR ||
                toolMode.brushSettings.mode == BrushToolButtons.UNBLUR)) {
            targetedId = mPhotosphere.blurAssetId;
        } else if (toolMode.tool == ToolButtons.BRUSH &&
            toolMode.brushSettings.mode == BrushToolButtons.COLOR) {
            targetedId = mPhotosphere.colorAssetId;
        } else if (toolMode.tool == ToolButtons.SURFACE &&
            toolMode.surfaceSettings.mode == SurfaceToolButtons.PULL) {
            let pointIndex = intersect.face.a
            let surface = getSurfaceForPointIndex(pointIndex);
            if (!surface) return [];
            else targetedId = surface.id;
        } else if (toolMode.tool == ToolButtons.SURFACE &&
            (toolMode.surfaceSettings.mode == SurfaceToolButtons.FLATTEN ||
                toolMode.surfaceSettings.mode == SurfaceToolButtons.RESET)) {
            targetedId = mPhotosphere.id;
        } else {
            console.error('Unhandled tool state: ' + JSON.stringify(toolMode));
        }

        mInteractionTarget.getIntersection = () => intersect;
        mInteractionTarget.getId = () => targetedId;
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
            } else if (toolMode.tool == ToolButtons.SURFACE &&
                toolMode.surfaceSettings.mode == SurfaceToolButtons.PULL) {
                resetSurfacesOverlay();
                let surfaceIndex = mSurfaces.findIndex(s => s.id == targetedId);
                if (surfaceIndex == -1) { console.error('Invalid surface: ' + targetedId); return; }
                drawSurface(mSurfaces[surfaceIndex].points, surfaceIndex);
                drawTexture();
            }
        };
        mInteractionTarget.select = (toolMode) => {
            if (toolMode.tool == ToolButtons.BRUSH) {
                if (toolMode.brushSettings.mode == BrushToolButtons.UNBLUR) {
                    drawBlur(intersect.uv.x, intersect.uv.y, toolMode.brushSettings.brushWidth, false)
                } else if (toolMode.brushSettings.mode == BrushToolButtons.BLUR) {
                    drawBlur(intersect.uv.x, intersect.uv.y, toolMode.brushSettings.brushWidth, true)
                }
                drawTexture();
            } else if (toolMode.tool == ToolButtons.SURFACE) {
                if (toolMode.surfaceSettings.mode == SurfaceToolButtons.FLATTEN ||
                    toolMode.surfaceSettings.mode == SurfaceToolButtons.RESET) {
                    mSurfaceSelectLine.push(...intersect.uv);
                    resetSurfacesOverlay();
                    drawSurface(mSurfaceSelectLine, mSurfaces.length);
                } else {
                    let surfaceIndex = mSurfaces.findIndex(s => s.id == targetedId);
                    if (surfaceIndex == -1) { console.error('Invalid surface: ' + targetedId); return; }
                    resetSurfacesOverlay();
                    drawSurface(mSurfaces[surfaceIndex].points, surfaceIndex);
                }
                drawTexture();
            }
        }
        mInteractionTarget.idle = (toolMode) => {
            if (toolMode.tool == ToolButtons.BRUSH) {
                resetBlur();
            } else if (toolMode.tool == ToolButtons.SURFACE) {
                mSurfaceSelectLine = [];
                resetSurfacesOverlay();
            }
            drawTexture();
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

    function drawSurface(points, colorIndex) {
        let sets = Util.breakUpUVSelection(points);
        let shapes = sets.map(s => {
            let coordArray = []
            for (let i = 0; i < s.length; i += 2) {
                let u = s[i];
                let v = s[i + 1];
                let x = Math.round(u * mSurfacesOverlay.width);
                let y = Math.round((1 - v) * mSurfacesOverlay.height);
                coordArray.push({ x, y });
            }
            return coordArray;
        })
        for (let shape of shapes) {
            mSurfacesOverlayCtx.save();
            mSurfacesOverlayCtx.beginPath();
            mSurfacesOverlayCtx.moveTo(shape[0].x, shape[0].y);
            for (let p of shape) {
                mSurfacesOverlayCtx.lineTo(p.x, p.y);
            }
            mSurfacesOverlayCtx.fillStyle = SURFACE_COLORS[colorIndex % SURFACE_COLORS.length];
            mSurfacesOverlayCtx.globalAlpha = 0.1;
            mSurfacesOverlayCtx.fill();
            mSurfacesOverlayCtx.restore();
        }
    }

    function resetSurfacesOverlay() {
        mSurfacesOverlayCtx.clearRect(0, 0, mSurfacesOverlay.width, mSurfacesOverlay.height);
        mSurfacesOverlayCtx.reset();
        for (let i = 0; i < mSurfaces.length; i++) {
            drawSurface(mSurfaces[i].points, i);
        }
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
        target.getBlurCanvas = () => CanvasUtil.cloneCanvas(mBlur);
        target.getColorCanvas = () => CanvasUtil.cloneCanvas(mColor);
        target.getDrawnPath = () => [...mSurfaceSelectLine];
        target.setBlurCanvas = (canvas) => mOriginalBlur = canvas;
        target.setColorCanvas = (canvas) => mOriginalColor = canvas;
        // these are only for moving surfaces
        target.getWorldPosition = function () {
            let surfaceId = this.getId();
            let surfaceIndex = mSurfaces.findIndex(s => s.id == surfaceId);
            if (surfaceIndex == -1) console.error('invalid target: ' + this.getId());
            return mSurfacePivots[surfaceIndex];
        }
        target.setWorldPosition = function (pos) {
            let surfaceId = this.getId();
            let surfaceIndex = mSurfaces.findIndex(s => s.id == surfaceId);
            if (surfaceIndex == -1) console.error('invalid target: ' + this.getId());
            let ray = new THREE.Ray()
            ray.direction.copy(mSurfacePivots[surfaceIndex]).normalize();
            let newPos = new THREE.Vector3()
            ray.closestPointToPoint(pos, newPos);
            mPlaneHelper.setFromNormalAndCoplanarPoint(new THREE.Vector3(...mSurfaces[surfaceIndex].normal), newPos);
            mSurfaces[surfaceIndex].dist = mPlaneHelper.constant;
            updateMesh();
        }
        target.getLocalOrientation = function () {
            let surfaceId = this.getId();
            let surface = mSurfaces.find(s => s.id == surfaceId);
            if (!surface) console.error('invalid target: ' + this.getId());
            return new THREE.Quaternion().setFromRotationMatrix(
                new THREE.Matrix4().lookAt(new THREE.Vector3(...surface.normal),
                    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)));
        }
        target.setLocalOrientation = function (orientation) {
            let surfaceId = this.getId();
            let surfaceIndex = mSurfaces.findIndex(s => s.id == surfaceId);
            if (surfaceIndex == -1) console.error('invalid target: ' + this.getId());
            mSurfaces[surfaceIndex].normal = new THREE.Vector3(0, 0, 1).applyQuaternion(orientation).toArray();
            mPlaneHelper.setFromNormalAndCoplanarPoint(new THREE.Vector3(...mSurfaces[surfaceIndex].normal), mSurfacePivots[surfaceIndex]);
            mSurfaces[surfaceIndex].dist = mPlaneHelper.constant;
            updateMesh();
        }
        target.getNormalAndDist = function () {
            let surfaceId = this.getId();
            let surface = mSurfaces.find(s => s.id == surfaceId);
            if (!surface) console.error('invalid target: ' + this.getId());
            return { normal: surface.normal, dist: surface.dist };
        }
        return target;
    }

    this.getTargets = getTargets;
    this.update = update;
    this.getId = getId;
    this.remove = remove;
}