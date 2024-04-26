import { Data } from "../../data_structs.js";

export function Model3D(id, scene, assetUtil) {
    let mModel3DId = id;
    let mModel3D = new Data.Model3D();
    let mGLTF = null;

    async function update(model) {
        if (!mModel3DId) return;
        let model3D = model.getModel3D(mModel3DId);
        if (!model3D) { console.error("Not in model."); return; }
        // first check if we need to update the model
        if (model3D.id != mModel3D.id || model3D.assetId != mModel3D.assetId) {
            mGLTF = await assetUtil.loadGLTFModel(model.assetId)
            scene.add(mGLTF.scene);
        }

        mModel3D = model3D;
    }

    async function remove() {
        scene.remove(mGLTF.scene);
    }

    this.update = update;
    this.remove = remove;
    this.getId = () => mModel3DId;
}