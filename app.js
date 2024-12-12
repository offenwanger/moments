import bodyParser from 'body-parser';
import { spawn, spawnSync } from 'child_process';
import express from 'express';
import * as fs from 'fs';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { ServerMessage } from './js/constants.js';
import { Data } from './js/data.js';
import { ModelController } from './js/pages/controllers/model_controller.js';
import { logInfo } from './js/utils/log_util.js';
import { TOKEN } from './token.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_FOLDER = __dirname + '/uploads/'
if (!fs.existsSync(UPLOAD_FOLDER)) { fs.mkdirSync(UPLOAD_FOLDER); }

const app = express();
app.use(bodyParser.json({ limit: '1024mb' }))
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/index.html'));
});
// Everything in the local folder can be accessed via /filename
app.use('/', express.static(__dirname + '/'));
app.post('/upload', async (req, res) => {
    try {
        let data = req.body;
        logInfo("Received upload: " + data.filename);

        if (data.json) {
            data.filename = "story.json"
            data.url = JSON.stringify(data.json);
        }

        if (!data.storyId || !data.filename || !data.url) { console.error("Malformed request", data); return; }

        let outFoldername = data.storyId;
        await createFolder(outFoldername);
        let outFile = outFoldername + "/" + data.filename;
        await writeFile(outFile, data.url);
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
});

logInfo("************* Starting the server *************");
const port = 8000;
// Start the application
const server = http.createServer(app);
server.listen(port);

//////////////// ngrok /////////////////
try {
    logInfo('Spawning ngrok. Public URL: https://careful-loosely-moose.ngrok-free.app')
    spawnSync(`ngrok config add-authtoken ${TOKEN}`);
    const ngrok = spawn("ngrok", ["http", "--domain", "careful-loosely-moose.ngrok-free.app", port]);
    ngrok.stdout.on('data', function (data) { logInfo(data.toString()); });
    ngrok.stderr.on('data', function (data) { console.error(data.toString()) })
    ngrok.on("error", function (error) { console.error(error) })
} catch (e) { console.error(e); }


///////////// websockets ///////////////
const sockserver = new Server(server, { pingTimeout: 30000, maxHttpBufferSize: 1e8, });
const clientMap = {};
let sharedStories = [];
let nextClientId = 1;

logInfo("Socket Server ready.")

sockserver.on('connection', client => {
    logInfo('Incoming connection!', client.recovered, client.id)

    client.emit(ServerMessage.SHARED_STORIES, getSharedStoryData());

    client.on('disconnect', (reason) => disconnect(client, reason));

    client.on(ServerMessage.CONNECTION_ID, id => {
        if (!id) {
            client.clientId = Date.now() + "_" + nextClientId++;
            client.emit(ServerMessage.CONNECTION_ID, client.clientId);
            logInfo(client.clientId + ' connected!')
        } else {
            // client is reconnecting, possibly after a server reboot.
            client.clientId = id;
            logInfo(client.clientId + ' reconnected!');
        }
        clientMap[client.clientId] = client;
    })

    client.on(ServerMessage.START_SHARE, story => {
        if (!client.clientId) { console.error('Invalid init state!'); return; }

        try {
            sharedStories.push({
                host: client.clientId,
                participants: [client.clientId],
                storyController: new ModelController(Data.StoryModel.fromObject(story))
            });
            sockserver.emit(ServerMessage.SHARED_STORIES, getSharedStoryData());
            client.emit(ServerMessage.START_SHARE, { shared: true });

            logInfo('New Story shared: ' + story.id);
        } catch (error) {
            console.error(error);
        }
    });

    client.on(ServerMessage.UPDATE_STORY, updates => {
        if (!client.clientId) { console.error('Invalid init state!'); return; }

        // sending story update
        let story = sharedStories.find(s => s.participants.includes(client.clientId));
        if (!story) { console.error("No story found for story update!"); return; }

        story.storyController.applyUpdates(updates);

        for (let pId of story.participants) {
            if (pId != client.clientId) emitToId(pId, ServerMessage.UPDATE_STORY, updates);
        }
    });

    client.on(ServerMessage.NEW_ASSET, data => {
        if (!client.clientId) { console.error('Invalid init state!'); return; }
        // sending new asset
        let story = sharedStories.find(s => s.participants.includes(client.clientId));
        if (!story) { console.error("No story found to send asset to!"); return; }
        logInfo("Received file " + data.name + " from " + client.id);
        emitToId(story.host, ServerMessage.NEW_ASSET, data)
    });

    client.on(ServerMessage.UPDATE_ASSET, data => {
        if (!client.clientId) { console.error('Invalid init state!'); return; }
        // sending asset update
        let story = sharedStories.find(s => s.participants.includes(client.clientId));
        if (!story) { console.error("No story found to updated asset to!"); return; }
        logInfo("Received file " + data.name + " from " + client.id);
        emitToId(story.host, ServerMessage.UPDATE_ASSET, data)
    });

    client.on(ServerMessage.CREATE_MOMENT, data => {
        if (!client.clientId) { console.error('Invalid init state!'); return; }
        // sending asset update
        let story = sharedStories.find(s => s.participants.includes(client.clientId));
        if (!story) { console.error("No story found to updated asset to!"); return; }
        emitToId(story.host, ServerMessage.CREATE_MOMENT, data)
    });

    client.on(ServerMessage.UPDATE_PARTICIPANT, data => {
        if (!client.clientId) { console.error('Invalid init state!'); return; }

        // sending position update
        let story = sharedStories.find(s => s.participants.includes(client.clientId));
        if (!story) { console.error("No story found for participant update!"); return; }

        data.id = client.clientId;
        for (let pId of story.participants) {
            if (pId != client.clientId) emitToId(pId, ServerMessage.UPDATE_PARTICIPANT, data);
        }
    });

    client.on(ServerMessage.CONNECT_TO_STORY, storyId => {
        if (!client.clientId) { console.error('Invalid init state!'); return; }

        // requesting story connection
        let share = sharedStories.find(s => s.storyController.getModel().id == storyId);
        if (!share) { client.emit(ServerMessage.ERROR, "Invalid story id" + storyId); return; }

        client.emit(ServerMessage.CONNECT_TO_STORY, share.storyController.getModel());
        share.participants.push(client.clientId);
        logInfo("Client " + client.clientId + " connected to " + storyId);
    });
})

function emitToId(id, message, data) {
    if (!clientMap[id]) { console.error("No connection for " + id); return; }
    clientMap[id].emit(message, data);
}

function disconnect(client, reason) {
    if (!client) { console.error("Bad client: " + client); }
    if (!client.clientId) { console.error('Invalid init state!'); return; }
    try {
        logInfo('Client ' + client.clientId + " disconnected because " + reason)
        clientMap[client.clientId] = null;

        let story = sharedStories.find(s => s.participants.includes(client.clientId));
        if (story) {
            for (let pId of story.participants) {
                if (pId != client.clientId) emitToId(pId, ServerMessage.UPDATE_PARTICIPANT, { id: client.clientId });
            }
        }

        sharedStories.forEach(s => s.participants = s.participants.filter(c => c != client.clientId));
        let closed = false;
        sharedStories = sharedStories.filter(s => {
            if (s.participants.length == 0) {
                closed = true;
                return false;
            }
            return true;
        })
        if (closed) sockserver.emit(ServerMessage.SHARED_STORIES, getSharedStoryData())
    } catch (error) {
        console.error(error);
    }
}

function getSharedStoryData() {
    return sharedStories.map(d => {
        let story = d.storyController.getModel();
        return { id: story.id, name: story.name }
    });
}

async function writeFile(filename, contents) {
    try {
        fs.writeFileSync(UPLOAD_FOLDER + filename, contents, err => err ? console.error(err) : null);
    } catch (e) {
        console.error(e);
    }
}

async function readFileAsString(filename) {
    try {
        return fs.readFileSync(UPLOAD_FOLDER + filename, 'utf8');
    } catch (e) {
        console.error(e);
        return "";
    }
}

async function deleteFile(filename) {
    try {
        fs.unlinkSync(UPLOAD_FOLDER + filename, 'utf8');
    } catch (e) {
        console.error(e);
    }
}

async function createFolder(folderName) {
    try {
        if (!fs.existsSync(UPLOAD_FOLDER + folderName)) {
            fs.mkdirSync(UPLOAD_FOLDER + folderName);
        }
    } catch (e) {
        console.error(e);
    }
}

async function deleteFolder(folderName) {
    try {
        fs.rmSync(UPLOAD_FOLDER + folderName, { recursive: true, force: true });
    } catch (e) {
        console.error(e);
    }
}