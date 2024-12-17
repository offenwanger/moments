
async function updateWrapperArray(wrappers, dataItems, model, assetUtil, createFunction) {
    for (let i = 0; i < dataItems.length; i++) {
        if (!wrappers[i]) {
            wrappers.push(await createFunction(dataItems[i]));
        }
        await wrappers[i].update(dataItems[i], model, assetUtil);
    }

    let deleteWrappers = wrappers.splice(dataItems.length)
    for (let wrapper of deleteWrappers) {
        await wrapper.remove();
    }
}

export const SceneUtil = {
    updateWrapperArray,
}