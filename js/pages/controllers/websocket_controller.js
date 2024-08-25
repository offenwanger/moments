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

    function requestStories() {
        send({ type: ServerMessage.SHARED_STORIES })
    }

    const mWebSocket = new WebSocket(`ws://${window.location.hostname}:443/`);
    mWebSocket.onmessage = async (event) => {
        let data = JSON.parse(event.data);
        if (data.type == ServerMessage.SHARED_STORIES) {
            mSharedStoriesUpdatedCallback(data.stories);
        } else if (data.type == ServerMessage.CONNECT_TO_STORY) {
            await mStoryConnectCallback(data.story);
        } else if (data.type == ServerMessage.UPDATE_STORY) {
            await mStoryUpdateCallback(data.updates);
        } else if (data.type == ServerMessage.UPDATE_PARTICIPANT) {
            mParticipantUpdateCallback(data.id, data.head, data.handR, data.handL);
        } else if (data.type == ServerMessage.ERROR) {
            console.error(data.message);
        } else {
            console.error("Unhandled message: " + data);
        }
    };

    let mConnect = new Promise((resolve, reject) => {
        mWebSocket.addEventListener("open", () => {
            (console).log("Socket connected");
            resolve();
        });
    })

    async function shareStory(model, workspace) {
        let filenames = model.assets.map(a => a.filename);
        for (let filename of filenames) {
            await uploadAsset(model.id, filename, workspace)
        }
        model.annotations.forEach(a => a.json = null);
        send({
            type: ServerMessage.START_SHARE,
            story: model,
        })
        mConnectedToStory = true;
    }

    function connectToStory(storyId) {
        send({ type: ServerMessage.CONNECT_TO_STORY, storyId })
        mConnectedToStory = true;
    }

    function updateStory(updates) {
        if (!mConnectedToStory) return;
        send({ type: ServerMessage.UPDATE_STORY, updates })
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
        send({ type: ServerMessage.UPDATE_PARTICIPANT, head, handR, handL })
    }

    function send(data) {
        mWebSocket.send(JSON.stringify(data))
    }

    this.requestStories = requestStories;
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