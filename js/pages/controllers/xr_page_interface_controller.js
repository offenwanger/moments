import * as THREE from 'three';

export function XRPageInterfaceController() {
    const INTERFACE_RESOLUTION = 1024

    let mHeadPos = new THREE.Vector3();
    let mHeadDir = new THREE.Vector3();

    let mMousePosition = { x: 0, y: 0 };
    let mMouseDown = false;

    let mLeftGroup = new THREE.Group();
    // in case we want something on that wrist
    let mRightGroup = new THREE.Group();

    let mCursorImage = new Image();
    mCursorImage.src = 'assets/images/cursor.png';
    let mHighlightBoxes = []
    let mPointerDownElement = null;

    let mPageCanvas = document.createElement('canvas');
    const mInterfaceCanvas = document.createElement('canvas');
    mInterfaceCanvas.width = INTERFACE_RESOLUTION;
    mInterfaceCanvas.height = INTERFACE_RESOLUTION;

    const mInterfaceMaterial = new THREE.MeshBasicMaterial({ transparent: true });
    mInterfaceMaterial.map = new THREE.CanvasTexture(mInterfaceCanvas);

    const mInterfaceContext = mInterfaceCanvas.getContext('2d');

    const mInterfaceWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), mInterfaceMaterial);
    mInterfaceWindow.translateZ(0.1)
    mInterfaceWindow.translateX(-0.1)
    mInterfaceWindow.rotateY(-Math.PI / 2)
    mInterfaceWindow.rotateZ(Math.PI)

    mLeftGroup.add(mInterfaceWindow);

    let mGroup = new THREE.Group();
    mGroup.add(mLeftGroup);
    mGroup.add(mRightGroup);

    let mWindowScale = 1;
    let mCanvasScale = 1;
    let mWindowWidth = 1;
    let mWindowHeight = 1;

    async function updateSystemState(systemState) {
        if (systemState.primaryRPressed && !mMouseDown) {
            await mouseDown(mMousePosition);
        } else if (!systemState.primaryRPressed && mMouseDown) {
            await mouseUp(mMousePosition);
        }
    }

    async function userMoved(headPos, headDir, leftPos, leftOrient, rightPos, rightOrient) {
        mHeadPos = headPos;
        mHeadDir = headDir;
        mRightGroup.position.copy(rightPos)
        mRightGroup.quaternion.copy(rightOrient)
        mLeftGroup.position.copy(leftPos)
        mLeftGroup.quaternion.copy(leftOrient)

        setInterfaceScale();

        if (isInteracting()) {
            let mouseOverPoint = getLeftInterfaceIntersection(rightPos, rightOrient);
            if (mouseOverPoint && (!mMousePosition ||
                mMousePosition.x != mouseOverPoint.x ||
                mMousePosition.y != mouseOverPoint.y)) {
                mMousePosition = mouseOverPoint;
                mHighlightBoxes = [];
                let element = document.elementsFromPoint(mMousePosition.x, mMousePosition.y)[0];
                if (element) {
                    mHighlightBoxes.push(element.getBoundingClientRect());
                }
            } else if (!mouseOverPoint) {
                mMousePosition = null;
            }
            drawInterface();
        } else {
            let pos = mMousePosition;
            mMousePosition = null;
            if (mMouseDown) await mouseUp(pos);
        }
    }

    async function mouseDown(pos) {
        mMouseDown = true;
        if (!pos) return;
        let element = document.elementsFromPoint(pos.x, pos.y)[0];
        if (element) {
            element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            mPointerDownElement = element;
        }
        await renderWebpage();
    }

    async function mouseUp(pos) {
        mMouseDown = false;
        if (!pos) return;
        let element = document.elementsFromPoint(pos.x, pos.y)[0];
        if (element) {
            element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
            if (element == mPointerDownElement) element.dispatchEvent(new PointerEvent('click', { bubbles: true }));
        }
        mPointerDownElement = null;
        await renderWebpage();
    }

    function setInterfaceScale() {
        const interfaceDirectionVector = getLeftInterfaceNormal();
        let angleToInterfaceFace = mHeadDir.angleTo(interfaceDirectionVector);

        let minAngle = /* 45 deg */ Math.PI / 4;
        let maxAngle = /* 90 deg */ Math.PI / 2;
        let angle = Math.min(maxAngle, Math.max(minAngle, angleToInterfaceFace));
        mWindowScale = 1 - (angle - minAngle) / (maxAngle - minAngle);

        mWindowScale = Math.max(mWindowScale, 0.00001)

        mInterfaceWindow.scale.set(mWindowScale, mWindowScale, mWindowScale);
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

    function getLeftInterfaceIntersection(rightControllerPosition, rightControllerOrientation) {
        // intersect with up or down button
        let directionRay = new THREE.Vector3(0, 0, -1).applyQuaternion(rightControllerOrientation);
        let ray = new THREE.Raycaster(rightControllerPosition, directionRay, 0, 0.3);
        let intersections = ray.intersectObjects([mInterfaceWindow]);
        if (intersections[0]) {
            let coords = {
                x: Math.round(intersections[0].uv.x * Math.max(mWindowWidth, mWindowHeight)),
                y: Math.round((1 - intersections[0].uv.y) * Math.max(mWindowWidth, mWindowHeight))
            };
            if (coords.x < 0 || coords.x > mWindowWidth || coords.y < 0 || coords.y > mWindowHeight) return null;
            else return coords;
        }
    }

    async function renderWebpage() {
        try {
            mPageCanvas = await html2canvas(document.querySelector("#content"), { logging: false })
            mWindowWidth = mPageCanvas.width;
            mWindowHeight = mPageCanvas.height;

            mCanvasScale = INTERFACE_RESOLUTION / Math.max(mWindowWidth, mWindowHeight)
            drawInterface();
        } catch (e) {
            console.error(e);
        }
    }

    function drawInterface() {
        mInterfaceContext.reset()
        mInterfaceContext.clearRect(0, 0, mInterfaceCanvas.width, mInterfaceCanvas.height);
        mInterfaceContext.scale(mCanvasScale, mCanvasScale);

        mInterfaceContext.drawImage(mPageCanvas, 0, 0, mWindowWidth, mWindowHeight);

        mHighlightBoxes.forEach(box => {
            mInterfaceContext.strokeStyle = "black";
            mInterfaceContext.lineWidth = 5;
            mInterfaceContext.strokeRect(box.x, box.y, box.width, box.height);
        })
        if (mMousePosition) mInterfaceContext.drawImage(
            mCursorImage, mMousePosition.x, mMousePosition.y, 20, 30);



        mInterfaceMaterial.map.needsUpdate = true;
    }

    function isInteracting() {
        // check if head is looking in the right direction. 
        const headToInterfaceVector = new THREE.Vector3().subVectors(
            getLeftInterfacePosition(), mHeadPos).normalize();
        let angleToInterface = mHeadDir.angleTo(headToInterfaceVector);
        let isLookingAtInterface = angleToInterface < Math.PI / 3;
        // If the wrist is in the right direction and the user is looking at it.
        if (mWindowScale == 1 && isLookingAtInterface) {
            return true;
        } else {
            return false;
        }
    }

    this.userMoved = userMoved;
    this.isInteracting = isInteracting;
    this.updateSystemState = updateSystemState;
    this.renderWebpage = renderWebpage;
    this.getGroup = () => mGroup;
}