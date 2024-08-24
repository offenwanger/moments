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

    const webSocket = new WebSocket(`ws://${window.location.hostname}:443/`);
    webSocket.onmessage = (event) => {
        (console).log(event);
    };

    let mConnect = new Promise((resolve, reject) => {
        webSocket.addEventListener("open", () => {
            (console).log("Socket connected");
            resolve();
        });
    })

    async function startSharing() {

    }

    async function message(value) {
        await mConnect;
        webSocket.send(value)
    }

    this.message = message;
}