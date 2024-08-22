
import * as td from 'testdouble';
import * as THREE from 'three';
import { createCanvas } from './mock_canvas.js';

export async function mockThreeSetup() {
    await td.replaceEsm('three', {
        ...THREE,
        WebGLRenderer: function () {
            this.setSize = () => { }
            this.setAnimationLoop = () => { }
            this.xr = {
                enabled: false,
                addEventListener: () => { },
                getController: () => { return new THREE.Object3D(); },
                getControllerGrip: () => { return new THREE.Object3D(); },
            }
        },
        ImageLoader: function () {
            this.loadAsync = () => { return createCanvas() }
        },
    });

    await td.replaceEsm('three/addons/webxr/VRButton.js', { VRButton: mockVRButton });
    await td.replaceEsm('three/addons/loaders/GLTFLoader.js', { GLTFLoader: mockGLTFLoader });
    await td.replaceEsm('three/addons/loaders/DRACOLoader.js', { DRACOLoader: mockDRACOLoader });
    await td.replaceEsm('three/addons/controls/OrbitControls.js', { OrbitControls: mockOrbitControls });
    await td.replaceEsm('three/addons/webxr/XRControllerModelFactory.js', { XRControllerModelFactory: mockXRControllerModelFactory });
    await td.replaceEsm("three-mesh-ui", { ThreeMeshUI: {} });
    await td.replaceEsm('three/addons/helpers/VertexNormalsHelper.js', { VertexNormalsHelper: {} });
}

export function mockOrbitControls() {
    this.minDistance = 0;
    this.maxDistance = 0;
    this.target = new THREE.Vector3();
    this.update = function () { };
    this.addEventListener = function () { };
    this.enabled = false;
}

export const mockVRButton = {
    createButton: function () {
        return d3.root.append('div').attr("id", "VRButton");
    }
}

export function mockGLTFLoader() {
    this.setDRACOLoader = () => { };
    this.loadAsync = () => {
        // taken partly from http://localhost:8000/?list=true&story=StoryModel_1724353566701_0
        let scene = new THREE.Scene();
        const segmentHeight = 8;
        const segmentCount = 4;
        const height = segmentHeight * segmentCount;
        const halfHeight = height * 0.5;
        const sizing = {
            segmentHeight: segmentHeight,
            segmentCount: segmentCount,
            height: height,
            halfHeight: halfHeight
        };
        const geometry = new THREE.CylinderGeometry(
            0.2, // radiusTop
            0.2, // radiusBottom
            sizing.height, // height
            8, // radiusSegments
            sizing.segmentCount * 3, // heightSegments
            true // openEnded
        );
        const position = geometry.attributes.position;
        const vertex = new THREE.Vector3();
        const skinIndices = [];
        const skinWeights = [];
        for (let i = 0; i < position.count; i++) {
            vertex.fromBufferAttribute(position, i);
            const y = (vertex.y + sizing.halfHeight);
            const skinIndex = Math.floor(y / sizing.segmentHeight);
            const skinWeight = (y % sizing.segmentHeight) / sizing.segmentHeight;
            skinIndices.push(skinIndex, skinIndex + 1, 0, 0);
            skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
        }
        geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
        geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
        const bones = [];
        let prevBone = new THREE.Bone();
        prevBone.name = "Bone0"
        bones.push(prevBone);
        prevBone.position.y = - sizing.halfHeight;
        for (let i = 0; i < sizing.segmentCount; i++) {
            const bone = new THREE.Bone();
            bone.name = "Bone" + (i + 1);
            bone.position.y = sizing.segmentHeight;
            bones.push(bone);
            prevBone.add(bone);
            prevBone = bone;
        }
        const material = new THREE.MeshPhongMaterial({
            color: 0x156289,
            emissive: 0x072534,
            side: THREE.DoubleSide,
            flatShading: true
        });
        const mesh = new THREE.SkinnedMesh(geometry, material);
        mesh.name = "Mesh1"
        const skeleton = new THREE.Skeleton(bones);
        mesh.add(bones[0]);
        mesh.bind(skeleton);
        let skeletonHelper = new THREE.SkeletonHelper(mesh);
        skeletonHelper.material.linewidth = 2;
        scene.add(skeletonHelper);
        mesh.scale.multiplyScalar(1);
        scene.add(mesh);
        const geometry2 = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const mesh2 = new THREE.Mesh(geometry2, material);
        mesh2.name = "Mesh1"
        mesh2.position.set(0.5, 0, 0);
        scene.add(mesh2);

        return { scene }
    };
}

export function mockDRACOLoader() {
    this.setDecoderPath = () => { };
}

export function mockXRControllerModelFactory() {
    this.createControllerModel = function () { return new THREE.Object3D() }
}
