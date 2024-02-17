import * as Data from '../data_structs.js';

export let IdUtil = function () {
    let idCounter = 0;
    let lastGet = Date.now();
    function getUniqueId(classDefinition) {
        // reset the counter when we aren't getting all at the same time.
        if (Date.now() > lastGet) { idCounter = 0; }
        lastGet = Date.now();

        return classDefinition.name + "_" + Date.now() + "_" + idCounter++;
    }

    function getClass(id) {
        if (typeof id != "string") {
            console.error("invalid id", id);
            return false;
        }
        let className = id.split("_")[0];
        return Data[className] ? Data[className] : false;
    }


    return {
        getUniqueId,
        getClass,
    }
}();