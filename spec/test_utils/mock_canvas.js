import { createCanvas as createCan } from 'canvas';
import fs from 'fs';
import { logInfo } from '../../js/utils/log_util.js';
const RUN = Math.random();
let fileCount = 0;

export function createCanvas() {
    let canvas = createCan(1, 1);
    canvas.screenx = 0;
    canvas.screeny = 0;

    canvas.internalGetContext = canvas.getContext;

    canvas.getContext = function (type) {
        let context = canvas.internalGetContext(type);
        context.reset = function () {
            canvas.height = canvas.height;
            canvas.width = canvas.width;
            this.setTransform(createCan(1, 1).getContext("2d").getTransform());
        };
        return context;
    }

    canvas.eventListeners = {}
    canvas.addEventListener = function (event, eventListener) {
        canvas.eventListeners[event] = eventListener;
    }
    canvas.attrs = {}
    canvas.style = {}
    canvas.setAttribute = function (attr, val) {
        canvas.attrs[attr] = val
        if (attr == 'width') canvas.width = val;
        if (attr == 'height') canvas.height = val;
    }
    canvas.getAttribute = function (attr) { return canvas.attrs[attr] }
    canvas.toBlob = function (callback) { callback(canvas); };
    canvas.getBoundingClientRect = () => {
        return {
            x: canvas.screenx,
            y: canvas.screeny,
            width: canvas.width,
            height: canvas.height,
        }
    };

    canvas.console = {
        log: function () {
            if (!fs.existsSync(__dirname + '/dump')) {
                fs.mkdirSync(__dirname + '/dump');
            }
            let filename = __dirname + '/dump/debug' + RUN + "_" + (fileCount++) + '.png';
            logInfo("writing: " + filename);
            const out = fs.createWriteStream(filename);
            const stream = canvas.createPNGStream();
            let data;
            while (data = stream.read()) { out.write(data); }
        }
    }

    return canvas;
}