import { ServerMessage } from "../../constants.js";
import { logInfo } from "../../utils/log_util.js";

export function WebsocketController() {
    /**
     * Multiplayer design
     * P1 starts sharing. 
     * PN opens the front page, sees a list of shared servers. 
     * PN connects to a server. Loads into veiwer mode. 
     * PN can see P1 and what they are doing (moving stuff around, adding things, etc.)
     * P1 can see PN as a floating looking head (with hands if they have them.)
     * 
     * Required messages
     * P1 -> PN
     *  - the model -> includes image assets
     *  - the GLBs
     *  - Incremental changes
     *  - Head/Hands positions
     * PN -> PN Head/hands positions
     * 
     * Idea: Refactor the system to have the 3 database changes: Update, Insert, Delete, then we can stream those three changes. 
     * We can then stream these changes. 
     * There's also Import... 
     * When user shares, creates a folder on the server, uploads the models, server stores all the models for the story. 
     */

    let mConnectedToStory = false;

    let mSharedStoriesUpdatedCallback = () => { }
    let mStoryConnectCallback = async () => { }
    let mStoryUpdateCallback = async () => { }
    let mNewAssetCallback = async () => { }
    let mUpdateAssetCallback = async () => { }
    let mCreateMomentCallback = async () => { }
    let mParticipantUpdateCallback = () => { }

    const mWebSocket = io();
    let mSocketId = null;

    mWebSocket.on("connect", () => {
        mWebSocket.emit(ServerMessage.CONNECTION_ID, mSocketId);
    });

    mWebSocket.on("disconnect", (reason) => {
        logInfo("Disconnecting because: " + reason);
    });

    mWebSocket.on("error", (error) => {
        console.error(error);
    });

    mWebSocket.on(ServerMessage.CONNECTION_ID, id => {
        logInfo("Received new id: " + id);
        mSocketId = id;
    })


    mWebSocket.on(ServerMessage.SHARED_STORIES, (stories) => {
        mSharedStoriesUpdatedCallback(stories);
    });

    mWebSocket.on(ServerMessage.CONNECT_TO_STORY, async (story) => {
        mConnectedToStory = true;
        await mStoryConnectCallback(story);
    });

    mWebSocket.on(ServerMessage.UPDATE_STORY, async (updates) => {
        await mStoryUpdateCallback(updates);
    });

    mWebSocket.on(ServerMessage.NEW_ASSET, async (data) => {
        await mNewAssetCallback(data.id, data.name, data.buffer, data.type);
    });

    mWebSocket.on(ServerMessage.UPDATE_ASSET, async (data) => {
        await mUpdateAssetCallback(data.id, data.name, data.buffer);
    });

    mWebSocket.on(ServerMessage.CREATE_MOMENT, async (data) => {
        await mCreateMomentCallback();
    });

    mWebSocket.on(ServerMessage.UPDATE_PARTICIPANT, (data) => {
        mParticipantUpdateCallback(data.id, data.head, data.handR, data.handL, data.momentId);
    });

    mWebSocket.on(ServerMessage.ERROR, (message) => {
        console.error(message);
    });

    mWebSocket.on(ServerMessage.START_SHARE, () => {
        mConnectedToStory = true;
        logInfo("Sharing started successfully.")
    })

    async function shareStory(model, workspace) {
        try {
            // This is not a good way to do this.
            // WE should really only upload when a thing is requested.
            let filenames = model.assets.map(a => a.filename);
            for (let filename of filenames) {
                await uploadAsset(model.id, filename, workspace)
            }
            logInfo("Files uploaded.")
            mWebSocket.emit(ServerMessage.START_SHARE, model);
        } catch (error) {
            console.error(error);
        }
    }

    function connectToStory(storyId) {
        mWebSocket.emit(ServerMessage.CONNECT_TO_STORY, storyId);
        setTimeout(() => {
            if (!mConnectedToStory) {
                console.error("Connection to " + storyId + " failed, retrying.");
                mWebSocket.emit(ServerMessage.CONNECT_TO_STORY, storyId);
            };
            setTimeout(() => {
                console.error("Connection to " + storyId + " failed.");
            }, 1000)
        }, 1000)
    }

    function updateStory(updates) {
        if (!mConnectedToStory) return;
        mWebSocket.emit(ServerMessage.UPDATE_STORY, updates);
    }

    async function uploadAsset(storyId, filename, workspace) {
        let url = await workspace.getAssetAsDataURI(filename);
        logInfo("Uploading " + filename);
        await fetch('/upload', {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                storyId,
                filename,
                url,
            })
        });
        logInfo(filename + " uploaded.");
    }

    async function newAsset(id, file, type) {
        let buffer = await file.arrayBuffer();
        mWebSocket.emit(ServerMessage.NEW_ASSET, { id, name: file.name, type, buffer })
    }

    async function updateAsset(id, file) {
        let buffer = await file.arrayBuffer();
        mWebSocket.emit(ServerMessage.UPDATE_ASSET, { id, name: file.name, buffer })
    }

    function updateParticipant(head, handR = null, handL = null, momentId = null) {
        if (!mConnectedToStory) return;
        mWebSocket.emit(ServerMessage.UPDATE_PARTICIPANT, { head, handR, handL, momentId })
    }

    function createMoment() {
        mWebSocket.emit(ServerMessage.CREATE_MOMENT, {})
    }

    this.shareStory = shareStory;
    this.uploadAsset = uploadAsset;
    this.connectToStory = connectToStory;
    this.updateStory = updateStory;
    this.updateParticipant = updateParticipant;
    this.newAsset = newAsset;
    this.updateAsset = updateAsset;
    this.createMoment = createMoment;
    this.onSharedStories = (func) => mSharedStoriesUpdatedCallback = func;
    this.onStoryConnect = (func) => mStoryConnectCallback = func;
    this.onStoryUpdate = (func) => mStoryUpdateCallback = func;
    this.onNewAsset = (func) => mNewAssetCallback = func;
    this.onUpdateAsset = (func) => mUpdateAssetCallback = func;
    this.onCreateMoment = (func) => mCreateMomentCallback = func;
    this.onParticipantUpdate = (func) => mParticipantUpdateCallback = func;
}