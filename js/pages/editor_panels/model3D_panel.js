import { Util } from "../../utils/utility.js";
import { ButtonInput } from "../components/button_input.js";
import { ComponentInput } from '../components/component_input.js';
import { TextInput } from "../components/text_input.js";
import { TwoButtonInput } from '../components/two_button_input.js';

export function Model3DPanel(container) {
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mDeleteCallback = async (id) => { };
    let mSelectAsset = async () => { return false };
    let mNavigationCallback = async (id) => { };

    let mModel = null;
    let mModel3DId = null;
    let mModel3D = null;

    let mPanelContainer = container.append("div"); hide();

    let mBackButton = new ButtonInput(mPanelContainer)
        .setId('model3D-back-button')
        .setOnClick(async () => {
            mNavigationCallback(mModel.id);
        })

    let mNameInput = new TextInput(mPanelContainer)
        .setId('model3D-name-input')
        .setLabel("Name")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mModel3DId, { name: newText });
        });

    let mAssetButton = new ButtonInput(mPanelContainer)
        .setId('model3D-asset-button')
        .setOnClick(async () => {
            if (mModel3D.assetId) {
                mNavigationCallback(mModel3D.assetId)
            }
        })


    mPanelContainer.append('div').html("Component Values")
    let mAssetComponentContainer = mPanelContainer.append('div')
        .attr('id', 'component-list');
    let mAssetComponentList = [];

    let mDeleteButton = new ButtonInput(mPanelContainer)
        .setId('model3D-delete-button')
        .setLabel('Delete')
        .setOnClick(async () => {
            await mDeleteCallback(mModel3DId);
            await mNavigationCallback(mModel.id);
        })

    function show(model, model3DId) {
        mModel = model;
        mModel3DId = model3DId;
        mModel3D = mModel.find(mModel3DId);

        mBackButton.setLabel("<- Story");

        mNameInput.setText(mModel3D.name);

        let asset = model.find(mModel3D.assetId);
        mAssetButton.setLabel(asset ? asset.name : "<i>Not Set<i/>")

        Util.setComponentListLength(mAssetComponentList, mModel3D.poseIds.length, () => {
            let component = new ComponentInput(mAssetComponentContainer)
            component.onUpdateAttribute(async (id, attrs) => {
                await mUpdateAttributeCallback(id, attrs);
            });
            return component;
        })
        let poses = mModel.assetPoses.filter(p => mModel3D.poseIds.includes(p.id))
        for (let i = 0; i < poses.length; i++) {
            let pose = poses[i];
            mAssetComponentList[i].setId("component-" + pose.id)
                .setPosition(pose.type == "Mesh" ? pose : false)
                .setOrientation(pose.orientation)
                .setScale(pose.scale)
                .setName(pose.name)
                .setComponentId(pose.id);
        }

        mPanelContainer.style('display', '');
    }

    function hide() {
        mPanelContainer.style('display', 'none');
    }

    this.show = show;
    this.hide = hide;
    this.setUpdateAttributeCallback = (func) => mUpdateAttributeCallback = func;
    this.setDeleteCallback = (func) => mDeleteCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
    this.setSelectAsset = (func) => mSelectAsset = func;
}