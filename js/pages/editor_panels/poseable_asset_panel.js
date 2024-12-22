import { Util } from "../../utils/utility.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";

export function PoseableAssetPanel(container) {
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mDeleteCallback = async (id) => { };
    let mNavigationCallback = async (id) => { };

    let mModel = null;
    let mPoseableAssetId = null;
    let mPoseableAsset = null;
    let mMomentId = null;

    let mPanelContainer = document.createElement("div")
    container.appendChild(mPanelContainer);
    hide();

    let mBackButton = new ButtonInput(mPanelContainer)
        .setId('poseableAsset-back-button')
        .setLabel("<- Back")
        .setOnClick(async () => {
            await mNavigationCallback(mMomentId);
        })

    let mNameInput = new TextInput(mPanelContainer)
        .setId('poseableAsset-name-input')
        .setLabel("Name")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mPoseableAssetId, { name: newText });
        });

    let mAssetPosesContainer = document.createElement('div');
    mAssetPosesContainer.setAttribute('id', 'poseable-asset-asset-poses');
    mPanelContainer.appendChild(mAssetPosesContainer)
    let mAssetPosesList = [];

    let mDeleteButton = new ButtonInput(mPanelContainer)
        .setId('poseableAsset-delete-button')
        .setLabel('Delete')
        .setOnClick(async () => {
            await mDeleteCallback(mPoseableAssetId);
        })

    function show(model, poseableAssetId) {
        mModel = model;
        mPoseableAssetId = poseableAssetId;
        mPoseableAsset = mModel.find(mPoseableAssetId);

        let moment = mModel.moments.find(m => m.poseableAssetIds.includes(mPoseableAssetId));
        if (!moment) { console.error("Moment not found!"); }
        else mMomentId = moment.id;

        mNameInput.setText(mPoseableAsset.name);

        let assetPoses = model.assetPoses.filter(p => mPoseableAsset.poseIds.includes(p.id));
        Util.setComponentListLength(mAssetPosesList, assetPoses.length, () => new ButtonInput(mAssetPosesContainer))
        for (let i = 0; i < assetPoses.length; i++) {
            mAssetPosesList[i].setId("assetpose-button-" + assetPoses[i].id)
                .setLabel(assetPoses[i].name)
                .setOnClick(async () => await mNavigationCallback(assetPoses[i].id));
        }

        mPanelContainer.style['display'] = '';
    }

    function hide() {
        mPanelContainer.style['display'] = 'none';
    }

    this.show = show;
    this.hide = hide;
    this.setUpdateAttributeCallback = (func) => mUpdateAttributeCallback = func;
    this.setDeleteCallback = (func) => mDeleteCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}