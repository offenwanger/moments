import { Data } from "../../data_structs.js";

export function Model3DScene(parent) {
    let mParent = parent;
    let mModel3D = new Data.Model3D();
    let mGLTF = null;

    async function update(model3D, model, assetUtil) {
        let oldModel = mModel3D;
        mModel3D = model3D;

        if (mModel3D.assetId != oldModel.assetId) {
            if (mGLTF) remove();
            try {
                mGLTF = await assetUtil.loadGLTFModel(mModel3D.assetId)
                mParent.add(mGLTF.scene);
            } catch (error) {
                console.error(error);
            }
        }
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