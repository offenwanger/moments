import * as THREE from 'three';
import { TextInput } from "./text_input.js";

export function ComponentInput(container) {
    let mUpdateAttributeCallback = async () => { }
    let mComponentId = null;

    let mContainer = document.createElement('div');
    container.appendChild(mContainer);
    let mName = document.createElement('p');
    mContainer.appendChild(mName);

    let mPositionHeader = Object.assign(document.createElement('div'), { innerHTML: 'Position' })
    mContainer.appendChild(mPositionHeader);

    let mPositionXInput = new TextInput(mContainer, 'number')
        .setLabel("x")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mComponentId, { x: newNum });
        });
    let mPositionYInput = new TextInput(mContainer, 'number')
        .setLabel("y")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mComponentId, { y: newNum });
        });
    let mPositionZInput = new TextInput(mContainer, 'number')
        .setLabel("z")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mComponentId, { z: newNum });
        });

    mContainer.appendChild(Object.assign(document.createElement('div'), { innerHTML: 'Orientation' }));
    let mOrientationXInput = new TextInput(mContainer, 'number')
        .setLabel("x")
        .setOnChange(async (newNum) => {
            let x = newNum;
            let y = parseFloat(mOrientationYInput.getText());
            let z = parseFloat(mOrientationZInput.getText());
            let quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
            await mUpdateAttributeCallback(mComponentId, { orientation: quat.toArray() });
        });
    let mOrientationYInput = new TextInput(mContainer, 'number')
        .setLabel("y")
        .setOnChange(async (newNum) => {
            let y = newNum;
            let x = parseFloat(mOrientationXInput.getText());
            let z = parseFloat(mOrientationZInput.getText());
            let quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
            await mUpdateAttributeCallback(mComponentId, { orientation: quat.toArray() });
        });
    let mOrientationZInput = new TextInput(mContainer, 'number')
        .setLabel("z")
        .setOnChange(async (newNum) => {
            let z = newNum;
            let x = parseFloat(mOrientationXInput.getText());
            let y = parseFloat(mOrientationYInput.getText());
            let quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
            await mUpdateAttributeCallback(mComponentId, { orientation: quat.toArray() });
        });

    let mScaleInput = new TextInput(mContainer, 'number')
        .setLabel("Scale")
        .setOnChange(async (newNum) => {
            await mUpdateAttributeCallback(mComponentId, { scale: newNum });
        });

    function setId(id) {
        mContainer.setAttribute("id", id);
        mPositionXInput.setId(id + '-position-x-input')
        mPositionYInput.setId(id + '-position-y-input')
        mPositionZInput.setId(id + '-position-z-input')
        mOrientationXInput.setId(id + '-orientation-x-input')
        mOrientationYInput.setId(id + '-orientation-y-input')
        mOrientationZInput.setId(id + '-orientation-z-input')
        mScaleInput.setId(id + '-scale-input')
        return this;
    }

    function setPosition(position) {
        if (!position) {
            mPositionHeader.style['display'] = 'none';
            mPositionXInput.hide();
            mPositionYInput.hide();
            mPositionZInput.hide();
        } else {
            mPositionHeader.style['display'] = '';
            mPositionXInput.show();
            mPositionYInput.show();
            mPositionZInput.show();
            mPositionXInput.setText(Math.round(position.x * 1000) / 1000);
            mPositionYInput.setText(Math.round(position.y * 1000) / 1000);
            mPositionZInput.setText(Math.round(position.z * 1000) / 1000);
        }
        return this;
    }

    function setOrientation(quaterion) {
        let euler = (new THREE.Euler()).setFromQuaternion(
            new THREE.Quaternion().fromArray(quaterion), "XYZ")
        mOrientationXInput.setText(Math.round(euler.x * 1000) / 1000)
        mOrientationYInput.setText(Math.round(euler.y * 1000) / 1000)
        mOrientationZInput.setText(Math.round(euler.z * 1000) / 1000)
        return this;
    }

    function setScale(scale) {
        mScaleInput.setText(scale);
        return this;
    }

    function setName(name) {
        mName.textContent = name;
        return this;
    }

    this.show = () => mContainer.style['display'] = '';
    this.hide = () => mContainer.style['display'] = 'none';
    this.remove = () => { mContainer.remove() }
    this.onUpdateAttribute = (func) => mUpdateAttributeCallback = func;
    this.setComponentId = (id) => mComponentId = id;
    this.setId = setId;
    this.setPosition = setPosition;
    this.setOrientation = setOrientation;
    this.setScale = setScale;
    this.setName = setName;
}