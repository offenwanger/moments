/**
 * Listens to global browser events 
 */

export function EventManager() {
    let mListener = {};

    function setListener(listener) {
        mListener = listener;
        if (mListener.onResize) mListener.onResize(window.innerWidth, window.innerHeight)
    }

    d3.select(window).on('resize', () => {
        if (mListener.onResize) mListener.onResize(window.innerWidth, window.innerHeight);
    });

    d3.select(window).on('pointermove', (event) => {
        if (mListener.onPointerMove) mListener.onPointerMove({ x: event.clientX, y: event.clientY });
    });

    d3.select(window).on('pointerup', (event) => {
        if (mListener.onPointerUp) mListener.onPointerUp({ x: event.clientX, y: event.clientY });
    });

    /** useful test and development function: */
    // d3.select(document).on('pointerover pointerenter pointerdown pointermove pointerup pointercancel pointerout pointerleave gotpointercapture lostpointercapture abort afterprint animationend animationiteration animationstart beforeprint beforeunload blur canplay canplaythrough change click contextmenu copy cut dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange ended error focus focusin focusout fullscreenchange fullscreenerror hashchange input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseover mouseout mouseup mousewheel offline online open pagehide pageshow paste pause play playing popstate progress ratechange resize reset scroll search seeked seeking select show stalled storage submit suspend timeupdate toggle touchcancel touchend touchmove touchstart transitionend unload volumechange waiting wheel', function (e) {
    //     (console).log(e.type, e, { x: e.clientX, y: e.clientY })
    // });

    return {
        setListener,
    }
}

