
async function updateWrapperArray(wrappers, dataItems, model, assetUtil, createFunction) {
    let unusedOldWrappers = [...wrappers];
    for (const item of dataItems) {
        let wrapper = unusedOldWrappers.find(w => w.getId() == item.id);
        if (wrapper) {
            unusedOldWrappers.splice(unusedOldWrappers.indexOf(wrapper), 1);
        } else {
            wrapper = await createFunction(item);
            wrappers.push(wrapper);
        }
        await wrapper.update(item, model, assetUtil);
    }

    for (const unusedWrapper of unusedOldWrappers) {
        await unusedWrapper.remove();
        wrappers.splice(wrappers.indexOf(unusedWrapper), 1);
    }
}

export const SceneUtil = {
    updateWrapperArray,
}