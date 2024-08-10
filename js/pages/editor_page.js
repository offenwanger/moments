
import { AssetTypes } from '../constants.js';
import { Data } from '../data_structs.js';
import { AssetUtil } from '../utils/assets_util.js';
import { IdUtil } from '../utils/id_util.js';
import { Util } from '../utils/utility.js';
import { ModelController } from './controllers/model_controller.js';
import { SidebarController } from './controllers/sidebar_controller.js';
import { StoryDisplayController } from './controllers/story_display_controller.js';
import { TimelineController } from './controllers/timeline_controller.js';
import { AssetPicker } from './editor_panels/asset_picker.js';

export function EditorPage(parentContainer) {

    console.log(`
        cache loaded models?
        enable the click thing in the canvas viewer to bring it up in the sidebar
        Next order of buisness will be painting, both for timelines and regular type.
        Got tube painter as a starting example.
        
        TODO: Create a menu belt 
        Things to add: 
        - Edit timeline button 
            - This will need to open a timeline editor. Nah, it can be the normal storyview, just shrunk 
        - Add model button
        - add annotation button
        - Model brush
        - undo
        - Copy model eyedropper. 

        Momenents themselves: 
            I dont want to fuss with deciding where things go. 
            Forget the timeline representation, just give everything an xyz. Then add a timeline transformation tool
            

        Notes:
            Bubbles clip and have a background image. 
            This is an advanced feature. 
            Sadly I think I will have to remove the current bubbles. 
            
            speed blue
            rainbow bridge
            lighting pathways
            direction the light is coming from
            arrows

        Can now manipulate the browser from VR, can now make a unified tools interface. 

        TODO: 
            - enable scrolling via togglestick
            - check into screen resize bug
            - 3 views, Edit world Models, edit timeline models, edit timeline. 
            - Have 3 scales - timeline = biggest, world models = middle, timeline models = reg size
            - Navigation....
          
        TODOs 2024-08-01
        - Edit the wrist browser to be more performant

        Brush notes: 
            - using textures will get very complex because of UV unwrap. Some models are overlapping on their UV maps, so that would be a pain to deal with. 
            - Better though is to draw ribbons over the surface of the model, and apply textures to those. 

        Navigation thoughts: 
            - Simple move tool: Go forward one meter in the direction you are looking, if you intersect with something, stop .5 meters in front of it. 
          
        TODO: 
        - Grab move and grab zoom as a precursor to line drawing... 
        - Actually better do timeline edit mode first, better to do the zoom in the broweser, it will mean shrinking the scene which will bring out everywhere that I haven't converted my vector properly. 
    
        TODO 2024-08-04: 
        - Really need grab to move. 
        - Draw timeline
            - VR = direct
            - canvas -> draw a line on the canvas, use the existing timeline to set the distance. 
        - On redraw, map old timeline to new timeline
            - cluster the timeline models by bb overlap
            - get average point of models, get closest point to timeline, get dist vector, map to new timeline. 
        - Use the timeline to set the lighting, bright light in the forward direction on the timeline at the point cloest to the user, red light going backwards, dim light farther away. 

        `)

    const RESIZE_TARGET_SIZE = 20;
    let mModelController;
    let mWorkspace;
    let mAssetUtil;

    let mSidebarDivider = 0.8;
    let mTimelineDivider = 0.8;
    let mWidth = 100;
    let mHeight = 100;

    let mResizingWindows = false;

    let mMainContainer = parentContainer.append('div')
        .style('width', '100%')
        .style('height', '100%')
        .style('display', 'flex')
        .style('flex-direction', 'row');

    let mStoryDisplay = mMainContainer.append('div')
        .attr('id', 'story-display')
        .style('display', 'flex')
        .style('flex-direction', 'column');

    let mViewContainer = mStoryDisplay.append('div')
        .attr('id', 'canvas-view-container')
        .style('display', 'block')
        .style('border', '1px solid black')

    let mTimelineContainer = mStoryDisplay.append('div')
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

    let mStoryDisplayController = new StoryDisplayController(mViewContainer);
    mStoryDisplayController.onMove(async (id, newPosition) => {
        await mModelController.updatePosition(id, newPosition);
        await updateModel();
    });

    mStoryDisplayController.onMoveChain(async (items) => {
        await mModelController.updatePositionsAndOrientations(items);
        await updateModel();
    });

    mStoryDisplayController.onUpdateTimeline(async (line) => {
        line = line.filter(p => {
            if (typeof p.x != 'number' || typeof p.y != 'number' || typeof p.z != 'number') {
                console.error("invalid point", p);
                return false;
            }
            return true;
        }).map(p => { return { x: p.x, y: p.y, z: p.z } })
        await mModelController.updateTimeline(line);
        await updateModel();
    })

    let mAssetPicker = new AssetPicker(parentContainer);
    mAssetPicker.setNewAssetCallback(async (fileHandle, type) => {
        let filename = await mWorkspace.storeAsset(fileHandle);
        let asset = null;
        if (type == AssetTypes.MODEL) {
            asset = await mAssetUtil.loadGLTFModel(filename);
        }
        return await mModelController.createAsset(fileHandle.name, filename, type, asset);
    })

    let mTimelineController = new TimelineController(mTimelineContainer);

    let mSidebarController = new SidebarController(mSidebarContainer);
    mSidebarController.setAddCallback(async (parentId, itemClass, config) => {
        // should be undo/redo stuff here.

        if (IdUtil.getClass(parentId) == Data.Story && itemClass == Data.Annotation) {
            await mModelController.createAnnotation(parentId);
        } else if (itemClass == Data.Model3D) {
            let assetId = await mAssetPicker.showOpenAssetPicker(mModelController.getModel());
            if (assetId) { await mModelController.createModel3D(parentId, assetId); }
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
    mSidebarController.setDeleteCallback(async (id) => {
        await mModelController.deleteItem(id);
        await updateModel();
    })
    mSidebarController.setSelectAsset(async () => {
        return await mAssetPicker.showOpenAssetPicker(mModelController.getModel());
    })
    mSidebarController.setViewAssetCallback(async (assetId) => {
        const url = new URL(window.location)
        url.searchParams.set("assetViewId", assetId)
        history.replaceState(null, '', url);
        await mStoryDisplayController.showAsset(assetId, mAssetUtil);
    })
    mStoryDisplayController.onExitAssetView(async (assetId) => {
        const url = new URL(window.location)
        url.searchParams.delete("assetViewId")
        history.replaceState(null, '', url);
    })

    async function show(workspace) {
        mWorkspace = workspace;

        const searchParams = new URLSearchParams(window.location.search)
        const storyId = searchParams.get("story");
        if (!storyId) { console.error("Story not set!"); return; }

        mModelController = new ModelController(storyId, workspace);
        await mModelController.init();
        mAssetUtil = new AssetUtil(mWorkspace);

        resize(mWidth, mHeight);

        await mSidebarController.updateModel(mModelController.getModel());
        await mSidebarController.navigate(mModelController.getModel().getStory().id);

        await updateModel();

        if (searchParams.get("assetViewId")) {
            await mStoryDisplayController.showAsset(searchParams.get("assetViewId"), mAssetUtil);
        }
    }

    async function updateModel() {
        let model = mModelController.getModel();
        await mAssetUtil.updateModel(model);

        await mTimelineController.updateModel(model);
        await mSidebarController.updateModel(model);
        await mStoryDisplayController.updateModel(model, mAssetUtil);
    }

    function resize(width, height) {
        mWidth = width;
        mHeight = height;

        mTimelineController.resize(Math.round(mWidth * mSidebarDivider), Math.round(mHeight * (1 - mTimelineDivider)));
        mSidebarController.resize(mWidth - Math.round(mWidth * mSidebarDivider), mHeight);

        let viewCanvasWidth = Math.round(mWidth * mSidebarDivider)
        let viewCanvasHeight = Math.round(mHeight * mTimelineDivider)

        mResizeTarget.style('left', (viewCanvasWidth - RESIZE_TARGET_SIZE / 2) + "px")
        mResizeTarget.style('top', (viewCanvasHeight - RESIZE_TARGET_SIZE / 2) + "px")

        mStoryDisplayController.resize(viewCanvasWidth, viewCanvasHeight);
    }

    function pointerMove(screenCoords) {
        if (mResizingWindows) {
            mSidebarDivider = Util.limit(screenCoords.x / mWidth, 0.01, 0.99);
            mTimelineDivider = Util.limit(screenCoords.y / mHeight, 0.01, 0.99);
            resize(mWidth, mHeight);
        }

        mStoryDisplayController.pointerMove(screenCoords);
    }

    function pointerUp(screenCoords) {
        mResizingWindows = false;

        mStoryDisplayController.pointerUp(screenCoords);
    }

    this.show = show;
    this.resize = resize;
    this.pointerMove = pointerMove;
    this.pointerUp = pointerUp;
}