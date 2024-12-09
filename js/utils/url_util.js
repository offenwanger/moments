function setParam(name, value = null) {
    const url = new URL(window.location.href);
    if (value == null) {
        url.searchParams.delete(name);
    } else {
        url.searchParams.set(name, value);
    }
    window.history.replaceState(null, null, url);
}

function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function reloadPage() {
    window.location.reload();
}

export const UrlUtil = {
    setParam,
    getParam,
    reloadPage,
}
