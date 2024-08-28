import { Data } from "../../data.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";

export function AnnotationPanel(container) {
    let mAddCallback = async (parentId, itemClass, config) => { };
    let mUpdateAttributeCallback = async (id, attrs) => { };
    let mDeleteCallback = async (id) => { };
    let mNavigationCallback = async (id) => { };
    let mEditAnnotationCallback = async (id) => { };
    let mCloseEditAnnotationCallback = async (id) => { };

    let mModel = new Data.StoryModel();
    let mAnnoatation = new Data.Annotation();
    let mAnnotationId = null;
    let mShowingEditor = false;

    let mPanelContainer = container.append("div"); hide();

    let mBackButton = new ButtonInput(mPanelContainer)
        .setId('annotation-back-button')
        .setLabel("<- Story")
        .setOnClick(async () => {
            if (mShowingEditor) await hideEditor();
            await mNavigationCallback(mModel.id);
        });

    let mNameInput = new TextInput(mPanelContainer)
        .setId('annotation-name-input')
        .setLabel("Name")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mAnnotationId, { name: newText });
        });

    let mEditButton = new ButtonInput(mPanelContainer)
        .setId('annotation-edit-button')
        .setLabel('Edit')
        .setOnClick(async () => {
            if (mShowingEditor) {
                await hideEditor();
            } else {
                await showEditor();
            }
        })

    let mPositionHeader = mPanelContainer.append('div').html('Position');
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
        .setId('annotation-delete-button')
        .setLabel('Delete')
        .setOnClick(async () => {
            await mDeleteCallback(mAnnotationId);
            await mNavigationCallback(mModel.id);
        })

    async function showEditor() {
        mShowingEditor = true;
        mEditButton.setLabel('Close');
        await mEditAnnotationCallback(mAnnotationId);
    }

    async function hideEditor() {
        mShowingEditor = false;
        mEditButton.setLabel('Edit');
        await mCloseEditAnnotationCallback();
    }

    function show(model, annotationId) {
        mModel = model;
        mAnnotationId = annotationId;
        mAnnoatation = mModel.find(annotationId);

        mNameInput.setText(mAnnoatation.name);

        mPositionXInput.setText(Math.round(mAnnoatation.x * 1000) / 1000);
        mPositionYInput.setText(Math.round(mAnnoatation.y * 1000) / 1000);
        mPositionZInput.setText(Math.round(mAnnoatation.z * 1000) / 1000);

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
    this.setEditAnnotationCallback = (func) => mEditAnnotationCallback = func;
    this.setCloseEditAnnotationCallback = (func) => mCloseEditAnnotationCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}