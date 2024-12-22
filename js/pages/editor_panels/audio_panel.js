import { Data } from "../../data.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";
import { ToggleInput } from "../components/toggle_input.js";

export function AudioPanel(container) {
    let mUpdateAttributeCallback = async (id, attrs) => { };
    let mDeleteCallback = async (id) => { };
    let mNavigationCallback = async (id) => { };
    let mCloseEditAudioCallback = async (id) => { };

    let mModel = new Data.StoryModel();
    let mAudio = new Data.Audio();
    let mAudioId = null;
    let mMomentId = null;

    let mPanelContainer = document.createElement('div');
    container.appendChild(mPanelContainer);
    hide();

    let mBackButton = new ButtonInput(mPanelContainer)
        .setId('audio-back-button')
        .setLabel("<- Back")
        .setOnClick(async () => {
            await mNavigationCallback(mMomentId);
        });

    let mNameInput = new TextInput(mPanelContainer)
        .setId('audio-name-input')
        .setLabel("Name")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mAudioId, { name: newText });
        });

    let mAmbientInput = new ToggleInput(mPanelContainer)
        .setId('audio-ambient-input')
        .setLabel('Ambient')
        .onChange(async val => {
            await mUpdateAttributeCallback(mAudioId, { ambient: val });
        })

    let mVolumeInput = new TextInput(mPanelContainer, 'number')
        .setLabel("Volume")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mAudioId, { volume: newNum });
        });

    let mPositionHeader = document.createElement('div');
    mPositionHeader.innerHTML = 'Position'
    mPanelContainer.appendChild(mPositionHeader)
    let mPositionXInput = new TextInput(mPanelContainer, 'number')
        .setLabel("x")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mAudioId, { x: newNum });
        });
    let mPositionYInput = new TextInput(mPanelContainer, 'number')
        .setLabel("y")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mAudioId, { y: newNum });
        });
    let mPositionZInput = new TextInput(mPanelContainer, 'number')
        .setLabel("z")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mAudioId, { z: newNum });
        });

    let mDeleteButton = new ButtonInput(mPanelContainer)
        .setId('audio-delete-button')
        .setLabel('Delete')
        .setOnClick(async () => {
            await mDeleteCallback(mAudioId);
        })

    function show(model, audioId) {
        mModel = model;
        mAudioId = audioId;
        mAudio = mModel.find(audioId);

        let moment = mModel.moments.find(m => m.audioIds.includes(mAudioId));
        if (!moment) { console.error("Moment not found!"); }
        else mMomentId = moment.id;

        mNameInput.setText(mAudio.name);
        mAmbientInput.setVal(mAudio.ambient);

        mPositionXInput.setText(Math.round(mAudio.x * 1000) / 1000);
        mPositionYInput.setText(Math.round(mAudio.y * 1000) / 1000);
        mPositionZInput.setText(Math.round(mAudio.z * 1000) / 1000);

        mVolumeInput.setText(Math.round(mAudio.volume * 100) / 100);

        mPanelContainer.style['display'] = '';
    }

    function hide() {
        mPanelContainer.style['display'] = 'none';
    }


    this.show = show;
    this.hide = hide;
    this.setUpdateAttributeCallback = (func) => mUpdateAttributeCallback = func;
    this.setDeleteCallback = (func) => mDeleteCallback = func;
    this.setCloseEditAudioCallback = (func) => mCloseEditAudioCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}