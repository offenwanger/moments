import { Data } from "../../data_structs.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";

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

    let mPathInput = new ButtonInput(mPanelContainer, true)
        .setId('story-path-button')
        .setLabel('Edit Story Line')
        .setSecondLabel('✏️')
        .setOnClick(async () => {
            console.error("Not implemented");
        })

    let mBackgroundInput = new ButtonInput(mPanelContainer, true)
        .setId('story-background-button')
        .setSecondLabel('✏️')
        .setOnClick(async () => {
            console.error("Not implemented");
        })

    let mMomentsContainer = mPanelContainer.append('div').attr('id', 'story-moments');
    let mMomentsHeader = new ButtonInput(mMomentsContainer, false)
        .setId('story-moments-add-button')
        .setLabel('Moments [+]')
        .setOnClick(async () => {
            await mAddCallback(mStory.id, Data.Moment, {});
        })
    let mMomentsList = [];

    let mModel3DsContainer = mPanelContainer.append('div').attr('id', 'story-moments');
    let mModel3DsHeader = new ButtonInput(mModel3DsContainer, false)
        .setId('story-model3D-add-button')
        .setLabel('Model3Ds [+]')
        .setOnClick(async () => {
            await mAddCallback(mStory.id, Data.Model3D, {});
        })
    let mModel3DsList = [];

    let mAnnotationsContainer = mPanelContainer.append('div').attr('id', 'story-moments');
    let mAnnotationsHeader = new ButtonInput(mAnnotationsContainer, false)
        .setId('story-annotations-add-button')
        .setLabel('Annotations [+]')
        .setOnClick(async () => {
            await mAddCallback(mStory.id, Data.Annotation, {});
        })
    let mAnnotationsList = [];


    function show(story) {
        mStory = story;
        mNameInput.setText(mStory.name)
        mBackgroundInput.setLabel(mStory.background ? mStory.background.name : "<not set>");
        // ensure we have the right number of moments buttons
        setComponentListLength(mMomentsList, mStory.moments.length, () => new ButtonInput(mMomentsContainer))
        for (let i = 0; i < mStory.moments.length; i++) {
            mMomentsList[i].setId("moment-button-" + mStory.moments[i].id)
                .setLabel(mStory.moments[i].name)
                .setOnClick(async () => await mNavigationCallback(mStory.moments[i].id));
        }
        setComponentListLength(mModel3DsList, mStory.model3Ds.length, () => new ButtonInput(mModel3DsContainer))
        for (let i = 0; i < mStory.model3Ds.length; i++) {
            mModel3DsList[i].setId("model3D-button-" + mStory.model3Ds[i].id)
                .setLabel(mStory.model3Ds[i].name)
                .setOnClick(async () => await mNavigationCallback(mStory.model3Ds[i].id));
        }
        setComponentListLength(mAnnotationsList, mStory.annotations.length, () => new ButtonInput(mAnnotationsContainer))
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

    function setComponentListLength(arr, length, createCallback) {
        for (let i = arr.length; i < length; i++) {
            arr.push(createCallback());
        }
        for (let i = length; i < arr; i++) {
            arr[i].remove();
            delete arr[i];
        }
    }

    this.show = show;
    this.hide = hide;

    this.setAddCallback = (func) => mAddCallback = func;
    this.setUpdateAttributeCallback = (func) => mUpdateAttributeCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}