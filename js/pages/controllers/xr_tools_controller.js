import * as THREE from 'three';


export function XRToolsController() {
    // Just have an up and down button which switches tool. 
    // Tools 
    //  regular pointers
    //  texture brush
    //  copier
    //  overview
    // Modes
    //  Edit scene mode
    //  Edit timeline mode
    let mShowing = false;

    let mLeftGroup = new THREE.Group();
    let mInterfaceMaterial = new THREE.MeshBasicMaterial({ transparent: true });
    let mInterfaceWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), mInterfaceMaterial);
    mInterfaceWindow.translateZ(0.1)
    mInterfaceWindow.translateX(-0.1)
    mInterfaceWindow.rotateY(-Math.PI / 2)
    mInterfaceWindow.rotateZ(Math.PI)
    const mInterfaceCanvas = document.createElement('canvas');
    mInterfaceCanvas.width = 1024;
    mInterfaceCanvas.height = 1024;
    const mInterfaceContext = mInterfaceCanvas.getContext('2d');
    mInterfaceMaterial.map = new THREE.CanvasTexture(mInterfaceCanvas);
    mLeftGroup.add(mInterfaceWindow);

    let mRightGroup = new THREE.Group();

    let mGroup = new THREE.Group();
    mGroup.add(mLeftGroup);
    mGroup.add(mRightGroup);

    let mLastTime = Infinity
    function animate(time, leftPos, leftOrient, rightPos, rightOrient) {
        let delta = time - mLastTime;
        mLastTime = time;
        if (delta > 0) {
            let scale = mInterfaceWindow.scale.x;
            if (!mShowing && scale > 0.002) {
                scale = Math.max(0.001, scale - 0.005 * delta);
                mInterfaceWindow.scale.set(scale, scale, scale);
            } else if (mShowing && scale < 1) {
                scale = Math.min(1, scale + 0.002 * delta);
                mInterfaceWindow.scale.set(scale, scale, scale);
            }
        }

        mRightGroup.position.copy(rightPos)
        mRightGroup.quaternion.copy(rightOrient)
        mLeftGroup.position.copy(leftPos)
        mLeftGroup.quaternion.copy(leftOrient)
    }

    function getLeftInterfacePosition() {
        let pos = new THREE.Vector3();
        mInterfaceWindow.getWorldPosition(pos);
        return pos;
    }

    function getLeftInterfaceNormal() {
        let rot = new THREE.Quaternion();
        mInterfaceWindow.getWorldQuaternion(rot);
        const vector = new THREE.Vector3(0, 0, -1);
        vector.applyQuaternion(rot);
        return vector;
    }

    function getIntersection() {
        // intersect with up or down button
    }

    let mRendering = false;
    async function renderInterface() {
        if (mRendering) return;
        mRendering = true;
        try {
            let canvas = await html2canvas(document.querySelector("#content"), { logging: false })
            let width = canvas.width;
            let height = canvas.height;
            let scale = 512 / Math.max(width, height)
            mInterfaceContext.drawImage(canvas, 0, 0, width * scale, height * scale);
            mInterfaceMaterial.map.needsUpdate = true;
        } catch (e) {
            console.error(e);
        } finally {
            mRendering = false;
        }
    }

    this.animate = animate;
    this.showInterface = () => mShowing = true;
    this.hideInterface = () => mShowing = false;
    this.renderInterface = renderInterface;
    this.getLeftInterfacePosition = getLeftInterfacePosition;
    this.getLeftInterfaceNormal = getLeftInterfaceNormal;
    this.getToolState = () => mToolState;
    this.startRenderingInterface = () => !mInterfaceTimeout ? renderInterface() : null;
    this.stopRenderingInterface = () => clearTimeout(mInterfaceTimeout);
    this.getGroup = () => mGroup;
}