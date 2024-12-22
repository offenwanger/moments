import * as ThreeMeshUI from 'three-mesh-ui';
import { AssetTypes, AttributeButtons, BrushToolButtons, ItemButtons, MENU_WIDTH, MenuNavButtons, RecordToolButtons, SurfaceToolButtons, ToolButtons } from '../../../constants.js';
import { ToolMode } from '../system_state.js';
import { ButtonMenu } from './button_menu.js';
import { MeshButton } from './mesh_button.js';

export function MenuController() {
    const BUTTON_SIZE = 0.4;

    let mToolMode = new ToolMode();
    let mSingleContainer = true;

    let mMenuContainer = new ThreeMeshUI.Block({ width: 0.001, height: 0.001, });
    let mCurrentMenuId = null;
    let mCurrentMenu = null;

    let mSubMenuContainer = new ThreeMeshUI.Block({ width: 0.001, height: 0.001, });
    let mCurrentSubMenuId = null;
    let mCurrentSubMenu = null;

    let mMenus = {};
    let mSubMenus = {};
    let mParentLinks = {}

    // Dynamic menus
    let mImageSelectMenu = createSelectMenu('ImageSelectMenu');
    let mAudioSelectMenu = createSelectMenu('AudioSelectMenu');
    let mModelSelectMenu = createSelectMenu('ModelSelectMenu');
    let mMomentSelectMenu = createSelectMenu('MomentSelectMenu');
    mMomentSelectMenu.add(new MeshButton(ItemButtons.NEW_MOMENT, '+', BUTTON_SIZE));

    mMenus[MenuNavButtons.MAIN_MENU] = createMenu(MenuNavButtons.MAIN_MENU, [
        new MeshButton(ToolButtons.MOVE, 'Move', BUTTON_SIZE),
        new MeshButton(ToolButtons.BRUSH, 'Brush', BUTTON_SIZE),
        new MeshButton(ToolButtons.SURFACE, 'Surface', BUTTON_SIZE),
        new MeshButton(ToolButtons.SCISSORS, 'Scissors', BUTTON_SIZE, 0xff0000),
        new MeshButton(ToolButtons.RECORD, 'Record', BUTTON_SIZE),
        new MeshButton(ItemButtons.RECENTER, 'Recenter', BUTTON_SIZE, 0xff0000),
        new MeshButton(MenuNavButtons.SPHERE_SETTINGS, 'Sphere Settings', BUTTON_SIZE),
        new MeshButton(MenuNavButtons.SETTINGS, 'Settings', BUTTON_SIZE, 0xff0000),
        new MeshButton(MenuNavButtons.ADD, 'Add', BUTTON_SIZE)
    ]);
    mCurrentMenuId = MenuNavButtons.MAIN_MENU;
    mCurrentMenu = mMenus[MenuNavButtons.MAIN_MENU];
    mMenuContainer.add(mCurrentMenu.getObject());

    mMenus[MenuNavButtons.SPHERE_SETTINGS] = createMenu(MenuNavButtons.SPHERE_SETTINGS, [
        new MeshButton(MenuNavButtons.BACK_BUTTON, 'Back', BUTTON_SIZE),
        new MeshButton(AttributeButtons.SPHERE_TOGGLE, 'Toggle', BUTTON_SIZE),
        new MeshButton(AttributeButtons.SPHERE_SCALE_UP, 'Scale Up', BUTTON_SIZE),
        new MeshButton(MenuNavButtons.SPHERE_IMAGE, 'Image', BUTTON_SIZE),
        new MeshButton(MenuNavButtons.SPHERE_COLOR, 'Color', BUTTON_SIZE, 0xff0000),
        new MeshButton(AttributeButtons.SPHERE_SCALE_DOWN, 'Scale Down', BUTTON_SIZE),
    ]);
    mParentLinks[MenuNavButtons.SPHERE_SETTINGS] = MenuNavButtons.MAIN_MENU;

    mMenus[MenuNavButtons.SPHERE_IMAGE] = mImageSelectMenu;
    mParentLinks[MenuNavButtons.SPHERE_IMAGE] = MenuNavButtons.SPHERE_SETTINGS;

    mMenus[MenuNavButtons.SETTINGS] = createMenu(MenuNavButtons.SETTINGS, [
        new MeshButton(MenuNavButtons.BACK_BUTTON, 'Back', BUTTON_SIZE),
    ]);
    mParentLinks[MenuNavButtons.SETTINGS] = MenuNavButtons.MAIN_MENU;

    mMenus[MenuNavButtons.ADD] = createMenu(MenuNavButtons.ADD, [
        new MeshButton(MenuNavButtons.BACK_BUTTON, 'Back', BUTTON_SIZE),
        new MeshButton(MenuNavButtons.ADD_AUDIO, 'Audio', BUTTON_SIZE),
        new MeshButton(MenuNavButtons.ADD_PICTURE, 'Picture', BUTTON_SIZE),
        new MeshButton(MenuNavButtons.ADD_MODEL, 'Model', BUTTON_SIZE),
        new MeshButton(MenuNavButtons.ADD_TELEPORT, 'Teleport', BUTTON_SIZE),
    ]);
    mParentLinks[MenuNavButtons.ADD] = MenuNavButtons.MAIN_MENU;

    mMenus[MenuNavButtons.ADD_AUDIO] = mAudioSelectMenu;
    mParentLinks[MenuNavButtons.ADD_AUDIO] = MenuNavButtons.ADD;

    mMenus[MenuNavButtons.ADD_PICTURE] = mImageSelectMenu;
    mParentLinks[MenuNavButtons.ADD_PICTURE] = MenuNavButtons.ADD;

    mMenus[MenuNavButtons.ADD_MODEL] = mModelSelectMenu;
    mParentLinks[MenuNavButtons.ADD_MODEL] = MenuNavButtons.ADD;

    mMenus[MenuNavButtons.ADD_TELEPORT] = mMomentSelectMenu;
    mParentLinks[MenuNavButtons.ADD_TELEPORT] = MenuNavButtons.ADD;

    // Submenus
    mSubMenus[ToolButtons.BRUSH] = createMenu(ToolButtons.BRUSH, [
        new MeshButton(BrushToolButtons.UNBLUR, 'Unblur', BUTTON_SIZE),
        new MeshButton(BrushToolButtons.BLUR, 'Blur', BUTTON_SIZE),
        new MeshButton(BrushToolButtons.COLOR, 'Color', BUTTON_SIZE, 0xff0000),
    ]);
    mSubMenus[ToolButtons.SURFACE] = createMenu(ToolButtons.SURFACE, [
        new MeshButton(SurfaceToolButtons.FLATTEN, 'Flatten', BUTTON_SIZE),
        new MeshButton(SurfaceToolButtons.PULL, 'Pull', BUTTON_SIZE),
        new MeshButton(SurfaceToolButtons.RESET, 'Reset', BUTTON_SIZE),
    ]);
    mSubMenus[ToolButtons.RECORD] = createMenu(ToolButtons.RECORD, [
        new MeshButton(RecordToolButtons.REWIND, 'Rewind', BUTTON_SIZE),
        new MeshButton(RecordToolButtons.PLAYPAUSE, 'Play/Pause', BUTTON_SIZE),
        new MeshButton(RecordToolButtons.FORWARD, 'Forward', BUTTON_SIZE),
        new MeshButton(RecordToolButtons.ACCEPT, 'Accept', BUTTON_SIZE),
        new MeshButton(RecordToolButtons.DELETE, 'Delete', BUTTON_SIZE),
    ]);

    function setContainer(container1, container2) {
        container1.add(mMenuContainer);
        if (container2) {
            mSingleContainer = false;
            container2.add(mSubMenuContainer);
        } else {
            mSingleContainer = true;
            container1.add(mSubMenuContainer);
        }
    }

    function showMenu(menuId) {
        if (menuId == MenuNavButtons.PREVIOUS_BUTTON) {
            mMenus[mCurrentMenuId].decrementItemOffset(); return;
        }

        if (menuId == MenuNavButtons.NEXT_BUTTON) {
            mMenus[mCurrentMenuId].incrementItemOffset(); return;
        }

        mMenuContainer.remove(mCurrentMenu.getObject());
        if (menuId == MenuNavButtons.BACK_BUTTON) {
            menuId = mParentLinks[mCurrentMenuId];
            if (!menuId) { console.error('No parent specified for ' + mCurrentMenuId); }
        }

        mCurrentMenuId = menuId
        mCurrentMenu = mMenus[menuId];

        if (!mCurrentMenu) {
            console.error("No menu for " + menuId);
            mCurrentMenuId = menuId
            mCurrentMenu = mMenus[MenuNavButtons.MAIN_MENU];
        }

        mMenuContainer.add(mCurrentMenu.getObject());
        mCurrentMenuId = menuId;
        if (mSingleContainer && mCurrentSubMenu) {
            mCurrentSubMenu.setVOffset(menu.getObject().getHeight())
        }
    }

    function showSubMenu(menuId) {
        if (mCurrentSubMenu) mSubMenuContainer.remove(mCurrentSubMenu.getObject());

        mCurrentSubMenuId = menuId;
        mCurrentSubMenu = mSubMenus[menuId];
        if (!mCurrentSubMenu) {
            mCurrentSubMenu = null
            mCurrentSubMenuId = null;
        }

        if (mCurrentSubMenu) mSubMenuContainer.add(mCurrentSubMenu.getObject());
        if (mSingleContainer && mCurrentSubMenu) {
            mCurrentSubMenu.setVOffset(mCurrentMenu.getObject().getHeight())
        }
    }

    async function updateModel(model, assetUtil) {
        mImageSelectMenu.empty(true)
        mAudioSelectMenu.empty(true)
        mModelSelectMenu.empty(true)
        for (let asset of model.assets) {
            let menu;
            if (asset.type == AssetTypes.MODEL) {
                menu = mModelSelectMenu;
            } else if (asset.type == AssetTypes.IMAGE) {
                menu = mImageSelectMenu;
            } else if (asset.type == AssetTypes.AUDIO) {
                menu = mAudioSelectMenu;
            } else if (asset.type == AssetTypes.PHOTOSPHERE_BLUR || asset.type == AssetTypes.PHOTOSPHERE_COLOR) {
                // no menu for these
                continue;
            } else {
                console.error('Invalid type: ' + asset.type);
                continue;
            }
            let button = new MeshButton(asset.id, asset.name, BUTTON_SIZE, 0xffffff, true);
            menu.add(button);
        }
        mMomentSelectMenu.empty(true)
        for (let moment of model.moments) {
            let button = new MeshButton(moment.id, moment.name, BUTTON_SIZE, 0xffffff, true);
            mMomentSelectMenu.add(button);
        }
    }

    function setToolMode(toolMode) {
        mMenus[MenuNavButtons.MAIN_MENU].getButtons().find(b => b.getId() == mToolMode.tool)?.deactivate();
        mSubMenus[ToolButtons.BRUSH].getButtons().find(b => b.getId() == mToolMode.brushSettings.mode)?.deactivate();
        mSubMenus[ToolButtons.SURFACE].getButtons().find(b => b.getId() == mToolMode.surfaceSettings.mode)?.deactivate();

        mToolMode = toolMode.clone();

        mMenus[MenuNavButtons.MAIN_MENU].getButtons().find(b => b.getId() == mToolMode.tool)?.activate();
        mSubMenus[ToolButtons.BRUSH].getButtons().find(b => b.getId() == mToolMode.brushSettings.mode)?.activate();
        mSubMenus[ToolButtons.SURFACE].getButtons().find(b => b.getId() == mToolMode.surfaceSettings.mode)?.activate();
    }

    function render() {
        ThreeMeshUI.update();
    }

    function getTargets(raycaster, toolMode) {
        for (let button of mCurrentMenu.getButtons()) {
            const intersection = raycaster.intersectObject(button.getObject(), true);
            if (intersection[0]) {
                return [button.getTarget(intersection[0])]
            };
        }
        if (mCurrentSubMenu) {
            for (let button of mCurrentSubMenu.getButtons()) {
                const intersection = raycaster.intersectObject(button.getObject(), true);
                if (intersection[0]) {
                    return [button.getTarget(intersection[0])]
                };
            }
        }
        return [];
    }

    function createSelectMenu(id) {
        return createMenu(id, [
            new MeshButton(MenuNavButtons.BACK_BUTTON, 'Back', BUTTON_SIZE),
            new MeshButton(MenuNavButtons.PREVIOUS_BUTTON, 'Prev', BUTTON_SIZE),
            new MeshButton(MenuNavButtons.NEXT_BUTTON, 'Next', BUTTON_SIZE),
        ], 6);
    }

    function createMenu(id, buttons, paginate = 0) {
        let menu = new ButtonMenu(id, MENU_WIDTH, paginate);
        menu.add(...buttons);
        menu.onAfterUpdate(() => {
            if (mSingleContainer && menu == mCurrentMenu && mCurrentSubMenu) {
                mCurrentSubMenu.setVOffset(menu.getObject().getHeight())
            }
        })
        return menu;
    }

    this.setContainer = setContainer;
    this.setToolMode = setToolMode;
    this.updateModel = updateModel;
    this.showMenu = showMenu;
    this.showSubMenu = showSubMenu;
    this.getCurrentMenuId = () => mCurrentMenuId;
    this.onToolChange = func => mToolChangeCallback = func;
    this.getMode = () => mToolMode;
    this.render = render
    this.getTargets = getTargets;
}
