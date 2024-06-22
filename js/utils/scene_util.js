
async function syncArray(arr, newItems, model, assetUtil, createFunction) {
    let removeIds = arr.map(i => i.getId());
    for (const item of newItems) {
        let idIndex = removeIds.findIndex(id => id == item.id);
        if (idIndex == -1) {
            // doesn't exist, make one
            arr.push(await createFunction(item));
            idIndex = arr.length - 1
        } else {
            // exists, remove from remove array.
            removeIds.splice(idIndex, 1);
        }
        await arr[idIndex].update(item, model, assetUtil);
    }

    for (const id of removeIds) {
        let index = arr.findIndex(i => i.getId() == id);
        await arr[index].remove();
        arr.splice(index, 1);
    }
}

export const SceneUtil = {
    syncArray,
}