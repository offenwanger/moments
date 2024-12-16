import { Data } from "../../data.js";
import { Util } from "../../utils/utility.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";

export function MomentPanel(container) {
    let mAddCallback = async (parentId, itemClass, config) => { };
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mNavigationCallback = async (id) => { };
    let mDeleteCallback = async (id) => { };

    let mModel = new Data.StoryModel();
    let mMoment = null;
    let mScrollHeight = 0;

    let mPanelContainer = document.createElement("div");
    container.appendChild(mPanelContainer); hide();

    let mBackButton = new ButtonInput(mPanelContainer)
        .setId('picture-back-button')
        .setLabel("<- Story")
        .setOnClick(async () => {
            await mNavigationCallback(mModel.id);
        });

    let mNameInput = new TextInput(mPanelContainer)
        .setId('moment-name-input')
        .setLabel("Name")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mMoment.id, { name: newText });
        });


    let mPhotoSphereAssetButton = new ButtonInput(mPanelContainer)
        .setId('photosphere-asset-button')

    let mPoseableAssetsContainer = document.createElement('div');
    mPoseableAssetsContainer.setAttribute('id', 'moment-poseable-assets');
    mPanelContainer.appendChild(mPoseableAssetsContainer)
    let mPoseableAssetsList = [];

    let mPicturesContainer = document.createElement('div');
    mPicturesContainer.setAttribute('id', 'moment-pictures');
    mPanelContainer.appendChild(mPicturesContainer)
    let mPicturesList = [];

    let mAudiosContainer = document.createElement('div');
    mAudiosContainer.setAttribute('id', 'moment-audios');
    mPanelContainer.appendChild(mAudiosContainer)
    let mAudiosList = [];

    let mDeleteButton = new ButtonInput(mPanelContainer)
        .setId('picture-delete-button')
        .setLabel('Delete')
        .setOnClick(async () => {
            await mDeleteCallback(mPictureId);
            await mNavigationCallback(mModel.id);
        })

    function show(model, momentId) {
        mModel = model;
        mMoment = model.find(momentId);
        if (!mMoment) console.error("Invalid id: " + momentId);
        mNameInput.setText(mMoment.name)

        let photosphere = model.find(mMoment.photosphereId)
        if (photosphere) {
            let asset = model.find(photosphere.imageAssetId);
            if (asset) {
                mPhotoSphereAssetButton.setLabel(asset.name);
            } else {
                mPhotoSphereAssetButton.setLabel('None');
            }
        } else {
            mPhotoSphereAssetButton.hide();
        }

        let assets = model.poseableAssets.filter(a => mMoment.poseableAssetIds.includes(a.id));
        Util.setComponentListLength(mPoseableAssetsList, assets.length, () => new ButtonInput(mPoseableAssetsContainer))
        for (let i = 0; i < assets.length; i++) {
            mPoseableAssetsList[i].setId("poseable-asset-button-" + assets[i].id)
                .setLabel(assets[i].name)
                .setOnClick(async () => await mNavigationCallback(assets[i].id));
        }
        let pictures = model.pictures.filter(p => mMoment.pictureIds.includes(p.id));
        Util.setComponentListLength(mPicturesList, pictures.length, () => new ButtonInput(mPicturesContainer))
        for (let i = 0; i < pictures.length; i++) {
            mPicturesList[i].setId("picture-button-" + pictures[i].id)
                .setLabel(pictures[i].name)
                .setOnClick(async () => await mNavigationCallback(pictures[i].id));
        }
        let audios = model.audios.filter(a => mMoment.audioIds.includes(a.id));
        Util.setComponentListLength(mAudiosList, audios.length, () => new ButtonInput(mAudiosContainer))
        for (let i = 0; i < audios.length; i++) {
            mAudiosList[i].setId("audio-button-" + audios[i].id)
                .setLabel(audios[i].name)
                .setOnClick(async () => await mNavigationCallback(audios[i].id));
        }

        mPanelContainer.style['display'] = '';
    }

    function hide() {
        mPanelContainer.style['display'] = 'none';
    }

    this.show = show;
    this.hide = hide;

    this.onAdd = (func) => mAddCallback = func;
    this.setUpdateAttributeCallback = (func) => mUpdateAttributeCallback = func;
    this.setDeleteCallback = (func) => mDeleteCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}