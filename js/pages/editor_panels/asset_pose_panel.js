import { Data } from "../../data.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";

export function AssetPosePanel(container) {
    let mUpdateAttributeCallback = async (id, attrs) => { };
    let mNavigationCallback = async (id) => { };

    let mModel = new Data.StoryModel();
    let mAssetPose = new Data.AssetPose();
    let mAssetPoseId = null;
    let mPoseableAssetId = null;

    let mPanelContainer = document.createElement('div');
    container.appendChild(mPanelContainer); hide();

    let mBackButton = new ButtonInput(mPanelContainer)
        .setId('assetpose-back-button')
        .setLabel("<- Back")
        .setOnClick(async () => {
            await mNavigationCallback(mPoseableAssetId);
        });

    let mNameDisplay = document.createElement('div');
    mNameDisplay.setAttribute('id', 'assetpose-name-display');
    mPanelContainer.appendChild(mNameDisplay);

    let mAttachedTeleport = new ButtonInput(mPanelContainer)
        .setId('assetpose-teleport-button');
    mAttachedTeleport.hide();
    let mAttachedAudio = new ButtonInput(mPanelContainer)
        .setId('assetpose-audio-button');
    mAttachedAudio.hide();

    let mPositionHeader = document.createElement('div');
    mPositionHeader.textContent = 'Position'
    mPanelContainer.appendChild(mPositionHeader);
    let mPositionXInput = new TextInput(mPanelContainer, 'number')
        .setLabel("x")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mAssetPoseId, { x: newNum });
        });
    let mPositionYInput = new TextInput(mPanelContainer, 'number')
        .setLabel("y")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mAssetPoseId, { y: newNum });
        });
    let mPositionZInput = new TextInput(mPanelContainer, 'number')
        .setLabel("z")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mAssetPoseId, { z: newNum });
        });

    function show(model, assetPoseId) {
        mModel = model;
        mAssetPoseId = assetPoseId;
        mAssetPose = mModel.find(assetPoseId);

        mNameDisplay.innerHTML = mAssetPose.name;

        let posableAsset = mModel.poseableAssets.find(p => p.poseIds.includes(mAssetPoseId));
        if (!posableAsset) { console.error("PosableAsset not found!"); }
        else mPoseableAssetId = posableAsset.id;

        mPositionXInput.setText(Math.round(mAssetPose.x * 1000) / 1000);
        mPositionYInput.setText(Math.round(mAssetPose.y * 1000) / 1000);
        mPositionZInput.setText(Math.round(mAssetPose.z * 1000) / 1000);

        let teleport = model.teleports.find(t => t.attachedId == assetPoseId);
        if (teleport) {
            mAttachedTeleport
                .setLabel(teleport.name)
                .setOnClick(async () => await mNavigationCallback(teleport.id))
                .show();
        } else {
            mAttachedTeleport.hide();
        }

        let audio = model.audios.find(t => t.attachedId == assetPoseId);
        if (audio) {
            mAttachedAudio
                .setLabel(audio.name)
                .setOnClick(async () => await mNavigationCallback(audio.id))
                .show();
        } else {
            mAttachedAudio.hide();
        }

        mPanelContainer.style['display'] = '';
    }

    function hide() {
        mPanelContainer.style['display'] = 'none';
    }


    this.show = show;
    this.hide = hide;
    this.setUpdateAttributeCallback = (func) => mUpdateAttributeCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}