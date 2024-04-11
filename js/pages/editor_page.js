import { LookTarget, USER_HEIGHT } from '../constants.js';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { HighlightRingController } from '../controllers/highlight_ring_controller.js';
import { InputController } from '../controllers/input_controller.js';
import { StoryController } from '../controllers/story_controller.js';
import { Util } from '../utils/utility.js';
import { TimelineController } from '../controllers/timeline_controller.js';
import { ModelController } from '../controllers/model_controller.js';
import { SidebarController } from '../controllers/sidebar_controller.js';
import { IdUtil } from '../utils/id_util.js';
import { Data } from '../data_structs.js';
import { AssetPicker } from './dialogs/asset_picker.js';

export function EditorPage(parentContainer) {
    const RESIZE_TARGET_SIZE = 20;
    let mModelController;
    let mWorkspace;

    let mSidebarDivider = 0.8;
    let mTimelineDivider = 0.8;
    let mWidth = 100;
    let mHeight = 100;

    let mInteraction = false;
    let mTPosition = 0;
    let mLastLookTarget = false;

    let mResizingWindows = false;

    const fov = 75;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 200;
    const mCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    mCamera.position.set(0, USER_HEIGHT, 0);

    let mScene = new THREE.Scene();
    let mHighlightRingController = new HighlightRingController(mScene);

    let mLight = new THREE.DirectionalLight(0xFFFFFF, 3);
    mLight.position.set(- 1, 2, 4);
    mScene.add(mLight);

    const mStoryController = new StoryController(mScene);

    let mMainContainer = parentContainer.append('div')
        .style('width', '100%')
        .style('height', '100%')
        .style('display', 'flex')
        .style('flex-direction', 'row');

    let mMomentDisplay = mMainContainer.append('div')
        .attr('id', 'moment-display')
        .style('display', 'flex')
        .style('flex-direction', 'column');

    let mViewContainer = mMomentDisplay.append('div')
        .attr('id', 'canvas-view-container')
        .style('display', 'block')
        .style('border', '1px solid black')

    let mMainCanvas = mViewContainer.append('canvas')
        .attr('id', 'main-canvas')
        .style('display', 'block')

    let mTimelineContainer = mMomentDisplay.append('div')
        .attr('id', 'timeline')
        .style('display', 'block')
        .style('border', '1px solid black')

    let mSidebarContainer = mMainContainer.append('div')
        .attr('id', 'sidebar')
        .style('height', '100%')
        .style('display', 'block')
        .style('border', '1px solid black')
        .style('overflow-y', 'scroll')

    let mResizeTarget = parentContainer.append('img')
        .attr('id', 'resize-control')
        .attr('src', 'assets/images/buttons/panning_button.png')
        .style('position', 'absolute')
        .style('width', RESIZE_TARGET_SIZE + 'px')
        .style('height', RESIZE_TARGET_SIZE + 'px')
        .on('dragstart', (event) => event.preventDefault())
        .on('pointerdown', () => { mResizingWindows = true; });



    let mAssetPicker = new AssetPicker(parentContainer);
    mAssetPicker.setNewAssetCallback(async (fileHandle, type) => {
        let filename = await mWorkspace.storeAsset(fileHandle);
        return await mModelController.createAsset(fileHandle.name, filename, type);
    })

    let mTimelineController = new TimelineController(mTimelineContainer);
    mTimelineController.setCreateMomentCallback(async () => {
        await mModelController.createMoment();
        await updateModel();
    })

    let mSidebarController = new SidebarController(mSidebarContainer);
    mSidebarController.setAddCallback(async (parentId, itemClass, config) => {
        // should be undo/redo stuff here.

        if ((IdUtil.getClass(parentId) == Data.Story || IdUtil.getClass(parentId) == Data.Moment)
            && itemClass == Data.Annotation) {
            await mModelController.createAnnotation(parentId);
        } else if (IdUtil.getClass(parentId) == Data.Story && itemClass == Data.Moment) {
            await mModelController.createMoment();
        } else if (itemClass == Data.Model3D) {
            let assetId = await mAssetPicker.showOpenAssetPicker(mModelController.getModel());
            if (assetId) {
                await mModelController.createModel3D(parentId, assetId);
            }
        } else {
            console.error("Parent + item class not supported", parentId, itemClass);
            return;
        }
        await updateModel();
    })
    mSidebarController.setUpdateAttributeCallback(async (id, attr, value) => {
        await mModelController.setAttribute(id, attr, value);
        await updateModel();
    })
    mSidebarController.setSelectAsset(async () => {
        return await mAssetPicker.showOpenAssetPicker(mModelController.getModel());
    })

    let mRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: mMainCanvas.node() });
    mRenderer.xr.enabled = true;
    mRenderer.setAnimationLoop(render);

    let mInputController = new InputController(mCamera, mRenderer, mScene);
    mInputController.setCameraPositionChangeCallback(onCameraPositionChange);
    mInputController.setDragStartCallback(onMomentDrag)
    mInputController.setDragEndCallback(onMomentDragEnd);
    mInputController.setClickCallback(onClick);

    let vrButton = VRButton.createButton(mRenderer);
    let vrButtonDiv = parentContainer.append("div")
        .style('position', 'absolute')
        .style('top', '40px')
        .style('left', '20px')
    vrButtonDiv.node().appendChild(vrButton);
    d3.select(vrButton).style("position", "relative")

    async function show(workspace) {
        mWorkspace = workspace;

        const storyId = new URLSearchParams(window.location.search).get("story");
        if (!storyId) { console.error("Story not set!"); return; }

        mModelController = new ModelController(storyId, workspace);
        await mModelController.init();

        onResize(mWidth, mHeight);

        await mSidebarController.updateModel(mModelController.getModel());
        await mSidebarController.navigate(mModelController.getModel().getStory().id);

        await updateModel();
    }

    async function updateModel() {
        let model = mModelController.getModel();
        await mTimelineController.updateModel(model);
        await mSidebarController.updateModel(model);
        await mStoryController.updateModel(model);
    }

    function onResize(width, height) {
        mWidth = width;
        mHeight = height;

        if (!mRenderer) return;

        mTimelineController.onResize(Math.round(mWidth * mSidebarDivider), Math.round(mHeight * (1 - mTimelineDivider)));
        mSidebarController.onResize(mWidth - Math.round(mWidth * mSidebarDivider), mHeight);

        let viewCanvasWidth = Math.round(mWidth * mSidebarDivider)
        let viewCanvasHeight = Math.round(mHeight * mTimelineDivider)
        mRenderer.setSize(viewCanvasWidth, viewCanvasHeight, false);

        mCamera.aspect = viewCanvasWidth / viewCanvasHeight;
        mCamera.updateProjectionMatrix();

        mResizeTarget.style('left', (viewCanvasWidth - RESIZE_TARGET_SIZE / 2) + "px")
        mResizeTarget.style('top', (viewCanvasHeight - RESIZE_TARGET_SIZE / 2) + "px")
    }

    function onPointerMove(screenCoords) {
        if (mResizingWindows) {
            mSidebarDivider = Util.limit(screenCoords.x / mWidth, 0.01, 0.99);
            mTimelineDivider = Util.limit(screenCoords.y / mHeight, 0.01, 0.99);
            onResize(mWidth, mHeight);
        }
    }

    function onPointerUp(screenCoords) {
        mResizingWindows = false;
    }

    function onCameraPositionChange() {
        mStoryController.sortMoments(mStoryController.worldToLocalPosition(mCamera.position));
    }

    function onMomentDrag(moment) {
        mInteraction = {
            type: MOMENT_DRAG,
            moment,
            cameraStartPos: mCamera.position.clone(),
            toMoment: new THREE.Vector3().subVectors(mStoryController.localToWorldPosition(moment.getPosition()), mCamera.position).applyQuaternion(mCamera.quaternion.clone().invert())
        }
        mHighlightRingController.hide();
    }

    function onMomentDragEnd() {
        mInteraction = false;
    }

    function onClick() {
        if (!mLastLookTarget) return;
        if (mLastLookTarget.type == LookTarget.LINE_SURFACE) {
            let zeroT = mTPosition;

            let userPosition = mStoryController.worldToLocalPosition(mCamera.position);
            let userClosestPoint = mStoryController.getPathLine().getClosestPoint(userPosition);

            let position = mStoryController.worldToLocalPosition(mLastLookTarget.position)
            let closestPoint = mStoryController.getPathLine().getClosestPoint(position);
            let offset = new THREE.Vector3()
                .subVectors(position, closestPoint.position)
                .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), closestPoint.tangent));

            mTPosition = closestPoint.t + zeroT - userClosestPoint.t;
            mTPosition = Math.max(0, Math.min(1, mTPosition));

            mStoryController.update(mTPosition, offset.x);
        }
    }

    function render(time) {
        time *= 0.001;
        let clock = new THREE.Clock();
        clock.start();

        let momentsArr = mStoryController.getMoments();
        let localCameraPos = mStoryController.worldToLocalPosition(mCamera.position);

        for (let i = 0; i < momentsArr.length; i++) {
            if (clock.getElapsedTime() > 0.015) { break; }
            momentsArr[i].update(localCameraPos);
        }

        let interactionTarget;
        if (mInteraction) {
            if (mInteraction.type == MOMENT_DRAG) {
                interactionTarget = mInteraction.moment;
                let newWorldPos = mInteraction.toMoment.clone()
                    .applyQuaternion(mCamera.quaternion)
                    .add(mCamera.position);
                mInteraction.moment.setPosition(mStoryController.worldToLocalPosition(newWorldPos))
            } else {
                console.error("Not supported!", mInteraction);
            }
        } else {
            mLastLookTarget = mInputController.getLookTarget(mCamera, mStoryController);
            if (mLastLookTarget.type == LookTarget.MOMENT) {
                let worldPos = mStoryController.localToWorldPosition(mLastLookTarget.moment.getPosition());
                worldPos.add(new THREE.Vector3(0, -mLastLookTarget.moment.getSize(), 0))
                mHighlightRingController.setPosition(worldPos)
                mHighlightRingController.rotateUp();
                mHighlightRingController.show();
                interactionTarget = mLastLookTarget.moment;
            } else if (mLastLookTarget.type == LookTarget.LINE_SURFACE) {
                mHighlightRingController.setPosition(mLastLookTarget.position)
                mHighlightRingController.rotateUp(mLastLookTarget.normal);
                mHighlightRingController.show();
            } else if (mLastLookTarget.type == LookTarget.UP) {
                mHighlightRingController.hide();
                // show the exit
            } else if (mLastLookTarget.type == LookTarget.NONE) {
                mHighlightRingController.hide();
            } else {
                console.error("Type not supported!", mLastLookTarget);
            }
        }

        // chop the animation time out of rendering, it should be cheap
        momentsArr.forEach(moment => {
            moment.animate(time);
        })

        let cameraPosition1 = null;
        let cameraPosition2 = null;
        if (mRenderer.xr.isPresenting) {
            let cameras = mRenderer.xr.getCamera().cameras;
            cameraPosition1 = mStoryController.worldToLocalPosition(cameras[0].position)
            cameraPosition2 = mStoryController.worldToLocalPosition(cameras[1].position)
        } else {
            cameraPosition1 = mStoryController.worldToLocalPosition(mCamera.position)
        }

        // render the interaction target first
        if (clock.getElapsedTime() < 0.02 && interactionTarget) {
            interactionTarget.setBlur(false);
            interactionTarget.render(cameraPosition1, cameraPosition2);
        }
        for (let i = 0; i < momentsArr.length; i++) {
            if (momentsArr[i] == interactionTarget) continue;
            if (clock.getElapsedTime() < 0.02) {
                momentsArr[i].setBlur(false);
                momentsArr[i].render(cameraPosition1, cameraPosition2);
            } else {
                // if we've going to drop below 60fps, stop rendering
                momentsArr[i].setBlur(true);
            }
        }
        mHighlightRingController.animate(time);

        mRenderer.render(mScene, mCamera);
    }

    this.show = show;
    this.onResize = onResize;
    this.onPointerMove = onPointerMove;
    this.onPointerUp = onPointerUp;
}