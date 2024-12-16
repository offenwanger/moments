import { Data } from "../../data.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";

export function AudioPanel(container) {
    let mUpdateAttributeCallback = async (id, attrs) => { };
    let mDeleteCallback = async (id) => { };
    let mNavigationCallback = async (id) => { };
    let mCloseEditAudioCallback = async (id) => { };

    let mModel = new Data.StoryModel();
    let mAudio = new Data.Audio();
    let mAudioId = null;

    let mPanelContainer = document.createElement('div');
    container.appendChild(mPanelContainer);
    hide();

    let mBackButton = new ButtonInput(mPanelContainer)
        .setId('audio-back-button')
        .setLabel("<- Moment")
        .setOnClick(async () => {
            let moment = mModel.moments.find(m => m.audioIds.includes(mAudioId));
            if (!moment) {
                console.error("Moment not found!");
                await mNavigationCallback(mModel.id);
            }
            await mNavigationCallback(moment.id);
        });

    let mNameInput = new TextInput(mPanelContainer)
        .setId('audio-name-input')
        .setLabel("Name")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mAudioId, { name: newText });
        });

    let mPositionHeader = document.createElement('div');
    mPositionHeader.innerHTML = 'Position'
    mPanelContainer.appendChild(mPositionHeader)
    let mPositionXInput = new TextInput(mPanelContainer, 'number')
        .setLabel("x")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mComponentId, { x: newNum });
        });
    let mPositionYInput = new TextInput(mPanelContainer, 'number')
        .setLabel("y")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mComponentId, { y: newNum });
        });
    let mPositionZInput = new TextInput(mPanelContainer, 'number')
        .setLabel("z")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mComponentId, { z: newNum });
        });

    let mDeleteButton = new ButtonInput(mPanelContainer)
        .setId('audio-delete-button')
        .setLabel('Delete')
        .setOnClick(async () => {
            await mDeleteCallback(mAudioId);
            await mNavigationCallback(mModel.id);
        })

    function show(model, audioId) {
        mModel = model;
        mAudioId = audioId;
        mAudio = mModel.find(audioId);

        mNameInput.setText(mAudio.name);

        mPositionXInput.setText(Math.round(mAudio.x * 1000) / 1000);
        mPositionYInput.setText(Math.round(mAudio.y * 1000) / 1000);
        mPositionZInput.setText(Math.round(mAudio.z * 1000) / 1000);

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