import { ServerMessage } from "../../constants.js";

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
    let mParticipantUpdateCallback = () => { }

    const mWebSocket = io();

    mWebSocket.on(ServerMessage.SHARED_STORIES, (stories) => {
        mSharedStoriesUpdatedCallback(stories);
    });

    mWebSocket.on(ServerMessage.CONNECT_TO_STORY, async (story) => {
        await mStoryConnectCallback(story);
    });

    mWebSocket.on(ServerMessage.UPDATE_STORY, async (updates) => {
        await mStoryUpdateCallback(updates);
    });

    mWebSocket.on(ServerMessage.UPDATE_PARTICIPANT, (data) => {
        mParticipantUpdateCallback(data.id, data.head, data.handR, data.handL);
    });

    mWebSocket.on(ServerMessage.ERROR, (message) => {
        console.error(message);
    });

    async function shareStory(model, workspace) {
        let filenames = model.assets.map(a => a.filename);
        for (let filename of filenames) {
            await uploadAsset(model.id, filename, workspace)
        }
        model.annotations.forEach(a => a.json = null);
        mWebSocket.emit(ServerMessage.START_SHARE, model);
        mConnectedToStory = true;
    }

    function connectToStory(storyId) {
        mWebSocket.emit(ServerMessage.CONNECT_TO_STORY, storyId)
        mConnectedToStory = true;
    }

    function updateStory(updates) {
        if (!mConnectedToStory) return;
        mWebSocket.emit(ServerMessage.UPDATE_STORY, updates);
    }

    async function uploadAsset(storyId, filename, workspace) {
        let url = await workspace.getAssetAsURL(filename);
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
    }

    function updateParticipant(head, handR = null, handL = null) {
        if (!mConnectedToStory) return;
        mWebSocket.emit(ServerMessage.UPDATE_PARTICIPANT, { head, handR, handL })
    }

    this.shareStory = shareStory;
    this.uploadAsset = uploadAsset;
    this.connectToStory = connectToStory;
    this.updateStory = updateStory;
    this.updateParticipant = updateParticipant;
    this.onSharedStories = (func) => mSharedStoriesUpdatedCallback = func;
    this.onStoryConnect = (func) => mStoryConnectCallback = func;
    this.onStoryUpdate = (func) => mStoryUpdateCallback = func;
    this.onParticipantUpdate = (func) => mParticipantUpdateCallback = func;
}