import { AssetTypes } from "../../constants.js";
import { Util } from "../../utils/utility.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";

export function AssetPanel(container) {
    let mAddCallback = async (parentId, itemClass, config) => { };
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mNavigationCallback = async (id) => { };

    let mScrollHeight = 0;

    let mAsset;
    let mAssetId;

    let mPanelContainer = container.append("div"); hide();

    let mNameInput = new TextInput(mPanelContainer)
        .setId('asset-name-input')
        .setLabel("Name")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mAsset, 'name', newText);
        });

    let mTextInput = new TextInput(mPanelContainer)
        .setId('asset-text-input')
        .setLabel("Text")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mAsset, 'name', newText);
        });

    let mFileButton = new ButtonInput(mPanelContainer)
        .setId('asset-file-button')
        .setOnClick(async () => {
            // TODO: show for the right asset type
            let fileHandle = await window.showFilePicker();
            if (fileHandle) {
                // validate the file
                // transfer the file to file folder
            }
        })

    let mUsedByContainer = mPanelContainer.append('div').attr('id', 'moment-model3Ds');
    mUsedByContainer.append('div').html('Position');
    let mUsedByList = [];

    function show(model, assetId) {
        mAssetId = assetId;
        mAsset = model.getAsset(assetId);

        mNameInput.setText(mAsset.name);

        if (mAsset.type == AssetTypes.TEXT) {
            mTextInput.show();
            mFileButton.hide();
            mTextInput.setText(mAsset.text);
        } else {
            mTextInput.hide();
            mFileButton.show();
            mFileButton.setLabel(mAsset.filename);
        }

        let usedByItems = model.getItemsForAsset(mAssetId);
        Util.setComponentListLength(mUsedByList, usedByItems.length, () => new ButtonInput(mUsedByContainer))
        for (let i = 0; i < usedByItems.length; i++) {
            mUsedByList[i].setId("asset-used-by-button-" + usedByItems[i].id)
                .setLabel(usedByItems[i].name)
                .setOnClick(async () => await mNavigationCallback(usedByItems[i].id));
        }

        mPanelContainer.style('display', '');
    }

    function hide() {
        mPanelContainer.style('display', 'none');
    }

    this.show = show;
    this.hide = hide;
    this.setAddCallback = (func) => mAddCallback = func;
    this.setUpdateAttributeCallback = (func) => mUpdateAttributeCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}