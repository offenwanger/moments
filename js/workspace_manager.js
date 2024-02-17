import { WORKSPACE_DATA_FILE, STORY_JSON_FILE, ASSET_FOLDER, OUTPUT_FOLDER, AssetTypes } from "./constants.js";
import { DataModel } from "./data_model.js";
import { getJSONFromFile, getModelFromZip, pacakgeToZip, unpackageAssetsFromZip, writeFile } from "./utils/file_util.js";
import { IdUtil } from "./utils/id_util.js";
import { Util } from './utils/utility.js';

export function WorkspaceManager(folderHandle) {
    let mWorkspaceData = null;
    let mFolderHandle = folderHandle;

    let initialized = (async () => {
        if (await mFolderHandle.queryPermission({ mode: 'readwrite' }) !== 'granted') {
            throw Error("Invalid workspace folder, permission not granted");
        }

        try {
            mWorkspaceData = await getJSONFromFile(mFolderHandle, WORKSPACE_DATA_FILE);
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
                let storyObj = await getJSONFromFile(await mFolderHandle.getDirectoryHandle(storyId), STORY_JSON_FILE)
                if (storyObj.story && storyObj.story.id && storyObj.story.name) {
                    stories.push({ id: storyObj.story.id, name: storyObj.story.name });
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
        await writeFile(await mFolderHandle.getDirectoryHandle(model.getStory().id), STORY_JSON_FILE, JSON.stringify(model.toObject()))
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
            let storyObj = await getJSONFromFile(await mFolderHandle.getDirectoryHandle(storyId), STORY_JSON_FILE)
            let model = DataModel.fromObject(storyObj);
            let assetFolder = await mFolderHandle.getDirectoryHandle(ASSET_FOLDER, { create: true })
            let outputFolder = await mFolderHandle.getDirectoryHandle(OUTPUT_FOLDER, { create: true })
            pacakgeToZip(model, assetFolder, outputFolder);
        } catch (error) {
            console.error(error);
        }
    }

    async function loadStory(file) {
        try {
            let model = await getModelFromZip(file);
            model = model.copy();
            let assets = model.getAssets();
            let oldFilenames = Util.unique(assets.map(a => a.filename).filter(f => f));
            let filenameMap = oldFilenames.map(f => { return { oldName: f, newName: IdUtil.getUniqueId({ name: "File" }) } })
            let assetFolder = await mFolderHandle.getDirectoryHandle(ASSET_FOLDER, { create: true })
            await unpackageAssetsFromZip(file, filenameMap, assetFolder);
            assets.forEach(asset => {
                if (asset.filename) {
                    asset.filename = filenameMap.find(m => m.oldName == asset.filename).newName;
                }
            })
            await newStory(model.getStory().id);
            await updateStory(model);
        } catch (error) {
            console.error(error)
            console.error("Failed to load story!");
        }
    }

    this.getStoryList = getStoryList;
    this.newStory = newStory;
    this.updateStory = updateStory;
    this.loadStory = loadStory;
    this.packageStory = packageStory;
}


