import { AssetTypes } from "../../constants.js";
import { FileUtil } from "../../utils/file_util.js";
import { Util } from "../../utils/utility.js";
import { ButtonInput } from "../components/button_input.js";

export function AssetPicker(container) {
    let mNewAssetCallback = async (filename) => { }

    let mAssets = [];

    let mDialog = document.createElement('dialog');
    mDialog.style['position'] = 'absolute';
    mDialog.style['top'] = '20px';
    container.appendChild(mDialog);
    let mContent = document.createElement('div');
    mDialog.appendChild(mContent);

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

    let mAssetsContainer = document.createElement('div');
    mAssetsContainer.setAttribute('id', 'assets-container');
    mDialog.appendChild(mAssetsContainer)
    let mAssetList = []

    let mSelectedAssetId = null;
    let mSelectionType = null;

    let mCloseButton = new ButtonInput(mContent)
        .setId("dialog-close-button")
        .setLabel("Cancel")
        .setOnClick(async () => {
            mDialog.close()
        });

    window.addEventListener('pointerdown', (event) => {
        if (mDialog.open && !mDialog.contains(event.target)) {
            mDialog.close();
        }
    })

    function updateModel(model) {
        mAssets = model.assets;
        refreshList();
    }

    async function showOpenAssetPicker(type = AssetTypes.MODEL) {
        mSelectionType = type;
        refreshList();

        return new Promise((resolve, reject) => {
            mDialog.addEventListener('close', () => {
                let assetId = mSelectedAssetId;
                mSelectedAssetId = null;
                mSelectionType = null;
                if (assetId) {
                    resolve(assetId);
                } else {
                    reject("No asset selected.")
                }
            });

            mDialog.show();
        })
    }

    function refreshList() {
        let typeAssets = mAssets.filter(a => a.type == mSelectionType);
        Util.setComponentListLength(mAssetList, typeAssets.length, () => new ButtonInput(mAssetsContainer));
        for (let i = 0; i < typeAssets.length; i++) {
            mAssetList[i].setId("asset-button-" + typeAssets[i].id)
                .setLabel(typeAssets[i].name)
                .setOnClick(async () => {
                    mSelectedAssetId = typeAssets[i].id;
                    mDialog.close();
                });
        }
    }

    this.updateModel = updateModel;
    this.showOpenAssetPicker = showOpenAssetPicker;
    this.onNewAsset = (func) => mNewAssetCallback = func;
}