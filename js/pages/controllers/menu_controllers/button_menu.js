import * as ThreeMeshUI from 'three-mesh-ui';
import { MeshButton } from './mesh_button.js';

export function ButtonMenu(id, width) {
    const PADDING = 0.1;
    let mOnAfterUpdateCallback = () => { }
    let mVOffset = 0

    let mId = id;
    // set of MeshButtons
    let mButtons = [];
    let mRows = []

    const mContainer = new ThreeMeshUI.Block({
        padding: PADDING,
        width,
        borderRadius: 0.1,
        alignItems: 'start',
        fontFamily: "../../../assets/menu_fonts/Roboto-msdf.json",
        fontTexture: "../../../assets/menu_fonts/Roboto-msdf.png",
    });
    mContainer.onAfterUpdate = function () {
        updatePosition();
        mOnAfterUpdateCallback()
    }

    function layout() {
        mContainer.remove(...mRows)
        mRows = [];
        for (let i = 0; i < mButtons.length; i += 3) {
            let buttons = mButtons.slice(i, i + 3);
            let row = new ThreeMeshUI.Block({
                contentDirection: 'row',
                backgroundOpacity: 0,
                alignItems: 'start',
                fontFamily: "../../../assets/menu_fonts/Roboto-msdf.json",
                fontTexture: "../../../assets/menu_fonts/Roboto-msdf.png",
            });
            row.add(...buttons.map(b => b.getObject()));
            mRows.push(row);
            mContainer.add(row)
        }

        mContainer.update(false, true, false);
    }

    function setVOffset(offset) {
        mVOffset = offset + PADDING;
        updatePosition();
    }

    function updatePosition() {
        mContainer.position.set(
            mContainer.getWidth() / 2 + PADDING / 2,
            -mContainer.getHeight() / 2 - PADDING / 2 - mVOffset,
            0);
    }

    /**
     * Add mesh buttons.
     * @param  {...MeshButton} buttons 
     */
    function add(...buttons) {
        mButtons.push(...buttons);
        layout();
    }

    /**
     * remove mesh buttons.
     * @param  {...MeshButton} buttons 
     */
    function remove(...buttons) {
        let ids = buttons.map(b => b.getId())
        mButtons = mButtons.filter(b => !ids.includes(b.getId()));
        layout();
    }

    this.add = add;
    this.remove = remove;
    this.getObject = () => mContainer;
    this.getButtons = () => [...mButtons];
    this.onAfterUpdate = (func) => mOnAfterUpdateCallback = func;
    this.setVOffset = setVOffset;
}
