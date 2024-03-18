export function mockDB() {
    let data = {};

    function makeReq(result) {
        return new Proxy({}, {
            get: function (obj, name) {
                if (name == 'result') {
                    return result;
                } else {
                    console.error(name + " unimplimented")
                }
            },
            set: function (obj, name, value) {
                if (name == 'onsuccess') {
                    value()
                } else if (name == 'onupgradeneeded') {
                    // do nothing
                } else if (name == 'onerror') {

                } else {
                    console.error(name + " unimplimented")
                }
                return true;
            },
        });
    }

    this.transaction = ([storeName], type) => {
        return {
            objectStore: () => {
                return {
                    get: (key) => { return makeReq(data[key]) },
                    put: (value, key) => { data[key] = value; return makeReq(); },
                    delete: (key) => { delete data[key]; return makeReq(); },
                    clear: () => { data = {}; return makeReq(); },
                };
            }
        };
    }
}

export function mockIndexedDB() {
    this.open = function () {
        return new Proxy({}, {
            get: function (obj, name) {
                if (name == 'result') {
                    return new mockDB();
                } else {
                    console.error(name + " unimplimented")
                }
            },
            set: function (obj, name, value) {
                if (name == 'onsuccess') {
                    value()
                } else if (name == 'onupgradeneeded') {
                    // do nothing
                } else if (name == 'onerror') {

                } else {
                    console.error(name + " unimplimented")
                }
                return true;
            },
        });
    }
}