import * as THREE from 'three';
import * as ThreeMeshUI from 'three-mesh-ui';
import { InteractionTargetInterface } from '../../scene_objects/interaction_target_interface.js';

export function MeshButton(id, label, size, color = 0xffffff, dynamic = false) {
    let mDynamic = dynamic;
    const mButton = new ThreeMeshUI.Block({
        padding: 0.05,
        width: size,
        height: size,
        justifyContent: 'center',
        offset: 0.05,
        margin: 0.02,
        borderRadius: 0.075,
        borderWidth: 0.01,
        borderColor: new THREE.Color(1, 1, 1),
        borderOpacity: 0
    });
    mButton.add(new ThreeMeshUI.Text({
        content: label,
        fontSize: 0.055,
        fontColor: new THREE.Color(color),
    }));
    mButton.userData.id = id;
    const mInteractionTarget = createTarget();

    mButton.setupState({
        state: 'selected',
        attributes: {
            offset: 0.02,
            backgroundColor: new THREE.Color(0x777777),
            fontColor: new THREE.Color(0x222222)
        }
    });
    mButton.setupState({
        state: 'highlight',
        attributes: {
            offset: 0.035,
            backgroundColor: new THREE.Color(0x999999),
            backgroundOpacity: 1,
            fontColor: new THREE.Color(0xffffff)
        },
    });
    mButton.setupState({
        state: 'idle',
        attributes: {
            offset: 0.035,
            backgroundColor: new THREE.Color(0x555555),
            backgroundOpacity: 0.3,
            fontColor: new THREE.Color(0xffffff)
        },
    });
    mButton.setState('idle')

    function getTarget(intersection) {
        mInteractionTarget.getIntersection = () => intersection;
        return mInteractionTarget;
    }

    function createTarget() {
        let target = new InteractionTargetInterface();
        target.isButton = () => true;
        target.getId = () => id;
        target.highlight = (toolMode) => { mButton.setState('highlight') }
        target.select = (toolMode) => { mButton.setState('selected') }
        target.idle = (toolMode) => { mButton.setState('idle') }
        return target;
    }

    function deactivate() {
        mButton.set({ borderOpacity: 0 });

    }

    function activate() {
        mButton.set({ borderOpacity: 1 });
    }

    this.getObject = () => mButton;
    this.getTarget = getTarget;
    this.getId = () => id;
    this.isDynamic = () => mDynamic;
    this.deactivate = deactivate;
    this.activate = activate;
}
