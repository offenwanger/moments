import { Util } from "../../utils/utility.js";
import { ButtonInput } from "../components/button_input.js";
import { ComponentInput } from '../components/component_input.js';
import { TextInput } from "../components/text_input.js";

export function PoseableAssetPanel(container) {
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mDeleteCallback = async (id) => { };
    let mNavigationCallback = async (id) => { };

    let mModel = null;
    let mPoseableAssetId = null;
    let mPoseableAsset = null;

    let mPanelContainer = document.createElement("div")
    container.appendChild(mPanelContainer);
    hide();

    let mBackButton = new ButtonInput(mPanelContainer)
        .setId('poseableAsset-back-button')
        .setOnClick(async () => {
            mNavigationCallback(mModel.id);
        })

    let mNameInput = new TextInput(mPanelContainer)
        .setId('poseableAsset-name-input')
        .setLabel("Name")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mPoseableAssetId, { name: newText });
        });

    let mAssetButton = new ButtonInput(mPanelContainer)
        .setId('poseableAsset-asset-button')
        .setOnClick(async () => {
            if (mPoseableAsset.assetId) {
                mNavigationCallback(mPoseableAsset.assetId)
            }
        })


    let mLabel = document.createElement('div');
    mLabel.textContent = "Component Values";
    mPanelContainer.appendChild(mLabel);

    let mAssetComponentContainer = document.createElement('div');
    mAssetComponentContainer.setAttribute('id', 'component-list');
    mPanelContainer.appendChild(mAssetComponentContainer)
    let mAssetComponentList = [];

    let mDeleteButton = new ButtonInput(mPanelContainer)
        .setId('poseableAsset-delete-button')
        .setLabel('Delete')
        .setOnClick(async () => {
            await mDeleteCallback(mPoseableAssetId);
            await mNavigationCallback(mModel.id);
        })

    function show(model, poseableAssetId) {
        mModel = model;
        mPoseableAssetId = poseableAssetId;
        mPoseableAsset = mModel.find(mPoseableAssetId);

        mBackButton.setLabel("<- Story");

        mNameInput.setText(mPoseableAsset.name);

        let asset = model.find(mPoseableAsset.assetId);
        mAssetButton.setLabel(asset ? asset.name : "<i>Not Set<i/>")

        Util.setComponentListLength(mAssetComponentList, mPoseableAsset.poseIds.length, () => {
            let component = new ComponentInput(mAssetComponentContainer)
            component.onUpdateAttribute(async (id, attrs) => {
                await mUpdateAttributeCallback(id, attrs);
            });
            return component;
        })
        let poses = mModel.assetPoses.filter(p => mPoseableAsset.poseIds.includes(p.id))
        for (let i = 0; i < poses.length; i++) {
            let pose = poses[i];
            mAssetComponentList[i].setId("component-" + pose.id)
                .setPosition(pose.type == "Mesh" ? pose : false)
                .setOrientation(pose.orientation)
                .setScale(pose.scale)
                .setName(pose.name)
                .setComponentId(pose.id);
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
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}