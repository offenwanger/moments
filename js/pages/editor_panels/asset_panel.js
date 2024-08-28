import { AssetTypes } from "../../constants.js";
import { Util } from "../../utils/utility.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";
import { TwoButtonInput } from "../components/two_button_input.js";

export function AssetPanel(container) {
    let mAddCallback = async (parentId, itemClass, config) => { };
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mDeleteCallback = async (id) => { };
    let mNavigationCallback = async (id) => { };
    let mViewAssetCallback = async (assetId) => { }

    let mScrollHeight = 0;

    let mAsset;
    let mAssetId;
    let mModel;

    let mPanelContainer = container.append("div"); hide();

    let mBackToStoryButton = new ButtonInput(mPanelContainer)
        .setId('back-button')
        .setLabel('<- Story')
        .setOnClick(async () => {
            mNavigationCallback(mModel.id);
        })

    let mNameInput = new TextInput(mPanelContainer)
        .setId('asset-name-input')
        .setLabel("Name")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mAsset, { name: newText });
        });

    let mFileButton = new TwoButtonInput(mPanelContainer)
        .setId('asset-file-button')
        .setOnClick(1, async () => {
            // TODO: show for the right asset type
            let fileHandle = await window.showFilePicker();
            if (fileHandle) {
                // validate the file
                // transfer the file to file folder
            }
        })
        .setLabel(2, "👀")
        .setOnClick(2, async () => {
            await mViewAssetCallback(mAssetId);
        })

    let mUsedByContainer = mPanelContainer.append('div').attr('id', 'model3Ds');
    mUsedByContainer.append('div').html('Position');
    let mUsedByList = [];

    let mDeleteButton = new ButtonInput(mPanelContainer)
        .setId('model3D-delete-button')
        .setLabel('Delete')
        .setOnClick(async () => {
            await mDeleteCallback(mAssetId);
            await mNavigationCallback(mModel.id);
        })

    function show(model, assetId) {
        mModel = model;
        mAssetId = assetId;
        mAsset = model.getAsset(assetId);

        mNameInput.setText(mAsset.name);

        mFileButton.setLabel(1, mAsset.filename);

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
    this.setDeleteCallback = (func) => mDeleteCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
    this.setViewAssetCallback = (func) => mViewAssetCallback = func;
}