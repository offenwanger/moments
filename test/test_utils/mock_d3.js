import { createCanvas } from './mock_canvas.js';

let mJspreadsheet;

function MockElement(type) {
    let mAttrs = {};
    let mStyles = {};
    let mType = type;
    let mChildren = [];
    let mClasses = [];
    let mCallBacks = {};
    let mCanvas = null;

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
    this.select = function (selector) {
        if (selector instanceof MockElement) return selector;
        let stack = [...mChildren]
        while (stack.length > 0) {
            let found = stack.find(child => child.matches(selector));
            if (found) return found;
            stack = (stack.map(item => item.getChildren())).flat();
        }
        return { node: () => null, remove: () => null };
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
            this.innerHtml = html;
            return this;
        } else {
            return this.innerHtml;
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
        let canvasContainer = d3.select("#canvas-view-container").select('.canvas-container');
        let fdlContainer = d3.select("#fdl-view-container").select('.canvas-container');
        let tabsContainer = d3.select("#tabs-container").select('.canvas-container');
        if (canvasContainer.select('.interaction-canvas') == this || canvasContainer.select('.interface-canvas') == this) {
            // x and y are 0, that's fine
        } else if (fdlContainer.select('.interaction-canvas') == this || fdlContainer.select('.interface-canvas') == this) {
            x = fdlContainer.select('.interface-canvas').attr('width')
            y = tabsContainer.select('.interaction-canvas').attr('height')
        } else if (tabsContainer.select('.interaction-canvas') == this || tabsContainer.select('.view-canvas') == this) {
            x = tabsContainer.select('.interaction-canvas').attr('width')
            // y is 0
        } else {
            console.error("Unexpected!", this)
        }

        return { x, y, width: mAttrs['width'], height: mAttrs['height'] };
    }
    this.getBBox = function () { return { x: mAttrs['x'], y: mAttrs['y'], height: 50, width: 100 } }
    this.getCallbacks = () => mCallBacks;
    this.call = function (something, newZoomTransform) {
        transform = newZoomTransform;
    };
    this.getTransform = function () {
        return transform;
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
        delete this;
    }
    this.getChildren = () => mChildren;
}

export function mockD3() {
    let rootNode = new MockElement();
    rootNode.append('div').attr("id", "canvas-view-container").append(new MockElement().classed("canvas-container", true));
    rootNode.append('div').attr("id", "fdl-view-container").append(new MockElement().classed("canvas-container", true));
    rootNode.append('div').attr("id", "tabs-container").append(new MockElement().classed("canvas-container", true));
    rootNode.append('div').attr("id", "color-container");
    rootNode.append('div').attr("id", "interface-container").append(new MockElement().attr("id", "interface-svg"));
    rootNode.append('div').attr("id", "dashboard-container");
    rootNode.append('div').attr("id", "canvas-container");
    rootNode.append('div').attr("id", "tab-view-container");
    rootNode.append('div').attr("id", "canvas-container");
    rootNode.append('div').attr("id", "table-view-container");
    rootNode.append('div').attr("id", "input-box");
    rootNode.append('div').attr("id", "dropdown-container");

    let documentCallbacks = {};

    function select(selector) {
        if (selector.isDocument || selector.isWindow) {
            return { on: (event, callback) => documentCallbacks[event] = callback };
        } else {
            return rootNode.select(selector);
        }
    }

    this.select = select;
    this.getCallbacks = () => documentCallbacks;
}