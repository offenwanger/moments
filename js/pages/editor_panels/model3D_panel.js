import * as THREE from 'three';
import { IdUtil } from "../../utils/id_util.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";
import { TwoButtonInput } from '../components/two_button_input.js';

export function Model3DPanel(container) {
    let mAddCallback = async (parentId, itemClass, config) => { };
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mSelectAsset = async () => { return false };
    let mNavigationCallback = async (id) => { };

    let mModel = null;
    let mModel3DId = null;
    let mModel3D = null;
    let mParent = null;

    let mPanelContainer = container.append("div"); hide();

    let mBackButton = new ButtonInput(mPanelContainer)
        .setId('model3D-back-button')
        .setOnClick(async () => {
            mNavigationCallback(mParent.id);
        })

    let mNameInput = new TextInput(mPanelContainer)
        .setId('model3D-name-input')
        .setLabel("Name")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mModel3DId, 'name', newText);
        });

    let mAssetButton = new TwoButtonInput(mPanelContainer)
        .setId('model3D-asset-button')
        .setLabel(2, "✏️")
        .setOnClick(1, async () => {
            if (mModel3D.assetId) {
                mNavigationCallback(mModel3D.assetId)
            }
        })
        .setOnClick(2, async () => {
            let newAssetId = await mSelectAsset();
            if (newAssetId) {
                await mUpdateAttributeCallback(mModel3DId, 'assetId', newAssetId);
            }
        })

    let mPositionDiv = mPanelContainer.append('div').attr('id', 'model3D-position-input');
    mPositionDiv.append('div').html('Position');
    let mPositionXInput = new TextInput(mPositionDiv, 'number')
        .setId('model3D-position-x-input')
        .setLabel("x")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mModel3DId, 'x', newNum);
        });
    let mPositionYInput = new TextInput(mPositionDiv, 'number')
        .setId('model3D-position-y-input')
        .setLabel("y")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mModel3DId, 'y', newNum);
        });
    let mPositionZInput = new TextInput(mPositionDiv, 'number')
        .setId('model3D-position-z-input')
        .setLabel("z")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mModel3DId, 'z', newNum);
        });

    mPanelContainer.append('div').html('Orientation');
    let mOrientationXInput = new TextInput(mPanelContainer, 'number')
        .setId('model3D-orientation-x-input')
        .setLabel("x")
        .setOnChange(async (newNum) => {
            let x = newNum;
            let y = d3.select('#model3D-orientation-y-input').node().value;
            let z = d3.select('#model3D-orientation-z-input').node().value;
            let quat = new THREE.Quaternion().setFromEuler(x, y, z, 'XYZ');
            await mUpdateAttributeCallback(mModel3DId, 'orientation', quat.toArray());
        });
    let mOrientationYInput = new TextInput(mPanelContainer, 'number')
        .setId('model3D-orientation-y-input')
        .setLabel("y")
        .setOnChange(async (newNum) => {
            let y = newNum;
            let x = d3.select('#model3D-orientation-x-input').node().value;
            let z = d3.select('#model3D-orientation-z-input').node().value;
            let quat = new THREE.Quaternion().setFromEuler(x, y, z, 'XYZ');
            await mUpdateAttributeCallback(mModel3DId, 'orientation', quat.toArray());
        });
    let mOrientationZInput = new TextInput(mPanelContainer, 'number')
        .setId('model3D-orientation-z-input')
        .setLabel("z")
        .setOnChange(async (newNum) => {
            let z = newNum;
            let x = d3.select('#model3D-orientation-x-input').node().value;
            let y = d3.select('#model3D-orientation-y-input').node().value;
            let quat = new THREE.Quaternion().setFromEuler(x, y, z, 'XYZ');
            await mUpdateAttributeCallback(mModel3DId, 'orientation', quat.toArray());
        });

    let mSizeInput = new TextInput(mPanelContainer, 'number')
        .setId('model3D-size-input')
        .setLabel("Size")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mModel3DId, 'size', newNum);
        });

    function show(model, model3DId) {
        mModel = model;
        mModel3DId = model3DId;
        mModel3D = mModel.getModel3D(mModel3DId);
        mParent = mModel.getModel3DParent(mModel3DId);

        mBackButton.setLabel("<- " + IdUtil.getClass(mParent.id).name);

        mNameInput.setText(mModel3D.name);

        let asset = model.getAsset(mModel3D.assetId);
        mAssetButton.setLabel(1, asset ? asset.name : "<i>Not Set<i/>")

        mPositionXInput.setText(mModel3D.x);
        mPositionYInput.setText(mModel3D.y);
        mPositionZInput.setText(mModel3D.t);

        let euler = (new THREE.Euler()).setFromQuaternion(
            new THREE.Quaternion().fromArray(mModel3D.orientation), "XYZ")
        mOrientationXInput.setText(euler.x)
        mOrientationYInput.setText(euler.y)
        mOrientationZInput.setText(euler.z)

        mSizeInput.setText(mModel3D.size);

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
    this.setSelectAsset = (func) => mSelectAsset = func;
}