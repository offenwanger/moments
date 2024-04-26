
async function syncArray(arr, newItems, model, assetUtil, createFunction) {
    let arrIds = arr.map(i => i.getId());
    for (const item of newItems) {
        let idIndex = arrIds.findIndex(id => id == item.id);
        if (idIndex == -1) {
            // doesn't exist, make one
            arr.push(await createFunction(item));
        } else {
            // exists, remove from remove array.
            arrIds.splice(idIndex, 1);
        }
        await arr.find(i => i.getId() == item.id).update(item, model, assetUtil);
    }

    for (const id of arrIds) {
        let index = arr.findIndex(i => i.getId() == id);
        await arr[index].remove();
        arr.splice(index, 1);
    }
}

export const SceneUtil = {
    syncArray,
}