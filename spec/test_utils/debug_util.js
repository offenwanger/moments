
const debug_data = {};
function point(id, vec, scene, color = 0x00ff00) {
    if (!debug_data[id]) {
        debug_data[id] = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.1, 15),
            new THREE.MeshBasicMaterial({
                color,
                depthTest: false,
                depthWrite: false,
                transparent: true
            })
        )
        scene.add(debug_data[id]);

    }
    debug_data[id].position.copy(vec)
}

function arrow(id, origin, direction, scene, color = 0x00ff00) {
    if (!debug_data[id]) {
        debug_data[id] = new THREE.ArrowHelper(direction, origin, 1, color);
        debug_data[id].line.material.linewidth = 0.05;
        scene.add(debug_data[id]);
    }
    debug_data[id].setDirection(direction)
    debug_data[id].position.copy(origin)
}

function vertexNormalHelper(mesh, scene) {
    let vnh = new VertexNormalsHelper(mesh, 0.5);
    scene.add(vnh);
}

function onchange(id, obj) {
    let different = false;
    if (obj instanceof THREE.Vector3) {
        different = !debug_data[id] || debug_data[id].distanceTo(obj) > 0.000001;
        debug_data[id] = obj.clone();
    } else if (obj instanceof String) {
        different = !debug_data[id] || debug_data[id] != obj;
        debug_data[id] = obj;
    } else if (typeof obj == 'number') {
        different = !debug_data[id] || Math.abs(obj - debug_data[id]) > 0.000001;
        debug_data[id] = obj;
    } else {
        console.error("Not supported!")
    }
    if (different) {
        logInfo(id, obj);
    }
}

export const DebugUtils = {
    console: {
        log: {
            point,
            arrow,
            onchange,
            vertexNormalHelper,
        }
    }
}