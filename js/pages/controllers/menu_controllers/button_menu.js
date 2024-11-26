import * as ThreeMeshUI from 'three-mesh-ui';

export function ButtonMenu(width) {
    const PADDING = 0.1;
    let mButtons = [];
    let mRows = []

    const mContainer = new ThreeMeshUI.Block({
        padding: PADDING,
        width,
        borderRadius: 0.1,
        fontFamily: "../../../assets/menu_fonts/Roboto-msdf.json",
        fontTexture: "../../../assets/menu_fonts/Roboto-msdf.png",
    });
    mContainer.onAfterUpdate = function () {
        mContainer.position.set(
            mContainer.getWidth() / 2 + PADDING / 2,
            -mContainer.getHeight() / 2 - PADDING / 2,
            0);
    }

    function layout() {
        mContainer.remove(...mRows)
        mRows = [];
        for (let i = 0; i < mButtons.length; i += 3) {
            let buttons = mButtons.slice(i, i + 3);
            let row = new ThreeMeshUI.Block({
                contentDirection: 'row',
                backgroundOpacity: 0,
                justifyContent: 'center',
            });
            row.add(...buttons);
            mRows.push(row);
            mContainer.add(row)
        }
    }

    function add(...buttons) {
        mButtons.push(...buttons);
        layout();
    }

    function remove(...buttons) {
        mButtons.filter(b => !buttons.includes[b]);
        layout();
    }

    this.add = add;
    this.remove = remove;
    this.getObject = () => mContainer;
}
