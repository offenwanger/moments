import * as ThreeMeshUI from 'three-mesh-ui';
import { MeshButton } from './mesh_button.js';

export function ButtonMenu(id, width, paginate = 0) {
    const PADDING = 0.1;
    let mOnAfterUpdateCallback = () => { }
    let mVOffset = 0
    let mPaginate = paginate;
    let mItemOffset = 0;

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
    mContainer.userData.id = id;
    mContainer.onAfterUpdate = function () {
        updatePosition();
        mOnAfterUpdateCallback()
    }

    function layout() {
        mContainer.remove(...mRows)
        mRows = [];
        let buttonsSubset = mButtons;
        if (mPaginate > 0) {
            let dynamicButtons = mButtons.filter(b => b.isDynamic());
            // wrap into the offset range, then ensure it's positive, then make sure it's not over the end of the line.
            let offset = ((mItemOffset % dynamicButtons.length) + dynamicButtons.length) % dynamicButtons.length;
            if (dynamicButtons.length > paginate) {
                let buttons = dynamicButtons.slice(offset, offset + mPaginate);
                if (buttons.length < mPaginate) {
                    buttons.unshift(...dynamicButtons.slice(0, mPaginate - buttons.length));
                }
                buttonsSubset = mButtons.filter(b => !b.isDynamic()).concat(buttons);
            }
        }
        for (let i = 0; i < buttonsSubset.length; i += 3) {
            let buttons = buttonsSubset.slice(i, i + 3);
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

        mContainer.update(true, true, false);
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

    function empty(dynamic = false) {
        if (dynamic) mButtons = mButtons.filter(b => !b.isDynamic());
        else mButtons = [];
        layout();
    }

    function incrementItemOffset() {
        mItemOffset += 3;
        layout();
    }
    function decrementItemOffset() {
        mItemOffset -= 3;
        layout();
    }

    this.add = add;
    this.remove = remove;
    this.empty = empty;
    this.getObject = () => mContainer;
    this.getButtons = () => [...mButtons];
    this.onAfterUpdate = (func) => mOnAfterUpdateCallback = func;
    this.setVOffset = setVOffset;
    this.incrementItemOffset = incrementItemOffset;
    this.decrementItemOffset = decrementItemOffset;
}
