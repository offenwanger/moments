import { AssetExtensions, AssetTypes, BOX_ASSET_PREFIXES, STORY_JSON_FILE } from '../constants.js';
import { DataModel } from '../data_model.js';

// needed for storing file handles.
export const HandleStorage = function () {
    const DB_NAME = 'FileHandles';
    const OBJECT_STORE_NAME = 'HandleStore';
    let mDatabase = null;

    async function getDatabase() {
        return new Promise((resolve, reject) => {
            if (mDatabase) {
                resolve(mDatabase);
                return;
            }

            let req = indexedDB.open(DB_NAME, 1);
            req.onerror = function withStoreOnError() {
                reject(req.error.name);
            };
            req.onupgradeneeded = function withStoreOnUpgradeNeeded() {
                // database did not yet exist
                req.result.createObjectStore(OBJECT_STORE_NAME);
            };
            req.onsuccess = function withStoreOnSuccess() {
                mDatabase = req.result;
                resolve(mDatabase);
            };
        });
    }

    async function executeTransaction(type, storeCall) {
        let database = await getDatabase();
        return new Promise((resolve, reject) => {
            let transaction = database.transaction([OBJECT_STORE_NAME], type);
            let store = transaction.objectStore(OBJECT_STORE_NAME);
            let req = storeCall(store);
            req.onerror = function () { reject(req.error) };
            req.onsuccess = function () { resolve(req.result) }
        });

    }

    async function getItem(key) {
        return executeTransaction('readonly', store => store.get(key));
    }

    async function setItem(key, value) {
        return executeTransaction('readwrite', store => store.put(value, key));
    }

    async function removeItem(key) {
        return executeTransaction('readwrite', store => store.delete(key));
    }

    async function clear() {
        return executeTransaction('readwrite', store => store.clear());
    }

    return {
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear
    };
}();

export async function getJSONFromFile(dir, filename) {
    let handle = await dir.getFileHandle(filename)
    let file = await handle.getFile();
    let jsonTxt = await file.text();
    let obj = JSON.parse(jsonTxt);
    return obj;
}

export async function getFile(dir, filename) {
    let handle = await dir.getFileHandle(filename)
    let file = await handle.getFile();
    return file;
}

export async function writeFile(folder, filename, data) {
    let handle = await folder.getFileHandle(filename, { create: true })
    let file = await handle.createWritable();
    await file.write(data);
    await file.close();
}

export async function pacakgeToZip(model, assetFolder, outputFolder) {
    const zipFileStream = new TransformStream();
    const zipFileBlobPromise = new Response(zipFileStream.readable).blob();
    const zipWriter = new zip.ZipWriter(zipFileStream.writable);

    let modelBlobStream = new Blob([JSON.stringify(model.toObject())]).stream();
    await zipWriter.add(STORY_JSON_FILE, modelBlobStream);

    let assets = model.getAssets();
    for (const asset of assets) {
        if (asset.type == AssetTypes.IMAGE || asset.type == AssetTypes.MODEL) {
            let file = getFile(assetFolder, asset.filename);
            await zipWriter.add(asset.filename, file.stream());
        } else if (asset.type == AssetTypes.BOX) {
            for (const prefix of BOX_ASSET_PREFIXES) {
                let file = getFile(assetFolder, prefix + asset.filename);
                await zipWriter.add(prefix + asset.filename, file.stream());
            }
        }
    }

    await zipWriter.close();
    // Retrieves the Blob object containing the zip content into `zipFileBlob`.
    const zipFileBlob = await zipFileBlobPromise;
    let outputFile = model.getStory().name + "_" + Date.now() + '.zip';
    await writeFile(outputFolder, outputFile, zipFileBlob);
}

export async function unpackageAssetsFromZip(zipBlob, assetFolder) {
    console.log("We're going to need to come back to this.")
    const zipFileReader = new zip.BlobReader(zipBlob);
    const zipReader = new zip.ZipReader(zipFileReader);
    for (const entry of await zipReader.getEntries()) {
        if (entry.filename == STORY_JSON_FILE) continue;
        const stream = new TransformStream();
        await entry.getData(stream.writable);
    }
    await zipReader.close();
}

export async function getModelFromZip(zipBlob) {
    const zipFileReader = new zip.BlobReader(zipBlob);
    const zipReader = new zip.ZipReader(zipFileReader);
    let zipEntries = await zipReader.getEntries()
    const storyFile = zipEntries.find(entry => {
        if (entry.filename == STORY_JSON_FILE) return true;
        return false;
    });
    const stream = new TransformStream();
    const streamPromise = new Response(stream.readable).text();
    await storyFile.getData(stream.writable);
    await zipReader.close();

    const fileText = await streamPromise;
    let modelJSON = JSON.parse(fileText);
    let model = DataModel.fromObject(modelJSON);
    return model;
}

