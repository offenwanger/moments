export function HTMLElement() {
    this.style = {};
    this.eventListerners = {}
    this.addEventListener = function (event, listener) {
        this.eventListerners[event] = listener;
    }
} 