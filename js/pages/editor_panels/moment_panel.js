import * as THREE from 'three';
import { Data } from "../../data_structs.js";
import { ButtonInput } from "../components/button_input.js";
import { TextInput } from "../components/text_input.js";
import { ToggleInput } from "../components/toggle_input.js";
import { Util } from '../../utils/utility.js';

export function MomentPanel(container) {
    let mAddCallback = async (parentId, itemClass, config) => { };
    let mUpdateAttributeCallback = async (id, attr, value) => { };
    let mDeleteCallback = async (id) => { };
    let mNavigationCallback = async (id) => { };
    let mScrollHeight = 0;

    let mModel = null
    let mMomentId = "";
    let mMoment = null;

    let mPanelContainer = container.append("div"); hide();
    let mBackToStoryButton = new ButtonInput(mPanelContainer)
        .setId('moment-back-button')
        .setLabel('<- Story')
        .setOnClick(async () => {
            await mNavigationCallback(mModel.getStory().id);
        })
    let mNameInput = new TextInput(mPanelContainer)
        .setId('moment-name-input')
        .setLabel("Name")
        .setOnChange(async (newText) => {
            await mUpdateAttributeCallback(mMomentId, 'name', newText);
        });
    let mIsFramedInput = new ToggleInput(mPanelContainer)
        .setId('moment-framed-input')
        .setLabel("Framed")
        .setOnChange(async (newVal) => {
            await mUpdateAttributeCallback(mMomentId, 'framed', newVal);
        });
    let mIsStorylineInput = new ToggleInput(mPanelContainer)
        .setId('moment-storyline-input')
        .setLabel("Storyline")
        .setOnChange(async (newVal) => {
            await mUpdateAttributeCallback(mMomentId, 'storyline', newVal);
        });

    // Show if is Storyline
    let mOffsetTDiv = mPanelContainer.append('div').attr('id', 'moment-offset-input');
    mOffsetTDiv.append('div').html('Offset');
    let mOffsetXInput = new TextInput(mOffsetTDiv, 'number')
        .setId('moment-offset-x-input')
        .setLabel("x")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mMomentId, 'x', newNum);
        });
    let mOffsetYInput = new TextInput(mOffsetTDiv, 'number')
        .setId('moment-offset-y-input')
        .setLabel("y")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mMomentId, 'y', newNum);
        });
    let mOffsetTInput = new TextInput(mOffsetTDiv, 'number')
        .setId('moment-offset-t-input')
        .setLabel("t")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mMomentId, 't', newNum);
        });

    let mPositionDiv = mPanelContainer.append('div').attr('id', 'moment-position-input');
    mPositionDiv.append('div').html('Position');
    let mPositionXInput = new TextInput(mPositionDiv, 'number')
        .setId('moment-position-x-input')
        .setLabel("x")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mMomentId, 'x', newNum);
        });
    let mPositionYInput = new TextInput(mPositionDiv, 'number')
        .setId('moment-position-y-input')
        .setLabel("y")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mMomentId, 'y', newNum);
        });
    let mPositionZInput = new TextInput(mPositionDiv, 'number')
        .setId('moment-position-z-input')
        .setLabel("z")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mMomentId, 'z', newNum);
        });

    mPanelContainer.append('div').html('Orientation');
    let mOrientationXInput = new TextInput(mPanelContainer, 'number')
        .setId('moment-orientation-x-input')
        .setLabel("x")
        .setOnChange(async (newNum) => {
            let x = newNum;
            let y = d3.select('#moment-orientation-y-input').node().value;
            let z = d3.select('#moment-orientation-z-input').node().value;
            let quat = new THREE.Quaternion().setFromEuler(x, y, z, 'XYZ');
            await mUpdateAttributeCallback(mMomentId, 'orientation', quat.toArray());
        });
    let mOrientationYInput = new TextInput(mPanelContainer, 'number')
        .setId('moment-orientation-y-input')
        .setLabel("y")
        .setOnChange(async (newNum) => {
            let y = newNum;
            let x = d3.select('#moment-orientation-x-input').node().value;
            let z = d3.select('#moment-orientation-z-input').node().value;
            let quat = new THREE.Quaternion().setFromEuler(x, y, z, 'XYZ');
            await mUpdateAttributeCallback(mMomentId, 'orientation', quat.toArray());
        });
    let mOrientationZInput = new TextInput(mPanelContainer, 'number')
        .setId('moment-orientation-z-input')
        .setLabel("z")
        .setOnChange(async (newNum) => {
            let z = newNum;
            let x = d3.select('#moment-orientation-x-input').node().value;
            let y = d3.select('#moment-orientation-y-input').node().value;
            let quat = new THREE.Quaternion().setFromEuler(x, y, z, 'XYZ');
            await mUpdateAttributeCallback(mMomentId, 'orientation', quat.toArray());
        });

    let mSizeInput = new TextInput(mPanelContainer, 'number')
        .setId('moment-size-input')
        .setLabel("Size")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mMomentId, 'size', newNum);
        });
    let mScaleInput = new TextInput(mPanelContainer, 'number')
        .setId('moment-scale-input')
        .setLabel("Scale")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mMomentId, 'scale', newNum);
        });


    let mModel3DsContainer = mPanelContainer.append('div').attr('id', 'moment-model3Ds');
    let mModel3DsHeader = new ButtonInput(mModel3DsContainer)
        .setId('moment-model3D-add-button')
        .setLabel('Model3Ds [+]')
        .setOnClick(async () => {
            await mAddCallback(mMoment.id, Data.Model3D, {});
        })
    let mModel3DsList = [];

    let mAnnotationButton = new ButtonInput(mPanelContainer)
        .setId('moment-sole-annotation-button')
        .setLabel('Annotation')
        .setOnClick(async () => {
            await mNavigationCallback(mMoment.annotations[0].id);
        })
    let mAnnotationsContainer = mPanelContainer.append('div').attr('id', 'moment-annotations');
    let mAnnotationsHeader = new ButtonInput(mAnnotationsContainer)
        .setId('moment-annotations-add-button')
        .setLabel('Annotations [+]')
        .setOnClick(async () => {
            await mAddCallback(mMoment.id, Data.Annotation, {});
        })
    let mAnnotationsList = [];

    let mPointersContainer = mPanelContainer.append('div').attr('id', 'moment-pointers');
    let mPointersHeader = new ButtonInput(mPointersContainer)
        .setId('moment-pointers-add-button')
        .setLabel('Pointers [+]')
        .setOnClick(async () => {
            await mAddCallback(mMoment.id, Data.Pointer, {});
        })
    let mPointersList = [];

    let mDeleteButton = new ButtonInput(mPanelContainer)
        .setId('model3D-delete-button')
        .setLabel('Delete')
        .setOnClick(async () => {
            await mDeleteCallback(mMomentId);
            await mNavigationCallback(mModel.getStory().id);
        })

    function show(model, momentId) {
        mModel = model;
        mMomentId = momentId;
        mMoment = mModel.getMoment(momentId);

        // set all the values for the inputs
        mNameInput.setText(mMoment.name);
        mIsStorylineInput.setValue(mMoment.storyline)
        mIsFramedInput.setValue(mMoment.framed)

        // just set everything then display the right stuff
        mOffsetXInput.setText(mMoment.x);
        mOffsetYInput.setText(mMoment.y);
        mOffsetTInput.setText(mMoment.t);

        mPositionXInput.setText(mMoment.x);
        mPositionYInput.setText(mMoment.y);
        mPositionZInput.setText(mMoment.t);

        let euler = (new THREE.Euler()).setFromQuaternion(
            new THREE.Quaternion().fromArray(mMoment.orientation), "XYZ")
        mOrientationXInput.setText(euler.x)
        mOrientationYInput.setText(euler.y)
        mOrientationZInput.setText(euler.z)

        mSizeInput.setText(mMoment.size);
        mScaleInput.setText(mMoment.scale);

        Util.setComponentListLength(mModel3DsList, mMoment.model3Ds.length, () => new ButtonInput(mModel3DsContainer))
        for (let i = 0; i < mMoment.model3Ds.length; i++) {
            mModel3DsList[i].setId("model3D-button-" + mMoment.model3Ds[i].id)
                .setLabel(mMoment.model3Ds[i].name)
                .setOnClick(async () => await mNavigationCallback(mMoment.model3Ds[i].id));
        }
        Util.setComponentListLength(mAnnotationsList, mMoment.annotations.length, () => new ButtonInput(mAnnotationsContainer))
        for (let i = 0; i < mMoment.annotations.length; i++) {
            mAnnotationsList[i].setId("annotation-button-" + mMoment.annotations[i].id)
                .setLabel(mMoment.annotations[i].name)
                .setOnClick(async () => await mNavigationCallback(mMoment.annotations[i].id));
        }

        let pointers = mModel.getPointersFor(mMomentId);
        Util.setComponentListLength(mPointersList, pointers.length, () => new ButtonInput(mPointersContainer))
        for (let i = 0; i < pointers.length; i++) {
            let item1 = mModel.getById(pointers.fromId);
            let item2 = mModel.getById(pointers.toId);
            mPointersList[i].setId("pointer-button-" + pointers[i].id)
                .setLabel(item1 ? item1.name : "[-]" + "->" + item2 ? item2.name : "[-]")
                .setOnClick(async () => await mNavigationCallback(pointers[i].id));
        }

        // update the view
        if (mMoment.storyline) {
            mPositionDiv.style('display', 'none')
            mOffsetTDiv.style('display', '')
        } else {
            mPositionDiv.style('display', '')
            mOffsetTDiv.style('display', 'none')
        }

        if (mMoment.framed) {
            mScaleInput.show()
            mAnnotationsContainer.style('display', 'none');
            mAnnotationButton.show();
        } else {
            mScaleInput.hide()
            mAnnotationsContainer.style('display', '');
            mAnnotationButton.hide();
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
    this.setDeleteCallback = (func) => mDeleteCallback = func;
    this.setNavigationCallback = (func) => mNavigationCallback = func;
}