import * as THREE from 'three';
import { EditMode, RINGS, SEGMENTS } from '../../constants.js';
import { Data } from '../../data.js';
import { InteractionTargetWrapper } from '../scene_objects/interaction_target_wrapper.js';
import { OtherUserWrapper } from '../scene_objects/other_user_wrapper.js';

export function MorpherSceneController() {
    let mScene = new THREE.Scene();
    let mContent = new THREE.Group();
    let mModel = new Data.StoryModel();
    let idArray = [];

    mScene.add(mContent);

    let mListener = new THREE.AudioListener();
    // mCamera.add(mListener);
    let mSound = new THREE.PositionalAudio( mListener );

    let mAudioLoader = new THREE.AudioLoader();
    mAudioLoader.load('js/pages/controllers/sounds/ogg-baby-shark-122769.ogg', function( buffer ) {
        console.log("BABY SHARK")
        mSound.setBuffer( buffer );
        mSound.setLoop( true );
        mSound.setVolume( 0.5 );
        mSound.setRefDistance(20);
        mSound.play();
    });

    let mSphere = new THREE.SphereGeometry(0.1, 32, 16);
    let mMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
    let mMesh = new THREE.Mesh( mSphere, mMaterial);
    console.log("Red Sphere")
    mScene.add(mMesh);
    mMesh.add(mSound);

    const light = new THREE.AmbientLight(0xFFFFFF); // soft white light
    mScene.add(light);

    let mOtherUsers = [];

    let mEnvironmentBox;

    const selectionDist = 0.18;
    const tweenDist = 0.05;

    const positionNumComponents = 3;
    const normalNumComponents = 3;
    const uvNumComponents = 2;
    const colorNumComponents = 4;

    const { positions, indices, uvs, vertices, colors } = makeSpherePositions(SEGMENTS, RINGS);
    const normals = positions.slice();
    const geometry = new THREE.BufferGeometry();

    const positionAttribute = new THREE.BufferAttribute(positions, positionNumComponents);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    const uvAttribute = new THREE.BufferAttribute(new Float32Array(uvs), uvNumComponents);
    uvAttribute.setUsage(THREE.DynamicDrawUsage);
    const colorAttribute = new THREE.BufferAttribute(colors, colorNumComponents)
    colorAttribute.setUsage(THREE.DynamicDrawUsage);

    geometry.setAttribute('position', positionAttribute);
    geometry.setAttribute('color', colorAttribute);
    geometry.setAttribute('uv', uvAttribute);
    geometry.setIndex(indices);
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, normalNumComponents));

    const loader = new THREE.TextureLoader();
    const texture = loader.load('assets/images/office_pano.jpg');
    texture.colorSpace = THREE.SRGBColorSpace;


    const material = new THREE.MeshStandardMaterial({ map: texture });
    const sphere = new THREE.Mesh(geometry, material);
    mScene.add(sphere);

    const pointMaterial = new THREE.PointsMaterial({ vertexColors: true, size: 0.03, transparent: true })
    pointMaterial.depthTest = false;
    const particles = new THREE.Points(geometry, pointMaterial);
    mScene.add(particles);

    function updateVerticePosition(index, pos) {
        let vertice = vertices.find(v => v.index == index);
        pos.toArray(positions, vertice.positionIndex);
        positionAttribute.needsUpdate = true;
    }

    function updateVerticeUV(index, uv) {
        let vertice = vertices.find(v => v.index == index);
        uvs.set(uvs, vertice.uvIndex);
        uvAttribute.needsUpdate = true;
    }

    /*
     
    Create an array of points, those points will return intersection targets
    When we drag the points, they are bound to their specific axis. They can only move towards or away from the center. 

    each point has a UV coord

    https://discourse.threejs.org/t/updating-the-vertex-positions-of-a-ray-picked-face/40275
     */

    function makeSpherePositions(segmentsAround, segmentsDown) {
        const numVertices = segmentsAround * segmentsDown * 6;
        const positions = new Float32Array(numVertices * positionNumComponents);
        const indices = [];
        const uvs = new Float32Array(numVertices * uvNumComponents);
        const vertices = [];
        const colors = new Float32Array(numVertices * colorNumComponents);

        const longHelper = new THREE.Object3D();
        const latHelper = new THREE.Object3D();
        const pointHelper = new THREE.Object3D();
        longHelper.add(latHelper);
        latHelper.add(pointHelper);
        pointHelper.position.z = 1;
        const temp = new THREE.Vector3();

        function getPoint(lat, long) {
            latHelper.rotation.x = lat;
            longHelper.rotation.y = long;
            longHelper.updateMatrixWorld(true);
            return pointHelper.getWorldPosition(temp).toArray();
        }

        let posNdx = 0;
        let colNdx = 0;
        let uvNdx = 0;
        let ndx = 0;
        for (let down = 0; down < segmentsDown; ++down) {
            const v0 = down / segmentsDown;
            const v1 = (down + 1) / segmentsDown;
            const lat0 = (v0 - 0.5) * Math.PI;
            const lat1 = (v1 - 0.5) * Math.PI;

            for (let across = 0; across < segmentsAround; ++across) {
                const u0 = across / segmentsAround;
                const u1 = (across + 1) / segmentsAround;
                const long0 = u0 * Math.PI * 2;
                const long1 = u1 * Math.PI * 2;

                vertices.push({
                    index: ndx,
                    position: getPoint(lat0, long0),
                    positionIndex: posNdx,
                    uv: [1 - u0, 1 - v0],
                    uvIndex: uvNdx
                })
                positions.set(getPoint(lat0, long0), posNdx); posNdx += positionNumComponents;
                colors.set([0, 0, 1, 0], colNdx); colNdx += colorNumComponents;
                uvs.set([1 - u0, 1 - v0], uvNdx); uvNdx += uvNumComponents;

                vertices.push({
                    index: ndx,
                    position: getPoint(lat1, long0),
                    positionIndex: posNdx,
                    uv: [1 - u0, 1 - v1],
                    uvIndex: uvNdx
                })
                positions.set(getPoint(lat1, long0), posNdx); posNdx += positionNumComponents;
                colors.set([0, 0, 1, 0], colNdx); colNdx += colorNumComponents;
                uvs.set([1 - u0, 1 - v1], uvNdx); uvNdx += uvNumComponents;

                vertices.push({
                    index: ndx,
                    position: getPoint(lat0, long1),
                    positionIndex: posNdx,
                    uv: [1 - u1, 1 - v0],
                    uvIndex: uvNdx
                })
                positions.set(getPoint(lat0, long1), posNdx); posNdx += positionNumComponents;
                colors.set([0, 0, 1, 0], colNdx); colNdx += colorNumComponents;
                uvs.set([1 - u1, 1 - v0], uvNdx); uvNdx += uvNumComponents;

                vertices.push({
                    index: ndx,
                    position: getPoint(lat1, long1),
                    positionIndex: posNdx,
                    uv: [1 - u1, 1 - v1],
                    uvIndex: uvNdx
                })
                positions.set(getPoint(lat1, long1), posNdx); posNdx += positionNumComponents;
                colors.set([0, 0, 1, 0], colNdx); colNdx += colorNumComponents;
                uvs.set([1 - u1, 1 - v1], uvNdx); uvNdx += uvNumComponents;

                indices.push(
                    ndx + 2, ndx + 1, ndx,
                    ndx + 3, ndx + 1, ndx + 2,
                );
                ndx += 4;
            }
        }
        return { positions, indices, uvs, vertices, colors };
    }


    function updateOtherUser(id, head, handR, handL) {
        let otherUser = mOtherUsers.find(o => o.getId() == id);
        if (!otherUser) console.error("User not found!", id);
        otherUser.update(head, handR, handL);
    }

    function removeOtherUser(id) {
        let otherUser = mOtherUsers.find(o => o.getId() == id);
        mOtherUsers = mOtherUsers.filter(o => o.getId() != id);
        otherUser.remove();
    }

    function addOtherUser(id, head, handR, handL) {
        let otherUser = new OtherUserWrapper(mScene, id);
        otherUser.update(head, handR, handL);
        mOtherUsers.push(otherUser);
    }


    async function updateModel(model, assetUtil) {
        let oldModel = mModel;
        mModel = model;

        let story = mModel;
        let oldStory = oldModel;

        if (story.background != oldStory.background || !mScene.background) {
            if (story.background) {
                mEnvironmentBox = await assetUtil.loadEnvironmentCube(story.background);
            } else {
                mEnvironmentBox = await assetUtil.loadDefaultEnvironmentCube();
            }
            mScene.background = mEnvironmentBox;
        }

        for (let p of model.photoSpherePoints) {
            idArray[p.index] = p.id;
            let pos = new THREE.Vector3(p.x, p.y, p.z);
            if (pos.length() > 0) setPosition(p.index, pos);
        }
    }

    function getTargets(ray) {
        ray.params.Points.threshold = selectionDist;
        let intersects = ray.intersectObject(particles);

        if (intersects.length > 0) {
            let closestIntersect = intersects.reduce((min, i) => i.distanceToRay < min.distanceToRay ? i : min, intersects[0]);
            if (closestIntersect.distanceToRay > tweenDist) return [];

            let originalClosetsPosition = getPosition(closestIntersect.index);

            intersects = intersects.filter(i => {
                let pos = getPosition(i.index);
                return pos.distanceTo(originalClosetsPosition) < selectionDist;
            })

            let ids = intersects.map(i => idArray[i.index]);

            let indexes = intersects.map(i => i.index);

            // add a falloff
            let distances = intersects.map(i => {
                let pos = getPosition(i.index);
                return 1 - pos.distanceTo(originalClosetsPosition) / selectionDist;
            });

            // issue here where calling get ID always returns the current not the previous
            let id = "points-" + indexes.join('-');

            let target = new InteractionTargetWrapper();
            let originalPositions = intersects.map(i => getPosition(i.index));
            target.getId = () => ids;
            target.getIntersection = () => closestIntersect;
            target.getRoot = () => target;
            target.highlight = () => {
                for (let index of indexes) {
                    colors.set([0, 0, 1, 1], colorNumComponents * index)
                }
                colorAttribute.needsUpdate = true;
            }
            target.unhighlight = () => {
                for (let index of indexes) {
                    colors.set([0, 0, 1, 0], colorNumComponents * index)
                }
                colorAttribute.needsUpdate = true;
            }
            target.getWorldPosition = () => {
                return getPosition(closestIntersect.index);
            }
            target.setWorldPosition = (pos) => {
                let originalPos = new THREE.Vector3().copy(originalClosetsPosition);
                let projectedPoint = new THREE.Vector3();
                new THREE.Line3(new THREE.Vector3(), originalPos).closestPointToPoint(pos, false, projectedPoint);

                let dist = originalPos.distanceTo(projectedPoint);
                let sign = originalPos.length() < projectedPoint.length() ? 1 : -1;
                dist *= sign;

                // let dist = originalPos.distanceTo(pos);
                // let sign = originalPos.sub(pos).y;
                // sign /= Math.abs(sign);
                // dist *= sign;

                for (let i in intersects) {
                    let index = intersects[i].index;
                    let originalPos = new THREE.Vector3().copy(originalPositions[i]);
                    let change = new THREE.Vector3().copy(originalPos).normalize().multiplyScalar(dist * distances[i]);
                    let newPos = new THREE.Vector3().addVectors(originalPos, change);
                    setPosition(index, newPos)
                }
            }
            target.getPointPositions = () => {
                return indexes.map(i => {
                    return {
                        id: idArray[i],
                        position: getPosition(i),
                        index: i,
                    }
                })
            }
            return [target]
        } else {
            return [];
        }
    }

    function getPosition(index) {
        let i = index * positionNumComponents;
        return new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
    }

    function setPosition(index, pos) {
        if (index > positionNumComponents.count) {
            console.error("invalid index: " + index); return;
        }
        positions.set(pos.toArray(), positionNumComponents * index);
        positionAttribute.needsUpdate = true;
    }

    function toSceneCoordinates(v) {
        let local = new THREE.Vector3().copy(v);
        mContent.worldToLocal(local)
        return local;
    }

    function setMode(mode) {
        if (mode == EditMode.MODEL) {
            setScale(1);
        } else if (mode == EditMode.WORLD) {
            setScale(0.5);
        } else if (mode == EditMode.TIMELINE) {
            setScale(0.1);
        }
    }

    function setScale(scale) {
        mContent.scale.set(scale, scale, scale);
    }


    function userMove(globalPosition) {
        // nothing atm
    }

    this.updateModel = updateModel;
    this.getTargets = getTargets;
    this.userMove = userMove;
    this.toSceneCoordinates = toSceneCoordinates;
    this.setMode = setMode;
    this.setScale = setScale;
    this.updateOtherUser = updateOtherUser;
    this.removeOtherUser = removeOtherUser;
    this.addOtherUser = addOtherUser;
    this.updateVerticePosition = updateVerticePosition;
    this.updateVerticeUV = updateVerticeUV;
    this.getScene = () => mScene;
    this.getContent = () => mContent;
}