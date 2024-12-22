import { Data } from "../../data.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";

export function PicturePanel(container) {
    let mUpdateAttributeCallback = async (id, attrs) => { };
    let mDeleteCallback = async (id) => { };
    let mNavigationCallback = async (id) => { };
    let mEditPictureCallback = async (id) => { };
    let mCloseEditPictureCallback = async (id) => { };

    let mModel = new Data.StoryModel();
    let mPicture = new Data.Picture();
    let mPictureId = null;
    let mShowingEditor = false;
    let mMomentId = null;

    let mPanelContainer = document.createElement('div');
    container.appendChild(mPanelContainer); hide();

    let mBackButton = new ButtonInput(mPanelContainer)
        .setId('picture-back-button')
        .setLabel("<- Back")
        .setOnClick(async () => {
            if (mShowingEditor) await hideEditor();
            await mNavigationCallback(mMomentId);
        });

    let mNameInput = new TextInput(mPanelContainer)
        .setId('picture-name-input')
        .setLabel("Name")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mPictureId, { name: newText });
        });

    let mEditButton = new ButtonInput(mPanelContainer)
        .setId('picture-edit-button')
        .setLabel('Edit')
        .setOnClick(async () => {
            if (mShowingEditor) {
                await hideEditor();
            } else {
                await showEditor();
            }
        })

    let mAttachedTeleport = new ButtonInput(mPanelContainer)
        .setId('picture-teleport-button');
    mAttachedTeleport.hide();
    let mAttachedAudio = new ButtonInput(mPanelContainer)
        .setId('picture-audio-button');
    mAttachedAudio.hide();

    let mPositionHeader = document.createElement('div');
    mPositionHeader.textContent = 'Position'
    mPanelContainer.appendChild(mPositionHeader);
    let mPositionXInput = new TextInput(mPanelContainer, 'number')
        .setLabel("x")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mPictureId, { x: newNum });
        });
    let mPositionYInput = new TextInput(mPanelContainer, 'number')
        .setLabel("y")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mPictureId, { y: newNum });
        });
    let mPositionZInput = new TextInput(mPanelContainer, 'number')
        .setLabel("z")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mPictureId, { z: newNum });
        });

    let mDeleteButton = new ButtonInput(mPanelContainer)
        .setId('picture-delete-button')
        .setLabel('Delete')
        .setOnClick(async () => {
            await mDeleteCallback(mPictureId);
        })

    async function showEditor() {
        mShowingEditor = true;
        mEditButton.setLabel('Close');
        await mEditPictureCallback(mPictureId);
    }

    async function hideEditor() {
        mShowingEditor = false;
        mEditButton.setLabel('Edit');
        await mCloseEditPictureCallback();
    }

    function show(model, pictureId) {
        mModel = model;
        mPictureId = pictureId;
        mPicture = mModel.find(pictureId);

        mNameInput.setText(mPicture.name);

        let moment = mModel.moments.find(m => m.pictureIds.includes(mPictureId));
        if (!moment) { console.error("Moment not found!"); }
        else mMomentId = moment.id;

        mPositionXInput.setText(Math.round(mPicture.x * 1000) / 1000);
        mPositionYInput.setText(Math.round(mPicture.y * 1000) / 1000);
        mPositionZInput.setText(Math.round(mPicture.z * 1000) / 1000);

        let teleport = model.teleports.find(t => t.attachedId == pictureId);
        if (teleport) {
            mAttachedTeleport
                .setLabel(teleport.name)
                .setOnClick(async () => await mNavigationCallback(teleport.id))
                .show();
        } else {
            mAttachedTeleport.hide();
        }

        let audio = model.audios.find(t => t.attachedId == pictureId);
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
    this.setDeleteCallback = (func) => mDeleteCallback = func;
    this.setEditPictureCallback = (func) => mEditPictureCallback = func;
    this.setCloseEditPictureCallback = (func) => mCloseEditPictureCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}