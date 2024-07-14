import { Data } from "../../data_structs.js";
import { Util } from "../../utils/utility.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";
import { TwoButtonInput } from "../components/two_button_input.js";

export function StoryPanel(container) {
    let mAddCallback = async (parentId, itemClass, config) => { };
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mNavigationCallback = async (id) => { };

    let mStory = null;
    let mScrollHeight = 0;

    let mPanelContainer = container.append("div"); hide();
    let mNameInput = new TextInput(mPanelContainer)
        .setId('story-name-input')
        .setLabel("Name")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mStory.id, 'name', newText);
        });

    let mPathInput = new TwoButtonInput(mPanelContainer)
        .setId('story-path-button')
        .setLabel(1, 'Edit Story Line')
        .setLabel(2, '✏️')
        .setOnClick(1, async () => {
            console.error("Not implemented");
        })

    let mBackgroundInput = new TwoButtonInput(mPanelContainer)
        .setId('story-background-button')
        .setLabel(2, '✏️')
        .setOnClick(1, async () => {
            console.error("Not implemented");
        })

    let mModel3DsContainer = mPanelContainer.append('div')
        .attr('id', 'story-model3Ds');
    let mModel3DsAddButton = new ButtonInput(mModel3DsContainer)
        .setId('story-model3D-add-button')
        .setLabel('Model3Ds [+]')
        .setOnClick(async () => {
            await mAddCallback(mStory.id, Data.Model3D, {});
        })
    let mModel3DsList = [];

    let mAnnotationsContainer = mPanelContainer.append('div')
        .attr('id', 'story-annotations');
    let mAnnotationsAddButton = new ButtonInput(mAnnotationsContainer)
        .setId('story-annotations-add-button')
        .setLabel('Annotations [+]')
        .setOnClick(async () => {
            await mAddCallback(mStory.id, Data.Annotation, {});
        })
    let mAnnotationsList = [];


    function show(model, storyId) {
        mStory = model.getStory();
        mNameInput.setText(mStory.name)
        mBackgroundInput.setLabel(mStory.background ? mStory.background.name : "Default");
        Util.setComponentListLength(mModel3DsList, mStory.model3Ds.length, () => new ButtonInput(mModel3DsContainer))
        for (let i = 0; i < mStory.model3Ds.length; i++) {
            mModel3DsList[i].setId("model3D-button-" + mStory.model3Ds[i].id)
                .setLabel(mStory.model3Ds[i].name)
                .setOnClick(async () => await mNavigationCallback(mStory.model3Ds[i].id));
        }
        Util.setComponentListLength(mAnnotationsList, mStory.annotations.length, () => new ButtonInput(mAnnotationsContainer))
        for (let i = 0; i < mStory.annotations.length; i++) {
            mAnnotationsList[i].setId("annotation-button-" + mStory.annotations[i].id)
                .setLabel(mStory.annotations[i].name)
                .setOnClick(async () => await mNavigationCallback(mStory.annotations[i].id));
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
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}