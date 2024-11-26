import { Data } from "../../data.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";

export function PicturePanel(container) {
    let mAddCallback = async (parentId, itemClass, config) => { };
    let mUpdateAttributeCallback = async (id, attrs) => { };
    let mDeleteCallback = async (id) => { };
    let mNavigationCallback = async (id) => { };
    let mEditPictureCallback = async (id) => { };
    let mCloseEditPictureCallback = async (id) => { };

    let mModel = new Data.StoryModel();
    let mPicture = new Data.Picture();
    let mPictureId = null;
    let mShowingEditor = false;

    let mPanelContainer = document.createElement('div');
    container.appendChild(mPanelContainer); hide();

    let mBackButton = new ButtonInput(mPanelContainer)
        .setId('picture-back-button')
        .setLabel("<- Story")
        .setOnClick(async () => {
            if (mShowingEditor) await hideEditor();
            await mNavigationCallback(mModel.id);
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

    let mPositionHeader = document.createElement('div');
    mPositionHeader.textContent = 'Position'
    mPanelContainer.appendChild(mPositionHeader);
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
        .setId('picture-delete-button')
        .setLabel('Delete')
        .setOnClick(async () => {
            await mDeleteCallback(mPictureId);
            await mNavigationCallback(mModel.id);
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

        mPositionXInput.setText(Math.round(mPicture.x * 1000) / 1000);
        mPositionYInput.setText(Math.round(mPicture.y * 1000) / 1000);
        mPositionZInput.setText(Math.round(mPicture.z * 1000) / 1000);

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
    this.setEditPictureCallback = (func) => mEditPictureCallback = func;
    this.setCloseEditPictureCallback = (func) => mCloseEditPictureCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}