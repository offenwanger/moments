import * as THREE from 'three';
import { Moment } from "./moment.js";
import { Caption } from "./caption.js";

export function Storyline(parentScene) {
    const mMoments = [];
    let mEnvironmentBox = getDefaultEnvBox();

    function loadFromObject(obj) {
        // TODO: load the env box from the json

        parentScene.background = mEnvironmentBox;

        let result = [];

        let testCount = 16;
        for (let i = 0; i < testCount; i++) {
            let m = new Moment(parentScene);
            m.setEnvBox(mEnvironmentBox);

            m.setPosition(new THREE.Vector3(
                Math.sin(Math.PI * 3 * i / testCount) * 2 + i / 4,
                Math.cos(Math.PI * 3 * i / testCount) * 2 + i / 4,
                Math.cos(Math.PI * 3 * i / testCount) * -2 + i / 4))
            m.setSize(0.5 + (i % 4) / 8)
            m.setOrientation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * (i % 8) / 8))

            result.push(m)
        }

        [{ offset: { x: 1, y: 1 }, moment: 0, root: new THREE.Vector3(-15.1, 7, -0.5), text: 'Things are less significant if I am talking. Unfourtunatly, I do need to say things in order to test the speech bubbles.' },
        { offset: { x: 0.75, y: 1.5 }, moment: 2, root: new THREE.Vector3(-15.1, 2.2, 1.2), text: 'There are sometimes things to say.' },
        { offset: { x: -0.25, y: 1.25 }, moment: 2, root: new THREE.Vector3(0, 0, 2), text: 'and they must be readable', },
        { offset: { x: 1.5, y: 0 }, moment: 3, root: new THREE.Vector3(0, 0, 2), text: 'And they could go anywhere', },
        { offset: { x: 0, y: -1.5 }, moment: 4, root: new THREE.Vector3(0, 0, 2), text: 'Anywhere at all', },
        ].forEach(c => {
            let caption = new Caption(parentScene);
            caption.setText(c.text);
            caption.setOffset(c.offset);
            caption.setRoot(c.root);
            result[c.moment].addCaption(caption);
        })

        mMoments.splice(0, mMoments.length, ...result);
    }

    function getObject() {
        return JSON.stringify({})
    }

    function sortMoments(userOffset) {
        // sort the moments by their distance to the user. 
        // from the time point the user is standing on. Only changes when the user moves
        // then we can just check the moments whose tDist places them in
        // the walking area
        mMoments.forEach(moment => {
            moment.tDist = userOffset.distanceTo(moment.getPosition());
        })
        mMoments.sort((a, b) => a.tDist - b.tDist)
    }

    function getDefaultEnvBox() {
        let cubeLoader = new THREE.CubeTextureLoader();
        cubeLoader.setPath('assets/envbox/');
        return cubeLoader.load([
            'px.jpg', 'nx.jpg',
            'py.jpg', 'ny.jpg',
            'pz.jpg', 'nz.jpg'
        ]);
    }

    this.loadFromObject = loadFromObject;
    this.getObject = getObject;
    this.sortMoments = sortMoments;
    this.getMoments = () => mMoments;
}