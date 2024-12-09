/**
 * Listens to global browser events 
 */

export function WindowEventManager() {
    let mPointerUpCallback = async (screenCoords) => { }
    let mPointerMoveCallback = async (screenCoords) => { }
    let mResizeCallback = async (width, height) => { }

    window.addEventListener('resize', async () => {
        try {
            await mResizeCallback(window.innerWidth, window.innerHeight);
        } catch (e) { console.error(e); }
    });

    window.addEventListener('pointermove', async (event) => {
        try {
            await mPointerMoveCallback({ x: event.clientX, y: event.clientY });
        } catch (e) { console.error(e); }
    });

    window.addEventListener('pointerup', async (event) => {
        try {
            await mPointerUpCallback({ x: event.clientX, y: event.clientY });
        } catch (e) { console.error(e); }
    });

    return {
        onPointerUp: (func) => mPointerUpCallback = func,
        onPointerMove: (func) => mPointerMoveCallback = func,
        onResize: (func) => {
            mResizeCallback = func;
            mResizeCallback(window.innerWidth, window.innerHeight);
        },
    }
}

