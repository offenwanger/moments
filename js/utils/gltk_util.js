import * as THREE from 'three';

export const GLTKUtil = {
    getInteractionTargetsFromGTLKScene,
    createIK,
}

function getInteractionTargetsFromGTLKScene(scene) {
    let targets = []
    scene.traverse(child => {
        // TODO: This ignored grouped meshes. 
        if (child.type == "Bone" || (child.type == "Mesh" && (!child.parent || child.parent.type != 'Bone'))) {
            if (child.type == "Mesh") child.isRoot = true;
            else if (child.type == "Bone" && child.parent.type != 'Bone') child.isRoot = true;
            targets.push(child);
        }
    })
    return targets;
}

function createIK(anchorTarget, movingTarget) {
    let movingBone = movingTarget.getObject3D();

    let rootTarget = movingTarget.getRoot();
    let rootBone = rootTarget.getObject3D();

    let controlBone = new THREE.Bone();
    let controlPositionDeterminant = movingBone.children.find(b => b.type == "Bone");
    if (!controlPositionDeterminant) controlPositionDeterminant = movingBone;
    controlPositionDeterminant.getWorldPosition(controlBone.position)
    rootBone.attach(controlBone);

    let bones = []
    rootBone.traverse(b => { if (b.type == "Bone") bones.push(b); })

    const skeleton = new THREE.Skeleton(bones);
    const mesh = new THREE.SkinnedMesh();
    mesh.bind(skeleton);

    let anchorChain = []
    let anchorParent = anchorTarget;
    while (anchorParent && anchorParent.getId() != rootTarget.getId()) {
        anchorChain.push(anchorParent);
        anchorParent = anchorParent.getParent();
    }

    let affectedTargets = [movingTarget]
    let affectedParent = movingTarget.getParent();
    while (affectedParent.getId() != rootTarget.getId() && !anchorChain.find(i => i.getId() == affectedParent.getId())) {
        affectedTargets.push(affectedParent);
        affectedParent = affectedParent.getParent();
    }

    let links = affectedTargets.map(t => {
        return { index: bones.indexOf(t.getObject3D()) };
    })
    links.unshift({ index: bones.indexOf(movingTarget.getObject3D()) })

    const iks = [{
        target: bones.indexOf(controlBone),
        effector: bones.indexOf(controlPositionDeterminant),
        links,
    }];

    return { mesh, iks, affectedTargets, controlBone };
}