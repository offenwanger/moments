function updateParams(params) {
    const url = getUrl(params);
    if (window.location.href != url.href) {
        window.history.replaceState(null, null, url);
    }
}

function navigate(params) {
    const url = getUrl(params);
    window.location.href = url.href;
}

function getUrl(params) {
    const url = new URL(window.location.href);
    for (let name of Object.keys(params)) {
        let value = params[name];
        if (value == null) {
            url.searchParams.delete(name);
        } else {
            url.searchParams.set(name, value);
        }
    }
    return url;
}

function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

export const UrlUtil = {
    updateParams,
    navigate,
    getParam,
}
