import * as THREE from 'three';
import { Data } from "../../data.js";
import { InteractionTargetInterface } from "./interaction_target_interface.js";
import { ToolButtons } from '../../constants.js';

export function TeleportWrapper(parent) {
    let mParent = parent;
    let mTeleport = new Data.Teleport();
    let mInteractionTarget = createInteractionTarget();

    const mSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 32, 16),
        new THREE.MeshPhysicalMaterial({
            color: 0xaaaa99,
            metalness: 0,
            roughness: 0.2,
            ior: 1.5,
            thickness: 0.02,
            transmission: 1,
            specularIntensity: 1,
            specularColor: 0xffffff,
            opacity: 1,
            side: THREE.DoubleSide,
            transparent: true
        }));

    const mTeleportMap = new THREE.TextureLoader().load('assets/images/teleportIcon.png');
    const mTeleportSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: mTeleportMap }));
    mTeleportSprite.scale.set(0.09, 0.09, 0.09);
    mTeleportSprite.position.set(0.1, 0.1, 0);
    mSphere.add(mTeleportSprite)

    async function update(teleport, model, assetUtil) {
        mParent.add(mSphere);
        mSphere.position.set(teleport.x, teleport.y, teleport.z);
        mSphere.userData.id = teleport.id;
        mTeleport = teleport;
    }

    function getId() {
        return mTeleport.id;
    }

    function remove() {
        mParent.remove(mSphere);
    }

    function getTargets(ray, toolMode) {
        if (toolMode.tool == ToolButtons.MOVE) {
            let intersect = ray.intersectObject(mSphere);
            if (intersect.length == 0) return [];
            intersect = intersect[0];
            mInteractionTarget.getIntersection = () => intersect;
            return [mInteractionTarget];
        } else return [];
    }

    function createInteractionTarget() {
        let target = new InteractionTargetInterface();
        target.getObject3D = () => { return mSphere; }
        target.getId = () => mTeleport.id;
        target.highlight = function (toolMode) {
            mSphere.material.color.setHex(0xff2299)
        };
        target.select = function (toolMode) {
            mSphere.material.color.setHex(0xffffff)
        };
        target.idle = (toolMode) => {
            mSphere.material.color.setHex(0xaaaa99)
        }
        target.getLocalPosition = () => {
            let p = new THREE.Vector3();
            p.copy(mSphere.position)
            return p;
        }

        target.getWorldPosition = () => {
            let worldPos = new THREE.Vector3();
            mSphere.getWorldPosition(worldPos);
            return worldPos;
        }

        target.setWorldPosition = (worldPos) => {
            mSphere.position.copy(worldPos)
        }

        target.isTeleport = () => true;

        return target;
    }

    this.getTargets = getTargets;
    this.update = update;
    this.getId = getId;
    this.remove = remove;
}