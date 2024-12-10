import * as ThreeMeshUI from 'three-mesh-ui';
import { AssetTypes, AttributeButtons, BrushToolButtons, ItemButtons, MENU_WIDTH, MenuNavButtons, SurfaceToolButtons, ToolButtons } from '../../../constants.js';
import { ToolMode } from '../system_state.js';
import { ButtonMenu } from './button_menu.js';
import { MeshButton } from './mesh_button.js';

export function MenuController() {
    const BUTTON_SIZE = 0.4;

    let mToolMode = new ToolMode();

    let mMainMenu = createMainMenu()
    let mSphereSettingsMenu = createSphereMenu();
    let mImageSelectMenu = createAssetSelectMenu('ImageSelectMenu');
    let mAudioSelectMenu = createAssetSelectMenu('AudioSelectMenu');
    let mModelSelectMenu = createAssetSelectMenu('ModelSelectMenu');
    let mColorSelectMenu = createColorSelectMenu();
    let mBrushSettingsMenu = createBrushSettingsMenu();
    let mSurfaceSettingsMenu = createSurfaceSettingsMenu();

    // needed to adjust the menu positioning
    let mMenuContainer = new ThreeMeshUI.Block({ width: 0.001, height: 0.001, });
    let mCurrentMenuId = MenuNavButtons.MAIN_MENU;
    let mCurrentMenu = mMainMenu;
    mMenuContainer.add(mCurrentMenu.getObject());

    let mSubMenuContainer = new ThreeMeshUI.Block({ width: 0.001, height: 0.001, });
    let mCurrentSubMenuId = null;
    let mCurrentSubMenu = null;
    let mSingleContainer = true;

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

    function setToolMode(toolMode) {
        mMainMenu.getButtons().find(b => b.getId() == mToolMode.tool)?.deactivate();
        mBrushSettingsMenu.getButtons().find(b => b.getId() == mToolMode.brushSettings.mode)?.deactivate();
        mSurfaceSettingsMenu.getButtons().find(b => b.getId() == mToolMode.surfaceSettings.mode)?.deactivate();

        mToolMode = toolMode.clone();

        mMainMenu.getButtons().find(b => b.getId() == mToolMode.tool)?.activate();
        mBrushSettingsMenu.getButtons().find(b => b.getId() == mToolMode.brushSettings.mode)?.activate();
        mSurfaceSettingsMenu.getButtons().find(b => b.getId() == mToolMode.surfaceSettings.mode)?.activate();
    }

    function showMenu(buttonId) {
        mMenuContainer.remove(mCurrentMenu.getObject());
        if (buttonId == MenuNavButtons.SPHERE_SETTINGS) {
            mCurrentMenu = mSphereSettingsMenu;
        } else if (buttonId == MenuNavButtons.SPHERE_IMAGE) {
            mCurrentMenu = mImageSelectMenu;
        } else if (buttonId == MenuNavButtons.SPHERE_COLOR) {
            mCurrentMenu = mColorSelectMenu;
        } else if (buttonId == MenuNavButtons.SETTINGS) {
            console.error('Show the settings menu.')
        } else if (buttonId == MenuNavButtons.ADD) {
            console.error('Show the add menu.')
        } else if (buttonId == MenuNavButtons.MAIN_MENU) {
            mCurrentMenu = mMainMenu;
        } else if (buttonId == MenuNavButtons.BACK_BUTTON) {
            if (mCurrentMenuId == MenuNavButtons.SPHERE_IMAGE || mCurrentMenuId == MenuNavButtons.SPHERE_COLOR) {
                mCurrentMenu = mSphereSettingsMenu;
            } else {
                console.error('Back not implimented for ' + mCurrentMenuId);
                mCurrentMenu = mMainMenu;
            }
        } else {
            console.error('Invalid menu! ' + buttonId);
            mCurrentMenu = mMainMenu;
        }
        mMenuContainer.add(mCurrentMenu.getObject());
        mCurrentMenuId = buttonId;
        if (mSingleContainer && mCurrentSubMenu) {
            mCurrentSubMenu.setVOffset(menu.getObject().getHeight())
        }
    }

    function showSubMenu(buttonId) {
        if (mCurrentSubMenu) mSubMenuContainer.remove(mCurrentSubMenu.getObject());
        mCurrentSubMenu = null;
        if (buttonId == ToolButtons.BRUSH) {
            mCurrentSubMenu = mBrushSettingsMenu;
        } else if (buttonId == ToolButtons.SURFACE) {
            mCurrentSubMenu = mSurfaceSettingsMenu;
        } else if (!buttonId) {
            // clearing the menu.
        } else {
            console.error("Invalid SubMenu");
        }

        if (mCurrentSubMenu) mSubMenuContainer.add(mCurrentSubMenu.getObject());
        mCurrentSubMenuId = buttonId;

        if (mSingleContainer && mCurrentSubMenu) {
            mCurrentSubMenu.setVOffset(mCurrentMenu.getObject().getHeight())
        }
    }

    async function updateModel(model, assetUtil) {
        for (let menu of [mImageSelectMenu, mAudioSelectMenu, mModelSelectMenu]) {
            menu.getButtons().forEach(b => {
                if (!Object.values(MenuNavButtons).includes(b.getId())) {
                    mImageSelectMenu.remove(b);
                }
            });
        }
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
            let button = new MeshButton(asset.id, asset.name, BUTTON_SIZE);
            menu.add(button);
        }
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

    function createMainMenu() {
        let menu = new ButtonMenu(MenuNavButtons.MAIN_MENU, MENU_WIDTH);
        menu.onAfterUpdate(() => { afterUpdate(menu); })
        menu.add(
            new MeshButton(ToolButtons.MOVE, 'Move', BUTTON_SIZE),
            new MeshButton(ToolButtons.BRUSH, 'Brush', BUTTON_SIZE),
            new MeshButton(ToolButtons.SURFACE, 'Surface', BUTTON_SIZE),
            new MeshButton(ToolButtons.SCISSORS, 'Scissors', BUTTON_SIZE),
            new MeshButton(ToolButtons.RECORD, 'Record', BUTTON_SIZE),
            new MeshButton(ItemButtons.RECENTER, 'Recenter', BUTTON_SIZE),
            new MeshButton(MenuNavButtons.SPHERE_SETTINGS, 'Sphere Settings', BUTTON_SIZE),
            new MeshButton(MenuNavButtons.SETTINGS, 'Settings', BUTTON_SIZE),
            new MeshButton(MenuNavButtons.ADD, 'Add', BUTTON_SIZE)
        );
        return menu;
    }

    function createSphereMenu() {
        let menu = new ButtonMenu(MenuNavButtons.SPHERE_SETTINGS, MENU_WIDTH);
        menu.onAfterUpdate(() => { afterUpdate(menu); })
        menu.add(
            new MeshButton(MenuNavButtons.MAIN_MENU, 'Back', BUTTON_SIZE),
            new MeshButton(AttributeButtons.SPHERE_TOGGLE, 'Toggle', BUTTON_SIZE),
            new MeshButton(AttributeButtons.SPHERE_SCALE_UP, 'Scale Up', BUTTON_SIZE),
            new MeshButton(MenuNavButtons.SPHERE_IMAGE, 'Image', BUTTON_SIZE),
            new MeshButton(MenuNavButtons.SPHERE_COLOR, 'Color', BUTTON_SIZE),
            new MeshButton(AttributeButtons.SPHERE_SCALE_DOWN, 'Scale Down', BUTTON_SIZE),
        );
        return menu;
    }

    function createAssetSelectMenu(id) {
        let menu = new ButtonMenu(id, MENU_WIDTH);
        menu.onAfterUpdate(() => { afterUpdate(menu); })
        menu.add(
            new MeshButton(MenuNavButtons.BACK_BUTTON, 'Back', BUTTON_SIZE),
            new MeshButton(MenuNavButtons.PREVIOUS_BUTTON, 'Prev', BUTTON_SIZE),
            new MeshButton(MenuNavButtons.NEXT_BUTTON, 'Next', BUTTON_SIZE),
        );
        return menu;
    }

    function createColorSelectMenu() {
        let menu = new ButtonMenu(MenuNavButtons.SPHERE_COLOR, MENU_WIDTH);
        menu.add(
            new MeshButton(MenuNavButtons.SPHERE_SETTINGS, 'Back', BUTTON_SIZE),
            new MeshButton(MenuNavButtons.PREVIOUS_BUTTON, 'Prev', BUTTON_SIZE),
            new MeshButton(MenuNavButtons.NEXT_BUTTON, 'Next', BUTTON_SIZE),
            // add color button
        );
        return menu;
    }

    function createBrushSettingsMenu() {
        let menu = new ButtonMenu(MenuNavButtons.SPHERE_COLOR, MENU_WIDTH);
        menu.add(
            new MeshButton(BrushToolButtons.UNBLUR, 'Unblur', BUTTON_SIZE),
            new MeshButton(BrushToolButtons.BLUR, 'Blur', BUTTON_SIZE),
            new MeshButton(BrushToolButtons.COLOR, 'Color', BUTTON_SIZE),
        );
        return menu;
    }

    function createSurfaceSettingsMenu() {
        let menu = new ButtonMenu(MenuNavButtons.SPHERE_COLOR, MENU_WIDTH);
        menu.add(
            new MeshButton(SurfaceToolButtons.MOVE, 'Move', BUTTON_SIZE),
            new MeshButton(SurfaceToolButtons.FLATTEN, 'Flatten', BUTTON_SIZE),
            new MeshButton(SurfaceToolButtons.SELECT, 'Select', BUTTON_SIZE),
        );
        return menu;
    }

    function afterUpdate(menu) {
        if (mSingleContainer && menu == mCurrentMenu) {
            if (mCurrentSubMenu) {
                mCurrentSubMenu.setVOffset(menu.getObject().getHeight())
            }
        }
    }

    this.setContainer = setContainer;
    this.setToolMode = setToolMode;
    this.updateModel = updateModel;
    this.showMenu = showMenu;
    this.showSubMenu = showSubMenu;
    this.getCurrentMenuId = () => mCurrentMenuId;
    this.onAdd = func => mAddCallback = func;
    this.onToolChange = func => mToolChangeCallback = func;
    this.getMode = () => mToolMode;
    this.render = render
    this.getTargets = getTargets;
}
