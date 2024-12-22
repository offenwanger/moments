import { Data } from "../../data.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";

export function TeleportPanel(container) {
    let mUpdateAttributeCallback = async (id, attrs) => { };
    let mDeleteCallback = async (id) => { };
    let mNavigationCallback = async (id) => { };

    let mModel = new Data.StoryModel();
    let mTeleport = new Data.Teleport();
    let mTeleportId = null;
    let mMomentId = null;

    let mPanelContainer = document.createElement('div');
    container.appendChild(mPanelContainer);
    hide();

    let mBackButton = new ButtonInput(mPanelContainer)
        .setId('teleport-back-button')
        .setLabel("<- Back")
        .setOnClick(async () => {
            await mNavigationCallback(mMomentId);
        });

    let mNameInput = new TextInput(mPanelContainer)
        .setId('teleport-name-input')
        .setLabel("Name")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mTeleportId, { name: newText });
        });

    let mPositionHeader = document.createElement('div');
    mPositionHeader.innerHTML = 'Position'
    mPanelContainer.appendChild(mPositionHeader)
    let mPositionXInput = new TextInput(mPanelContainer, 'number')
        .setLabel("x")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mTeleportId, { x: newNum });
        });
    let mPositionYInput = new TextInput(mPanelContainer, 'number')
        .setLabel("y")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mTeleportId, { y: newNum });
        });
    let mPositionZInput = new TextInput(mPanelContainer, 'number')
        .setLabel("z")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mTeleportId, { z: newNum });
        });

    let mDeleteButton = new ButtonInput(mPanelContainer)
        .setId('teleport-delete-button')
        .setLabel('Delete')
        .setOnClick(async () => {
            await mDeleteCallback(mTeleportId);
        })

    function show(model, teleportId) {
        mModel = model;
        mTeleportId = teleportId;
        mTeleport = mModel.find(teleportId);

        let moment = mModel.moments.find(m => m.teleportIds.includes(mTeleportId));
        if (!moment) { console.error("Moment not found!"); }
        else mMomentId = moment.id;

        mNameInput.setText(mTeleport.name);

        mPositionXInput.setText(Math.round(mTeleport.x * 1000) / 1000);
        mPositionYInput.setText(Math.round(mTeleport.y * 1000) / 1000);
        mPositionZInput.setText(Math.round(mTeleport.z * 1000) / 1000);

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