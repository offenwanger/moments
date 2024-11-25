/**
 * Listens to global browser events 
 */

export function EventManager() {
    let mListener = {};

    async function setListener(listener) {
        try {
            mListener = listener;
            if (mListener.resize) await mListener.resize(window.innerWidth, window.innerHeight)
        } catch (e) {
            console.error(e);
        }
    }

    window.addEventListener('resize', async () => {
        try {
            if (mListener.resize) await mListener.resize(window.innerWidth, window.innerHeight);
        } catch (e) {
            console.error(e);
        }
    });

    window.addEventListener('pointermove', async (event) => {
        try {
            if (mListener.pointerMove) await mListener.pointerMove({ x: event.clientX, y: event.clientY });
        } catch (e) {
            console.error(e);
        }
    });

    window.addEventListener('pointerup', async (event) => {
        try {
            if (mListener.pointerUp) await mListener.pointerUp({ x: event.clientX, y: event.clientY });
        } catch (e) {
            console.error(e);
        }
    });

    return {
        setListener,
    }
}

