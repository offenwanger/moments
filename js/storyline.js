import * as THREE from 'three';
import { Moment } from "./moment.js";
import { Caption } from "./caption.js";
import { Util } from './utility.js';

export function Storyline(parentScene) {
    const mMoments = [];
    const mGroup = new THREE.Group();
    const mLines = [];
    parentScene.add(mGroup);

    let mEnvironmentBox = getDefaultEnvBox();

    function loadFromObject(obj) {
        mGroup.remove(...mGroup.children);
        mMoments.splice(0, mMoments.length);

        obj.lines.forEach(line => {
            mLines.push({
                t: line.t,
                curve: new THREE.CatmullRomCurve3(line.path.map(p => new THREE.Vector3().fromArray(p))),
            })
        })

        if (obj.envBox) {
            let cubeLoader = new THREE.CubeTextureLoader();
            mEnvironmentBox = cubeLoader.load(obj.envBox);
        }

        parentScene.background = mEnvironmentBox;

        obj.moments.forEach(momentData => {
            let m = new Moment(mGroup);
            m.setEnvBox(mEnvironmentBox);
            m.setT(momentData.t);
            m.setOffset(momentData.offset);
            m.setSize(momentData.size);
            m.setOrientation(new THREE.Quaternion().fromArray(momentData.orientation));

            momentData.captions.forEach(captionData => {
                let caption = new Caption(mGroup);
                caption.setText(captionData.text);
                caption.setOffset(captionData.offset);
                caption.setRoot(new THREE.Vector3().fromArray(captionData.root));
                m.addCaption(caption);
            })

            mMoments.push(m);
        })
    }

    function getObject() {
        return JSON.stringify({})
    }

    function update(userT) {
        let pointCount = 50;
        let line = mLines[0].curve;
        for (let i = 0; i < mLines.length - 1; i++) {
            if (userT >= mLines[i].t && userT <= mLines[i + 1].t) {
                let line1 = mLines[i].curve;
                let line2 = mLines[i + 1].curve;
                let percent2 = (userT - mLines[i].t) / (mLines[i + 1].t - mLines[i].t)
                let percent1 = 1 - percent2;
                line = new THREE.CatmullRomCurve3(new Array(pointCount).fill("")
                    .map((n, index) => line1.getPointAt(index / pointCount)
                        .multiplyScalar(percent1)
                        .add(
                            line2.getPointAt(index / pointCount)
                                .multiplyScalar(percent2))));
                break;
            }
        }
        // line is a catmullromcurve and we want to transform it so that when 
        // we get points, they are relative to a given base point. 
        // how do we do that? 


        let position = line.getPointAt(userT);
        let tangent = line.getTangentAt(userT);
        let rotation = new THREE.Quaternion().setFromUnitVectors(tangent, new THREE.Vector3(0, 0, -1));

        line = new THREE.CatmullRomCurve3(line.getSpacedPoints(pointCount).map(p => {
            return p.sub(position).applyQuaternion(rotation);
            // NOT WORKINGs
        }));

        mMoments.forEach(moment => {
            moment.setPosition(Util.planeCoordsToWorldCoords(
                moment.getOffset(),
                line.getTangentAt(moment.getT()).multiplyScalar(-1),
                new THREE.Vector3(0, 1, 0),
                line.getPointAt(moment.getT())))
        })
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
    this.update = update;
    this.sortMoments = sortMoments;
    this.getMoments = () => mMoments;
}