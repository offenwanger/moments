import express from 'express';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs'

const IMPORT_TEMPLATE = ` 
<script type="importmap">
    {
        "imports": {
            "three": "/node_modules/three/build/three.module.js",
            "three-mesh-ui": "/node_modules/three-mesh-ui/build/three-mesh-ui.module.js",
            "three/addons/": "/node_modules/three/examples/jsm/"
        }
    }
</script>
`

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

(console).log("************* Starting the server *************")

const port = 8000;

app.get('/editor.html', function (req, res) {
    sendFileReplaceImportMap(res, "editor.html");
});

app.get('/viewer.html', function (req, res) {
    sendFileReplaceImportMap(res, "viewer.html");
});

function sendFileReplaceImportMap(res, filename) {
    let html = fs.readFileSync(filename, 'utf8');
    let preStuff = html.split('<script type="importmap">')[0]
    let endStuff = html.split('</script>').slice(1).join('</script>') // this will be fine since import map has to be the first script.
    html = preStuff + IMPORT_TEMPLATE + endStuff;
    res.end(html);
}

// Everything in the local folder can be accessed via /filename
app.use('/', express.static(__dirname + '/'));

// Start the application
app.listen(port);
