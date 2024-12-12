import * as THREE from 'three';

export function OtherUserWrapper(parent, id) {
    let mParent = parent;
    let mId = id;
    let mHandRIn = false;
    let mHandLIn = false;


    const mGeometry = new THREE.SphereGeometry(0.2, 16, 8);

    const mMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(Math.random(), Math.random(), Math.random),
        transparent: true,
        opacity: 1,
    });
    const mSphere = new THREE.Mesh(
        mGeometry,
        mMaterial
    );

    const mEyeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0, 0, 0),
        transparent: true,
        opacity: 1,
    })
    const mEye1 = new THREE.Mesh(mGeometry, mEyeMaterial);
    mEye1.scale.set(0.1, 0.3, 0.1)
    mEye1.position.set(-0.05, 0, -0.2)

    const mEye2 = new THREE.Mesh(mGeometry, mEyeMaterial);
    mEye2.scale.set(0.1, 0.3, 0.1)
    mEye2.position.set(0.05, 0, -0.2)

    const mHead = new THREE.Group;
    mHead.add(mSphere)
    mHead.add(mEye1)
    mHead.add(mEye2)
    mParent.add(mHead);

    const mHandGeometry = new THREE.SphereGeometry(0.1, 6, 3);

    const mHandR = new THREE.Mesh(
        mHandGeometry,
        mMaterial
    );

    const mHandL = new THREE.Mesh(
        mHandGeometry,
        mMaterial
    );

    async function update(head, handR = null, handL = null, solid = false) {
        mHead.position.set(head.x, head.y, head.z);
        mHead.quaternion.set(...head.orientation);
        if (handR) {
            if (!mHandRIn) { mParent.add(mHandR); mHandRIn = true; }
            mHandR.position.set(handR.x, handR.y, handR.z);
            mHandR.quaternion.set(...handR.orientation);
        }

        if (handL) {
            if (!mHandLIn) { mParent.add(mHandL); mHandLIn = true; }
            mHandL.position.set(handL.x, handL.y, handL.z);
            mHandL.quaternion.set(...handL.orientation);
        }

        if (!solid) {
            mMaterial.opacity = 0.1;
            mEyeMaterial.opacity = 0.1;
        } else {
            mMaterial.opacity = 1;
            mEyeMaterial.opacity = 1;
        }
    }

    function remove() {
        mParent.remove(mHead)
        mParent.remove(mHandR)
        mParent.remove(mHandL)
    }

    function setHead(pos, orientation) {
        mHead.position.set(pos.x, pos.y, pos.z);
        mHead.quaternion.set(...orientation);
    }

    function setHandR(pos = null, orientation = null) {
        if (!pos) {
            mParent.remove(mHandR);
        } else {
            mHandR.position.set(pos.x, pos.y, pos.z);
            mHandR.quaternion.set(...orientation);
        }
    }

    function setHandL(pos = null, orientation = null) {
        mHandL.position.set(pos.x, pos.y, pos.z);
        mHandL.quaternion.set(...orientation);
    }

    this.getTargets = () => [];
    this.update = update;
    this.getId = () => mId;
    this.remove = remove;
}