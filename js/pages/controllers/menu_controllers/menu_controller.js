import * as ThreeMeshUI from 'three-mesh-ui';
import { ItemButtons, MenuButtons, ToolButtons } from '../../../constants.js';
import { MeshButton } from './mesh_button.js';
import { ButtonMenu } from './button_menu.js';

export function MenuController() {
    const BUTTON_SIZE = 0.4;
    const MENU_WIDTH = 1.5;

    let mMode = null;

    // needed to adjust the menu positioning
    let mMenuContainer = new ThreeMeshUI.Block({ width: 0.001, height: 0.001, });

    let mMainMenu = new ButtonMenu(MENU_WIDTH);
    mMenuContainer.add(mMainMenu.getObject());

    let mButtons = [
        new MeshButton(ToolButtons.MOVE, 'Move', BUTTON_SIZE),
        new MeshButton(ToolButtons.BRUSH, 'Brush', BUTTON_SIZE),
        new MeshButton(ToolButtons.SURFACE, 'Surface', BUTTON_SIZE),
        new MeshButton(ToolButtons.SCISSORS, 'Scissors', BUTTON_SIZE),
        new MeshButton(ToolButtons.RECORD, 'Record', BUTTON_SIZE),
        new MeshButton(ItemButtons.RECENTER, 'Recenter', BUTTON_SIZE),
        new MeshButton(MenuButtons.SPHERE_SETTINGS, 'Sphere Settings', BUTTON_SIZE),
        new MeshButton(MenuButtons.SETTINGS, 'Settings', BUTTON_SIZE),
        new MeshButton(MenuButtons.ADD, 'Add', BUTTON_SIZE),
    ]
    mMainMenu.add(...mButtons.map(b => b.getObject()));

    function setContainer(container1, container2) {
        container1.add(mMenuContainer);
    }

    function setMode(mode) {
        let currentModeButton = mButtons.find(b => b.getId() == mMode);
        if (currentModeButton) currentModeButton.deactivate();
        mMode = mode;
        let newButton = mButtons.find(b => b.getId() == mMode);
        if (newButton) newButton.activate();
    }

    function navigate(buttonId) {
        if (buttonId == MenuButtons.SPHERE_SETTINGS) {
            console.error('Show the sphere settings menu.')
        } else if (buttonId == MenuButtons.SETTINGS) {
            console.error('Show the settings menu.')
        } else if (buttonId == MenuButtons.ADD) {
            console.error('Show the add menu.')
        } else {

        }
    }

    function updateModel(model) {

    }

    function getWidth() {
        return MENU_WIDTH;
    }

    function render() {
        ThreeMeshUI.update();
    }

    function getTargets(raycaster) {
        for (let button of mButtons) {
            const intersection = raycaster.intersectObject(button.getObject(), true);
            if (intersection[0]) {
                return [button.getTarget(intersection[0])]
            };
        }
        return [];
    }

    this.setContainer = setContainer;
    this.setMode = setMode;
    this.navigate = navigate;
    this.onAdd = func => mAddCallback = func;
    this.onToolChange = func => mToolChangeCallback = func;
    this.render = render
    this.getWidth = getWidth;
    this.getTargets = getTargets;
}
