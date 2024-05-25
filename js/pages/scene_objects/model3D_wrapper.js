import * as THREE from 'three';
import { Data } from "../../data_structs.js";

export function Model3DWrapper(parent) {
    let mParent = parent;
    let mModel3D = new Data.Model3D();
    let mGLTF = null;
    let mModelSize = 1;

    async function update(model3D, model, assetUtil) {
        let oldModel = mModel3D;
        mModel3D = model3D;

        if (mModel3D.assetId != oldModel.assetId) {
            if (mGLTF) remove();
            try {
                mGLTF = await assetUtil.loadGLTFModel(mModel3D.assetId)
                mParent.add(mGLTF.scene);
                const box = new THREE.Box3().setFromObject(mGLTF.scene);
                mModelSize = Math.max(...box.getSize(new THREE.Vector3()).toArray());
            } catch (error) {
                console.error(error);
            }
        }

        mGLTF.scene.setRotationFromQuaternion(new THREE.Quaternion().fromArray(model3D.orientation));
        mGLTF.scene.position.set(model3D.x, model3D.y, model3D.z);
        mGLTF.scene.scale.set(model3D.size / mModelSize, model3D.size / mModelSize, model3D.size / mModelSize);
    }

    function getId() {
        return mModel3D.id;
    }

    function remove() {
        mParent.remove(mGLTF.scene)
    }

    this.update = update;
    this.getId = getId;
    this.remove = remove;
}