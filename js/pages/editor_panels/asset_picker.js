import { AssetTypes } from "../../constants.js";
import { Util } from "../../utils/utility.js";
import { ButtonInput } from "../components/button_input.js";

export function AssetPicker(container) {
    let mNewAssetCallback = async (filename) => { }

    let mDialog = container.append('dialog')
        .style('position', 'absolute')
        .style('top', '20px');
    let mContent = mDialog.append('div');
    let mNewAssetButton = new ButtonInput(mContent)
        .setId("asset-add-button")
        .setLabel("New Asset [+]");
    let mAssetsContainer = mDialog.append('div');
    let mAssetList = []
    let mCloseButton = new ButtonInput(mContent)
        .setId("dialog-close-button")
        .setLabel("Cancel")
        .setOnClick(async () => {
            mDialog.node().close()
        });

    d3.select(window).on('pointerdown', (event) => {
        if (mDialog.node().open && !mDialog.node().contains(event.target)) {
            mDialog.node().close();
        }
    })

    async function showOpenAssetPicker(model, type = AssetTypes.MODEL) {
        let assets = model.getAssets();
        Util.setComponentListLength(mAssetList, assets.length, () => new ButtonInput(mAssetsContainer))
        for (let i = 0; i < assets.length; i++) {
            mAssetList[i].setId("asset-button-" + assets[i].id).setLabel(assets[i].name);
        }

        // should be a type here which we use to limit the files we take.
        return new Promise((resolve, reject) => {
            let assetId = null;

            for (let i = 0; i < assets.length; i++) {
                mAssetList[i].setOnClick(async () => {
                    assetId = assets[i].id;
                    mDialog.node().close();
                });
            }

            mNewAssetButton.setOnClick(async () => {
                let pickerOpts = {
                    excludeAcceptAllOption: true,
                    multiple: false,
                }
                if (type == AssetTypes.IMAGE) {
                    pickerOpts.types = [{
                        description: "Images",
                        accept: { "image/*": [".png", ".gif", ".jpeg", ".jpg"], },
                    }];
                } else if (type == AssetTypes.MODEL) {
                    pickerOpts.types = [{
                        description: "3D Model",
                        accept: { "image/*": [".glb", ".glTF"], },
                    }];
                }
                let fileHandle = await window.showOpenFilePicker(pickerOpts);
                fileHandle = fileHandle[0];
                if (fileHandle) {
                    assetId = await mNewAssetCallback(fileHandle, type);
                    if (assetId) {
                        mDialog.node().close();
                    }
                }
            });

            mDialog.on('close', () => {
                if (assetId) {
                    resolve(assetId);
                } else {
                    reject("No asset selected.")
                }
            });

            mDialog.node().show();
        })
    }

    this.showOpenAssetPicker = showOpenAssetPicker;
    this.setNewAssetCallback = (func) => mNewAssetCallback = func;
}