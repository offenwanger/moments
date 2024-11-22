import { Data } from "../../data.js";
import { Util } from "../../utils/utility.js";
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
            await mUpdateAttributeCallback(mStory.id, { name: newText });
        });

    let mMomentsContainer = mPanelContainer.append('div')
        .attr('id', 'story-moments');
    let mMomentsAddButton = new ButtonInput(mMomentsContainer)
        .setId('story-moment-add-button')
        .setLabel('Moments [+]')
        .setOnClick(async () => {
            await mAddCallback(mStory.id, Data.Moment, {});
        })
    let mMomentsList = [];

    function show(model) {
        mStory = model;
        mNameInput.setText(mStory.name)
        Util.setComponentListLength(mMomentsList, mStory.moments.length, () => new ButtonInput(mMomentsContainer))
        for (let i = 0; i < mStory.moments.length; i++) {
            mMomentsList[i].setId("moment-button-" + mStory.moments[i].id)
                .setLabel(mStory.moments[i].name)
                .setOnClick(async () => await mNavigationCallback(mStory.moments[i].id));
        }

        mPanelContainer.style('display', '');
    }

    function hide() {
        mPanelContainer.style('display', 'none');
    }

    this.show = show;
    this.hide = hide;

    this.onAdd = (func) => mAddCallback = func;
    this.setUpdateAttributeCallback = (func) => mUpdateAttributeCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}