import { AssetTypes } from "../../constants.js";
import { FileUtil } from "../../utils/file_util.js";
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
        .setLabel("New Asset [+]")
        .setOnClick(async () => {
            let accept = null;
            if (mSelectionType == AssetTypes.IMAGE) {
                accept = "image/*";
            } else if (mSelectionType == AssetTypes.MODEL) {
                accept = ".glb,.glTF";
            }

            let file = await FileUtil.showFilePicker(accept);
            if (file) await mNewAssetCallback(file, mSelectionType);
        });

    let mAssetsContainer = mDialog.append('div')
        .attr('id', 'assets-container');
    let mAssetList = []

    let mSelectedAssetId = null;
    let mSelectionType = null;

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

    function updateModel(model) {
        let assets = model.assets;
        Util.setComponentListLength(mAssetList, assets.length, () => new ButtonInput(mAssetsContainer));
        for (let i = 0; i < assets.length; i++) {
            mAssetList[i].setId("asset-button-" + assets[i].id)
                .setLabel(assets[i].name);
        }

        for (let i = 0; i < assets.length; i++) {
            mAssetList[i].setOnClick(async () => {
                mSelectedAssetId = assets[i].id;
                mDialog.node().close();
            });
        }
    }

    async function showOpenAssetPicker(type = AssetTypes.MODEL) {
        mSelectionType = type;

        return new Promise((resolve, reject) => {
            mDialog.on('close', () => {
                let assetId = mSelectedAssetId;
                mSelectedAssetId = null;
                mSelectionType = null;
                if (assetId) {
                    resolve(assetId);
                } else {
                    reject("No asset selected.")
                }
            });

            mDialog.node().show();
        })
    }

    this.updateModel = updateModel;
    this.showOpenAssetPicker = showOpenAssetPicker;
    this.onNewAsset = (func) => mNewAssetCallback = func;
}