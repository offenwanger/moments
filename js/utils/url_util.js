function setParams(params) {
    const url = new URL(window.location.href);
    for (let name of Object.keys(params)) {
        let value = params[name];
        if (value == null) {
            url.searchParams.delete(name);
        } else {
            url.searchParams.set(name, value);
        }
    }
    if (window.location.href != url.href) {
        window.history.pushState(null, null, url);
    }
}

function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function reloadPage() {
    window.location.reload();
}

export const UrlUtil = {
    setParams,
    getParam,
    reloadPage,
}
