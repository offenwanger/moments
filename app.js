import bodyParser from 'body-parser';
import { spawn, spawnSync } from 'child_process';
import express from 'express';
import * as fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
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
app.listen(port, '0.0.0.0');

try {
    (console).log('Spawning ngrok. Public URL: https://careful-loosely-moose.ngrok-free.app')
    spawnSync(`ngrok config add-authtoken ${TOKEN}`);
    const ngrok = spawn("ngrok", ["http", "--domain", "careful-loosely-moose.ngrok-free.app", port]);
    ngrok.stdout.on('data', function (data) { console.log(data.toString()); });
    ngrok.stderr.on('data', function (data) { console.error(data.toString()) })
    ngrok.on("error", function (error) { console.error(error) })
} catch (e) { console.error(e); }

const sockserver = new WebSocketServer({ port: 443 });
(console).log("Socket Server ready.")
sockserver.on('connection', client => {
    client.clientId = nextClientId++;
    (console).log('New client connected!')
    send(client, { type: ServerMessage.SHARED_STORIES, sharedStories });
    client.on('close', () => disconnect(client));
    client.on('message', data => {
        try {
            data = JSON.parse(data);
            if (data.type == ServerMessage.START_SHARE) {
                startStory(client, data.story);
            } else if (data.type == ServerMessage.SHARED_STORIES) {
                send(client, {
                    type: ServerMessage.SHARED_STORIES,
                    stories: formatStoriesData(),
                });
            } else if (data.type == ServerMessage.UPDATE_STORY) {
                let story = sharedStories.find(s => s.participants.includes(client));
                if (!story) { console.error("No story found for story update!"); return; }
                console.error("TODO: finish me!")
            } else if (data.type == ServerMessage.UPDATE_PARTICIPANT) {
                let story = sharedStories.find(s => s.participants.includes(client));
                if (!story) { console.error("No story found for participant update!"); return; }
                for (let p of story.participants) {
                    if (p != client) {
                        data.id = p.clientId;
                        send(p, data);
                    }
                }
            } else if (data.type == ServerMessage.CONNECT_TO_STORY) {
                let storyId = data.storyId;
                let share = sharedStories.find(s => s.story.id == storyId);
                if (!share) {
                    send(client, {
                        type: ServerMessage.ERROR,
                        message: "Invalid story id" + storyId,
                    });
                    return;
                }
                send(client, {
                    type: ServerMessage.CONNECT_TO_STORY,
                    story: share.story,
                })
                share.participants.push(client);
            } else {
                console.error("Unhandled message: " + data);
            }
        } catch (e) {
            console.error(e);
            try {
                send(client, {
                    type: ServerMessage.ERROR,
                    message: e.message,
                })
            } catch (e2) {
                console.error(e2);
            }
        }
    })
    client.onerror = function (e) {
        (console).log('websocket error', e)
    }
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
        if (closed) sendAll({
            type: ServerMessage.SHARED_STORIES,
            stories: formatStoriesData(),
        });
    } catch (error) {
        console.error(error);
    }
}

function startStory(client, story) {
    try {
        sharedStories.push({
            participants: [client],
            story
        });
        sendAll({
            type: ServerMessage.SHARED_STORIES,
            stories: formatStoriesData(),
        });
        (console).log('New Story shared: ' + story.id);
    } catch (e) {
        console.error(e);
    }
}

function formatStoriesData() {
    return sharedStories.map(d => {
        return {
            id: d.story.id,
            name: d.story.name
        }
    });
}

function send(client, data) {
    client.send(JSON.stringify(data));
}

function sendAll(data) {
    sockserver.clients.forEach(client => {
        client.send(JSON.stringify(data));
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