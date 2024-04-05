import { AssetTypes, BOX_ASSET_PREFIXES, STORY_JSON_FILE } from '../constants.js';
import { DataModel } from '../data_model.js';

async function getJSONFromFile(dir, filename) {
    let handle = await dir.getFileHandle(filename)
    let file = await handle.getFile();
    let jsonTxt = await file.text();
    let obj = JSON.parse(jsonTxt);
    return obj;
}

async function getDataUriFromFile(dir, filename) {
    let handle = await dir.getFileHandle(filename)
    let file = await handle.getFile();

    const reader = new FileReader();
    const promise = new Promise(resolve => {
        reader.onload = function (e) {
            resolve(reader.result);
        }
    });
    reader.readAsDataURL(file);
    return promise;
}

async function getFile(dir, filename) {
    let handle = await dir.getFileHandle(filename)
    let file = await handle.getFile();
    return file;
}

async function writeFile(folder, filename, data) {
    let handle = await folder.getFileHandle(filename, { create: true })
    let file = await handle.createWritable();
    await file.write(data);
    await file.close();
}

async function pacakgeToZip(model, assetFolder, outputFolder) {
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

async function unpackageAssetsFromZip(zipBlob, assetFolder) {
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

async function getModelFromZip(zipBlob) {
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

export const FileUtil = {
    getJSONFromFile,
    getDataUriFromFile,
    getFile,
    writeFile,
    pacakgeToZip,
    unpackageAssetsFromZip,
    getModelFromZip,
}

