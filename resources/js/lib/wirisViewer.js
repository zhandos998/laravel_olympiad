const WIRIS_VIEWER_SCRIPT_ID = 'wiris-viewer-script';
const WIRIS_VIEWER_SRC = 'https://www.wiris.net/demo/plugins/app/WIRISplugins.js?viewer=image';

let wirisViewerPromise;

function currentWirisViewer() {
    return window.com?.wiris?.js?.JsPluginViewer ?? null;
}

export function loadWirisViewer() {
    if (typeof window === 'undefined') {
        return Promise.resolve(null);
    }

    const existingViewer = currentWirisViewer();
    if (existingViewer) {
        return Promise.resolve(existingViewer);
    }

    if (wirisViewerPromise) {
        return wirisViewerPromise;
    }

    wirisViewerPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById(WIRIS_VIEWER_SCRIPT_ID);

        const resolveViewer = () => resolve(currentWirisViewer());
        const rejectViewer = () => reject(new Error('Failed to load WIRIS viewer'));

        if (existingScript) {
            existingScript.addEventListener('load', resolveViewer, { once: true });
            existingScript.addEventListener('error', rejectViewer, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.id = WIRIS_VIEWER_SCRIPT_ID;
        script.async = true;
        script.src = WIRIS_VIEWER_SRC;
        script.addEventListener('load', resolveViewer, { once: true });
        script.addEventListener('error', rejectViewer, { once: true });
        document.head.appendChild(script);
    }).catch((error) => {
        wirisViewerPromise = undefined;
        throw error;
    });

    return wirisViewerPromise;
}

export async function renderWirisFormulas(element) {
    if (!element || typeof window === 'undefined') {
        return;
    }

    const viewer = await loadWirisViewer();
    viewer?.parseElement?.(element);
}
