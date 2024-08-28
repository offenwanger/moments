import bodyParser from 'body-parser';
import { spawn, spawnSync } from 'child_process';
import express from 'express';
import * as fs from 'fs';
import http from 'http';
import { dirname } from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { ServerMessage } from './js/constants.js';
import { TOKEN } from './token.js';

let sharedStories = [];
let nextClientId = 0;

const LOCAL_IMPORT = ` 
<script type="importmap">
    {
        "imports": {
            "three": "/node_modules/three/build/three.module.js",
            "three-mesh-ui": "/node_modules/three-mesh-ui/build/three-mesh-ui.module.js",
            "three/addons/": "/node_modules/three/examples/jsm/"
        }
    }
</script>
`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_FOLDER = __dirname + '/uploads/'
if (!fs.existsSync(UPLOAD_FOLDER)) { fs.mkdirSync(UPLOAD_FOLDER); }

const app = express();
app.use(bodyParser.json({ limit: '1024mb' }))
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
    sendFileReplaceImportMap(res, "index.html");
});
// Everything in the local folder can be accessed via /filename
app.use('/', express.static(__dirname + '/'));
app.post('/upload', async (req, res) => {
    try {
        let data = req.body;
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

(console).log("************* Starting the server *************");
const port = 8000;
// Start the application
const server = http.createServer(app);
server.listen(port);

//////////////// ngrok /////////////////
try {
    (console).log('Spawning ngrok. Public URL: https://careful-loosely-moose.ngrok-free.app')
    spawnSync(`ngrok config add-authtoken ${TOKEN}`);
    const ngrok = spawn("ngrok", ["http", "--domain", "careful-loosely-moose.ngrok-free.app", port]);
    ngrok.stdout.on('data', function (data) { console.log(data.toString()); });
    ngrok.stderr.on('data', function (data) { console.error(data.toString()) })
    ngrok.on("error", function (error) { console.error(error) })
} catch (e) { console.error(e); }


///////////// websockets ///////////////
const sockserver = new Server(server);
(console).log("Socket Server ready.")
sockserver.on('connection', client => {
    client.clientId = nextClientId++;
    (console).log('New client connected!')
    client.emit(ServerMessage.SHARED_STORIES, getSharedStoryData())

    client.on('disconnect', () => disconnect(client));

    client.on(ServerMessage.START_SHARE, story => {
        sharedStories.push({ participants: [client], story });
        sockserver.emit(ServerMessage.SHARED_STORIES, getSharedStoryData());

        (console).log('New Story shared: ' + story.id);
    });

    client.on(ServerMessage.UPDATE_STORY, data => {
        // sending story update
        let story = sharedStories.find(s => s.participants.includes(client));
        if (!story) { console.error("No story found for story update!"); return; }

        console.log("Update the stored story!")

        for (let p of story.participants) {
            if (p != client) p.emit(ServerMessage.UPDATE_STORY, data);
        }
    });

    client.on(ServerMessage.UPDATE_PARTICIPANT, data => {
        // sending position update
        let story = sharedStories.find(s => s.participants.includes(client));
        if (!story) { console.error("No story found for participant update!"); return; }

        data.id = client.clientId;
        for (let p of story.participants) {
            if (p != client) p.emit(ServerMessage.UPDATE_PARTICIPANT, data);
        }
    });

    client.on(ServerMessage.CONNECT_TO_STORY, storyId => {
        // requesting story connection
        let share = sharedStories.find(s => s.story.id == storyId);
        if (!share) { client.emit(ServerMessage.ERROR, "Invalid story id" + storyId); return; }

        client.emit(ServerMessage.CONNECT_TO_STORY, share.story);
        share.participants.push(client);
    });
})

function sendFileReplaceImportMap(res, filename) {
    let html = fs.readFileSync(filename, 'utf8');
    let preStuff = html.split('<script type="importmap">')[0]
    let endStuff = html.split('</script>').slice(1).join('</script>') // this will be fine since import map has to be the first script.
    html = preStuff + LOCAL_IMPORT + endStuff;
    res.end(html);
}

function disconnect(client) {
    try {
        sharedStories.forEach(s => s.participants = s.participants.filter(c => c != client));
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
    return sharedStories.map(d => { return { id: d.story.id, name: d.story.name } });
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