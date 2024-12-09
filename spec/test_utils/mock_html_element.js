export class HTMLElement {
    constructor() {
        this.attrs = {};
        this.style = {};
        this.children = [];
        this.eventListeners = {};
        this.x = 0;
        this.y = 0;
        this.height = 500;
        this.width = 500;
        this.addEventListener = function (event, listener) {
            this.eventListeners[event] = listener;
        };
        this.setAttribute = function (attr, val) {
            this.attrs[attr] = val;
            if (attr == 'width') this.width = val;
            if (attr == 'height') this.height = val;
        };
        this.getAttribute = function (attr) { return this.attrs[attr]; };
        this.appendChild = function (c) { this.children.push(c); };
        this.removeChild = function (c) { this.children = this.children.filter(child => child != c); };
        this.replaceChildren = function (cs = []) { this.children = cs; };
        this.getBoundingClientRect = function () {
            return {
                x: this.x,
                y: this.y,
                height: this.height,
                width: this.width,
            };
        };
    }
}

export class IFrameElement extends HTMLElement {
    constructor() {
        super();
        this.contentWindow = { document: { body: {} } };
        this.checkVisibility = () => true;
    }
}