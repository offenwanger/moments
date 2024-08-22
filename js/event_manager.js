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

    d3.select(window).on('resize', async () => {
        try {
            if (mListener.resize) await mListener.resize(window.innerWidth, window.innerHeight);
        } catch (e) {
            console.error(e);
        }
    });

    d3.select(window).on('pointermove', async (event) => {
        try {
            if (mListener.pointerMove) await mListener.pointerMove({ x: event.clientX, y: event.clientY });
        } catch (e) {
            console.error(e);
        }
    });

    d3.select(window).on('pointerup', async (event) => {
        try {
            if (mListener.pointerUp) await mListener.pointerUp({ x: event.clientX, y: event.clientY });
        } catch (e) {
            console.error(e);
        }
    });

    /** useful test and development function: */
    // d3.select(document).on('pointerover pointerenter pointerdown pointermove pointerup pointercancel pointerout pointerleave gotpointercapture lostpointercapture abort afterprint animationend animationiteration animationstart beforeprint beforeunload blur canplay canplaythrough change click contextmenu copy cut dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange ended error focus focusin focusout fullscreenchange fullscreenerror hashchange input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseover mouseout mouseup mousewheel offline online open pagehide pageshow paste pause play playing popstate progress ratechange resize reset scroll search seeked seeking select show stalled storage submit suspend timeupdate toggle touchcancel touchend touchmove touchstart transitionend unload volumechange waiting wheel', function (e) {
    //     (console).log(e.type, e, { x: e.clientX, y: e.clientY })
    // });

    return {
        setListener,
    }
}

