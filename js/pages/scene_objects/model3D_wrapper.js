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

                mGLTF.scene.traverse(function (child) {
                    if (child.isMesh) {
                        child.material.userData.originalColor = new THREE.Color(0xffffff);
                        child.material.userData.originalColor.copy(child.material.color);
                    }
                });
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

    function getIntersections(ray) {
        if (!mGLTF) return []
        const intersects = ray.intersectObjects(mGLTF.scene.children);
        if (intersects.length > 0) {
            // TODO add the intersection distance?
            return [{ id: mModel3D.id, wrapper: this }]
        } else {
            return []
        }
    }

    const highlightColor = new THREE.Color(0xff0000)

    function highlight() {
        mGLTF.scene.traverse(function (child) {
            if (child.isMesh) {
                child.material.color.copy(highlightColor)
            }
        });
    }

    function unhighlight() {
        mGLTF.scene.traverse(function (child) {
            if (child.isMesh) {
                child.material.color.copy(child.material.userData.originalColor)
            }
        });
    }

    this.update = update;
    this.getId = getId;
    this.remove = remove;
    this.getIntersections = getIntersections;
    this.highlight = highlight;
    this.unhighlight = unhighlight;
}