import * as THREE from 'three';
import { Data } from "../../data.js";
import { InteractionTargetWrapper } from "./interaction_target_interface.js";

export function PictureWrapper(parent) {
    let mParent = parent;
    let mPicture = new Data.Picture();
    let mInteractionTarget = createInteractionTarget();

    const mMaterial = new THREE.SpriteMaterial({ transparent: true });
    const mPlane = new THREE.Sprite(mMaterial);
    parent.add(mPlane);

    async function update(picture, model, assetUtil) {
        new THREE.TextureLoader().load(picture.image, (texture) => {
            mMaterial.map = texture;
            mMaterial.needsUpdate = true;
        })
        mPlane.position.set(picture.x, picture.y, picture.z);
        mPlane.scale.set(picture.scale, picture.scale, picture.scale)
        mPicture = picture;
    }

    function getId() {
        return mPicture.id;
    }

    function remove() {
        mParent.remove(mPlane);
    }

    function getTargets(ray) {
        const intersect = ray.intersectObject(mPlane);
        if (intersect.length > 0) {
            mInteractionTarget.getIntersection = () => { return intersect[0]; }
            return [mInteractionTarget];
        } else return [];
    }

    function createInteractionTarget() {
        let target = new InteractionTargetWrapper();
        target.getLocalPosition = () => {
            let p = new THREE.Vector3();
            p.copy(mPlane.position)
            return p;
        }
        target.getWorldPosition = () => {
            let worldPos = new THREE.Vector3();
            mPlane.getWorldPosition(worldPos);
            return worldPos;
        }
        target.setWorldPosition = (worldPos) => {
            let localPosition = mPlane.parent.worldToLocal(worldPos);
            mPlane.position.copy(localPosition)
        }
        target.getLocalOrientation = () => {
            let q = new THREE.Quaternion();
            q.copy(mPlane.quaternion);
            return q;
        }
        target.setLocalOrientation = (orientation) => {
            // can't set angle on these.
        }
        target.getScale = () => {
            let scale = 1;
            scale = mPlane.scale.x;
            return scale;
        }
        target.setScale = (scale) => {
            mPlane.scale.set(scale, scale, scale);
        }
        target.getParent = () => { return null; }
        target.getRoot = () => { return target; }
        target.getObject3D = () => { return mPlane; }
        target.highlight = () => {
            mMaterial.color.set(0xff0000);
            mMaterial.needsUpdate = true;
        };
        target.unhighlight = () => {
            mMaterial.color.set(0xffffff);
            mMaterial.needsUpdate = true;
        }
        target.getId = () => mPicture.id;
        return target;
    }

    this.getTargets = getTargets;
    this.update = update;
    this.getId = getId;
    this.remove = remove;
}