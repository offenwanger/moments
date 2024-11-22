import { createCanvas } from './mock_canvas.js';

let mJspreadsheet;

export function MockElement(type) {
    let mAttrs = {};
    let mStyles = {};
    let mType = type;
    let mChildren = [];
    let mClasses = [];
    let mCallBacks = {};
    let mCanvas = null;
    let mTransform = null
    let mInnerHtml = "";

    this.append = function (appendee) {
        if (typeof appendee == 'string') {
            let result = new MockElement(appendee);
            mChildren.push(result);
            return result;
        } else {
            mChildren.push(appendee);
            return appendee;
        }
    }
    this.appendChild = this.append;
    this.select = function (selector) {
        if (selector instanceof MockElement) return selector;
        if (selector == window) return selector;
        if (typeof selector == "object") return new MockElement('div');
        let stack = [...mChildren]
        while (stack.length > 0) {
            let found = stack.find(child => child.matches(selector));
            if (found) return found;
            stack = (stack.map(item => item.getChildren())).flat();
        }
        return null;
    }
    this.selectAll = function (selector) {
        if (selector == '*') {
            return { remove: () => { mChildren = [] } }
        } else if (selector == 'circle') {
            return {
                data: function () { return this; },
                attr: function () { return this; },
                exit: function () { return this; },
                enter: function () { return this; },
                remove: function () { return this; },
                append: function () { return this; },
                style: function () { return this; },
            }
        }
    }
    this.attr = function (att, val = null) {
        if (!att) {
            return mAttrs;
        }
        if (val !== null) {
            mAttrs[att] = val;
            if (mCanvas && (att == 'width' || att == 'height')) {
                mCanvas[att] = val;
            }
            return this;
        };
        return mAttrs[att];
    };
    this.text = function (val = null) {
        if (!val) {
            return mAttrs['text'];
        }
        if (val !== null) {
            mAttrs['text'] = val;
            return this;
        };
    };
    this.html = function (html) {
        if (html) {
            mInnerHtml = html;
            mChildren = [];
            return this;
        } else {
            return mInnerHtml;
        }
    }
    this.style = function (style, val = null) {
        if (val !== null) {
            mStyles[style] = val
            return this;
        };
        return mStyles[style];
    };
    this.property = function (property, val = null) {
        if (val !== null) {
            mAttrs[property] = val
            return this;
        };
        return mAttrs[property];
    };
    this.classed = function (name, isClass) {
        if (!name) return mClasses;
        if (isClass) {
            mClasses.indexOf(name) === -1 ? mClasses.push(name) : null;
        } else {
            mClasses = mClasses.filter(c => c != name);
        }
        return this;
    }
    this.on = function (event, callback) {
        mCallBacks[event] = callback;
        return this;
    }
    this.node = function () {
        // just put all the D3 and element mocks on the same object. Simpler that way.
        return this;
    }
    this.lower = function () {
        return this;
    }
    this.focus = function () {
        return this;
    }
    this.matches = function (selector) {
        if (selector == "*") {
            return true;
        } else if (selector[0] == "#") {
            return "#" + mAttrs["id"] == selector;
        } else if (selector[0] == ".") {
            return mClasses.some(c => "." + c == selector);
        } else {
            return mType == selector;
        }
    }
    this.getContext = function (type) {
        if (!mCanvas) {
            mCanvas = createCanvas()
            mCanvas.height = mAttrs['height'];
            mCanvas.width = mAttrs['width'];

        };
        return mCanvas.getContext(type);
    }
    this.getBoundingClientRect = function () {
        let x = 0, y = 0;
        return { x, y, width: mAttrs['width'] ? mAttrs['width'] : window.innerWidth, height: mAttrs['height'] ? mAttrs['height'] : window.innerHeight };
    }
    this.getBBox = function () { return { x: mAttrs['x'], y: mAttrs['y'], height: 50, width: 100 } }
    this.getCallbacks = () => mCallBacks;
    this.call = function (something, newZoomTransform) {
        mTransform = newZoomTransform;
        return this;
    };
    this.getTransform = function () {
        return mTransform;
    }
    this.console = {
        log: function () {
            if (mCanvas) {
                let c = mCanvas.console
                c.log();
            }
        }
    }
    this.remove = function () {
        // TODO: This is failing to actually delete things. 
        delete this;
    }
    this.getChildren = () => mChildren;
    this.addEventListener = function () { };
    this.setAttribute = function () {
        // called by THREE js, can be used to set the context.

    }
    this.show = function () {
        if (type != 'dialog') {
            throw new Error("show is not defined");
        }
        this.open = true;
    }
    this.close = function () {
        this.open = false;
        mCallBacks.close();
    }
}

export function mockD3() {
    this.root = new MockElement();
    this.root.append('div').attr("id", "content");

    let mZoomCallback = () => { };

    let documentCallbacks = {};

    function select(selector) {
        if (selector.isDocument || selector.isWindow) {
            return { on: (event, callback) => documentCallbacks[event] = callback };
        } else {
            return this.root.select(selector);
        }
    }

    this.scaleLinear = function () { return { domain: function () { return { range: function () { return this; } } } }; }
    this.axisBottom = function () { return {}; }
    this.zoom = function () {
        return {
            on: function (event, func) { mZoomCallback = func; return this; },
            extent: function () { return this; },
            scaleExtent: function () { return this; },
            translateExtent: function () { return this; },
        };
    }
    this.zoomIdentity = { rescaleX: function () { } }
    this.select = select;
    this.getCallbacks = () => documentCallbacks;
}