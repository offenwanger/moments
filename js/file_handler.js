// TODO: Remove this
import * as THREE from 'three';

export const FileHandler = function () {
    function loadStorylineFile(file) {
        // this should be in a json
        // TODO: Load in zip file, read json out of zip, validate JSON

        let linepoints = []
        let n = 50;
        let R = 10;
        let a = 10;
        let revoluations = 1
        for (let t = 0; t < n; t++) {
            let x = R * Math.cos(-revoluations * 2 * Math.PI * t / n);
            let z = R * Math.sin(-revoluations * 2 * Math.PI * t / n);
            let y = a * t / n;
            linepoints.push([x, y, z])
        }

        let result = {
            envBox: ['assets/envbox/px.jpg',
                'assets/envbox/nx.jpg',
                'assets/envbox/py.jpg',
                'assets/envbox/ny.jpg',
                'assets/envbox/pz.jpg',
                'assets/envbox/nz.jpg'],
            moments: [],
            line: linepoints,
        }

        let testCount = 16;
        for (let i = 0; i < testCount; i++) {
            result.moments.push({
                t: (i + 1) / testCount,
                offset: {
                    x: Math.sin(Math.PI * 3 * i / testCount) * 2,
                    y: Math.cos(Math.PI * 3 * i / testCount) + 1.2,
                },
                size: 0.5 + (i % 4) / 8,
                orientation: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * (i % 8) / 8).toArray(),
                captions: [],
            })
        }

        result.moments[0].captions = [{
            offset: { x: 1, y: 1 },
            root: new THREE.Vector3(-15.1, 7, -0.5).toArray(),
            text: 'Things are less significant if I am talking. Unfourtunatly, I do need to say things in order to test the speech bubbles.'
        }]
        result.moments[2].captions = [{
            offset: { x: 0.75, y: 1.5 },
            root: new THREE.Vector3(-15.1, 2.2, 1.2).toArray(),
            text: 'There are sometimes things to say.'
        }, {
            offset: { x: -0.25, y: 1.25 },
            root: new THREE.Vector3(0, 0, 2).toArray(),
            text: 'and they must be readable',
        }]
        result.moments[3].captions = [{
            offset: { x: 1.5, y: 0 },
            root: new THREE.Vector3(0, 0, 2).toArray(),
            text: 'And they could go anywhere',
        }]
        result.moments[4].captions = [{
            offset: { x: 0, y: -1.5 },
            root: new THREE.Vector3(0, 0, 2).toArray(),
            text: 'Anywhere at all',
        }]

        return result;
    }


    return {
        loadStorylineFile,
    }
}();