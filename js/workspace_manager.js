import { ASSET_FOLDER, STORY_JSON_FILE, WORKSPACE_DATA_FILE } from "./constants.js";
import { Data } from "./data.js";
import { FileUtil } from "./utils/file_util.js";

export function WorkspaceManager(folderHandle) {
    let mWorkspaceData = null;
    let mFolderHandle = folderHandle;

    let initialized = (async () => {
        if (await mFolderHandle.queryPermission({ mode: 'readwrite' }) !== 'granted') {
            throw Error("Invalid workspace folder, permission not granted");
        }

        try {
            mWorkspaceData = await FileUtil.getJSONFromFile(mFolderHandle, WORKSPACE_DATA_FILE);
        } catch (error) {
            if (error.message.includes("A requested file or directory could not be found at the time an operation was processed")) {
                // it's just new, no need to panic.
            } else {
                console.error(error.stack);
                // panic.
            }
        }

        if (!mWorkspaceData) {
            mWorkspaceData = {
                storyIds: []
            };
        }
    })();

    async function getStoryList() {
        await initialized;

        let stories = [];
        for (const storyId of mWorkspaceData.storyIds) {
            try {
                let storyObj = await FileUtil.getJSONFromFile(await mFolderHandle.getDirectoryHandle(storyId), STORY_JSON_FILE)
                if (storyObj && storyObj.id && storyObj.name) {
                    stories.push({ id: storyObj.id, name: storyObj.name });
                } else { console.error("Couldn't get name for story", storyId); }
            } catch (error) {
                console.error(error);
            }
        }
        return stories;
    }

    async function newStory(id) {
        await initialized;

        if (!id || typeof id != "string") { console.error("invalid id!", id); return; }
        mWorkspaceData.storyIds.push(id);
        await mFolderHandle.getDirectoryHandle(id, { create: true })
        await updateWorkspaceData();
    }

    async function updateStory(model) {
        await initialized;
        await FileUtil.writeFile(await mFolderHandle.getDirectoryHandle(model.id), STORY_JSON_FILE, JSON.stringify(model))
    }

    async function getStory(storyId) {
        let storyObj = await FileUtil.getJSONFromFile(await mFolderHandle.getDirectoryHandle(storyId), STORY_JSON_FILE);
        if (!storyObj) { console.error("Failed to load story object for id " + storyId); return null; }
        let model = Data.StoryModel.fromObject(storyObj);
        return model;
    }

    async function storeAsset(filehandle) {
        let oldFilename = filehandle.name;
        let nameBreakdown = oldFilename.split(".");
        nameBreakdown.splice(nameBreakdown.length - 1, 0, "" + Date.now());
        let file = await filehandle.getFile();
        let arrayBuffer = await file.arrayBuffer();
        let assetFolder = await mFolderHandle.getDirectoryHandle(ASSET_FOLDER, { create: true });
        let newName = nameBreakdown.join('.');
        await FileUtil.writeFile(assetFolder, newName, arrayBuffer);
        return newName;
    }

    async function getAssetAsDataURI(filename) {
        let assetFolder = await mFolderHandle.getDirectoryHandle(ASSET_FOLDER, { create: true });
        let uri = await FileUtil.getDataUriFromFile(assetFolder, filename);
        return uri;
    }

    async function updateWorkspaceData() {
        await initialized;

        let workspaceFileHandle = await mFolderHandle.getFileHandle(WORKSPACE_DATA_FILE, { create: true });
        let workspaceFile = await workspaceFileHandle.createWritable();
        await workspaceFile.write(JSON.stringify(mWorkspaceData));
        await workspaceFile.close();
    }

    async function packageStory(storyId) {
        try {
            let storyObj = await FileUtil.getJSONFromFile(await mFolderHandle.getDirectoryHandle(storyId), STORY_JSON_FILE)
            let model = Data.StoryModel.fromObject(storyObj);
            let assetFolder = await mFolderHandle.getDirectoryHandle(ASSET_FOLDER, { create: true })
            FileUtil.pacakgeToZip(model, assetFolder);
        } catch (error) {
            console.error(error);
        }
    }

    async function loadStory(file) {
        try {
            let model = await FileUtil.getModelFromZip(file);
            model = model.clone();
            let assetFolder = await mFolderHandle.getDirectoryHandle(ASSET_FOLDER, { create: true })
            await FileUtil.unpackageAssetsFromZip(file, assetFolder);
            await newStory(model.id);
            await updateStory(model);
        } catch (error) {
            console.error(error)
            console.error("Failed to load story!");
        }
    }
    this.getStoryList = getStoryList;
    this.newStory = newStory;
    this.updateStory = updateStory;
    this.getStory = getStory;
    this.storeAsset = storeAsset;
    this.getAssetAsDataURI = getAssetAsDataURI;
    this.loadStory = loadStory;
    this.packageStory = packageStory;
}


