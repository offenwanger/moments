// Addapted from THREE.js VRButton

export function VRButton(container) {
    let mSessionStartedCallback = async (session) => { };

    const button = document.createElement('button');
    container.node().appendChild(button);

    let currentSession = null;

    const sessionOptions = { optionalFeatures: ['local-floor', 'bounded-floor', 'layers'] };

    if (navigator && 'xr' in navigator) {
        button.id = 'VRButton';
        button.style.display = 'none';
        button.style.bottom = '20px';
        button.style.padding = '12px 6px';
        button.style.border = '1px solid #fff';
        button.style.borderRadius = '4px';
        button.style.background = 'rgba(0,0,0,0.1)';
        button.style.color = '#fff';
        button.style.font = 'normal 13px sans-serif';
        button.style.textAlign = 'center';
        button.style.opacity = '0.5';
        button.style.outline = 'none';
        button.style.zIndex = '999';

        navigator.xr.isSessionSupported('immersive-vr').then(function (supported) {
            if (supported) {
                showEnterVR()
            } else {
                disableButton();
                button.textContent = 'VR NOT SUPPORTED';
            }
        }).catch((e) => {
            disableButton();
            console.warn('Exception when trying to call xr.isSessionSupported', e);
            button.textContent = 'VR NOT ALLOWED';
        });
    } else {
        if (window.isSecureContext === false) {
            disableButton();
            button.textContent = 'WEBXR NEEDS HTTPS';
        } else {
            disableButton();
            button.textContent = 'WEBXR NOT AVAILABLE';
        }
    }

    function showEnterVR() {
        button.style.display = '';
        button.style.cursor = 'pointer';
        button.textContent = 'ENTER VR';
        button.onmouseenter = function () { button.style.opacity = '1.0'; };
        button.onmouseleave = function () { button.style.opacity = '0.5'; };
        button.onclick = function () {
            if (currentSession === null) {
                navigator.xr.requestSession('immersive-vr', sessionOptions).then(onSessionStarted);
            } else {
                currentSession.end();
                offerSession();
            }
        };
    }

    async function onSessionStarted(session) {
        session.addEventListener('end', onSessionEnded);
        await mSessionStartedCallback(session);
        button.textContent = 'EXIT VR';
        currentSession = session;
    }

    function onSessionEnded() {
        currentSession.removeEventListener('end', onSessionEnded);
        button.textContent = 'ENTER VR';
        currentSession = null;
    }

    function offerSession() {
        // This is for a nice little button in the Oculus Browser. 
        if (navigator.xr.offerSession !== undefined) {
            navigator.xr.offerSession('immersive-vr', sessionOptions)
                .then(onSessionStarted)
                .catch((err) => { console.warn(err); });
        }
    }

    function disableButton() {
        button.style.display = '';
        button.style.cursor = 'auto';
        button.style.width = '150px';
        button.onmouseenter = null;
        button.onmouseleave = null;
        button.onclick = null;
    }

    this.disableButton = disableButton;
    this.remove = () => container.remove(button);
    this.onSessionStarted = (func) => mSessionStartedCallback = func;
}
