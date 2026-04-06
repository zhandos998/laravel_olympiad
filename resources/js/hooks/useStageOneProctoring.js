import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { deleteQueuedChunk, getNextQueuedSequence, isProctoringQueueSupported, listQueuedChunks, saveQueuedChunk } from '../lib/proctoringQueue';

const CHUNK_INTERVAL_MS = 12000;
const COMPOSITION_FPS = 12;
const DEFAULT_CANVAS_WIDTH = 960;
const DEFAULT_CANVAS_HEIGHT = 540;
const CAMERA_MARGIN = 24;
const CAMERA_WIDTH_RATIO = 0.22;
const CAMERA_MIN_WIDTH = 180;
const CAMERA_MAX_WIDTH = 260;
const CAMERA_RADIUS = 18;

function buildCopy(locale) {
    if (locale === 'kaz') {
        return {
            idle: '\u041f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433\u0442\u0456 \u0431\u0430\u0441\u0442\u0430\u0443 \u04af\u0448\u0456\u043d \u0442\u04e9\u043c\u0435\u043d\u0434\u0435\u0433\u0456 \u0431\u0430\u0442\u044b\u0440\u043c\u0430\u043d\u044b \u0431\u0430\u0441\u044b\u04a3\u044b\u0437. \u0421\u043e\u0434\u0430\u043d \u043a\u0435\u0439\u0456\u043d \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043a\u0430\u043c\u0435\u0440\u0430\u0493\u0430, \u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d\u0493\u0430 \u0436\u04d9\u043d\u0435 \u044d\u043a\u0440\u0430\u043d\u0493\u0430 \u0440\u04b1\u049b\u0441\u0430\u0442 \u0441\u04b1\u0440\u0430\u0439\u0434\u044b.',
            requesting: '\u041f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433 \u049b\u04b1\u0440\u0430\u043b\u0434\u0430\u0440\u044b \u0456\u0441\u043a\u0435 \u049b\u043e\u0441\u044b\u043b\u0443\u0434\u0430.',
            active: '\u042d\u043a\u0440\u0430\u043d, \u0432\u0435\u0431-\u043a\u0430\u043c\u0435\u0440\u0430 \u0436\u04d9\u043d\u0435 \u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d \u0436\u0430\u0437\u044b\u043b\u044b\u043f \u0436\u0430\u0442\u044b\u0440.',
            permissionDenied:
                '\u0422\u0435\u0441\u0442\u0456 \u0436\u0430\u043b\u0493\u0430\u0441\u0442\u044b\u0440\u0443 \u04af\u0448\u0456\u043d \u044d\u043a\u0440\u0430\u043d\u0493\u0430, \u0432\u0435\u0431-\u043a\u0430\u043c\u0435\u0440\u0430\u0493\u0430 \u0436\u04d9\u043d\u0435 \u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d\u0493\u0430 \u0440\u04b1\u049b\u0441\u0430\u0442 \u0431\u0435\u0440\u0456\u04a3\u0456\u0437.',
            unsupported: '\u0411\u04b1\u043b \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433 \u0436\u0430\u0437\u0431\u0430\u0441\u044b\u043d \u049b\u043e\u043b\u0434\u0430\u043c\u0430\u0439\u0434\u044b.',
            screenStopped: '\u042d\u043a\u0440\u0430\u043d\u0434\u044b \u043a\u04e9\u0440\u0441\u0435\u0442\u0443 \u0442\u043e\u049b\u0442\u0430\u0434\u044b. \u041f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433\u0442\u0456 \u049b\u0430\u0439\u0442\u0430 \u049b\u043e\u0441\u044b\u04a3\u044b\u0437.',
            uploadFailed: '\u041f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433 \u0436\u0430\u0437\u0431\u0430\u0441\u044b\u043d \u0441\u0430\u049b\u0442\u0430\u0443 \u0441\u04d9\u0442\u0441\u0456\u0437 \u0430\u044f\u049b\u0442\u0430\u043b\u0434\u044b. \u0416\u0430\u0437\u0431\u0430\u043d\u044b \u049b\u0430\u0439\u0442\u0430 \u049b\u043e\u0441\u044b\u04a3\u044b\u0437.',
            stopFailed: '\u041f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433 \u0436\u0430\u0437\u0431\u0430\u0441\u044b\u043d \u0430\u044f\u049b\u0442\u0430\u0443 \u043c\u04af\u043c\u043a\u0456\u043d \u0431\u043e\u043b\u043c\u0430\u0434\u044b.',
        };
    }

    return {
        idle: '\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u043a\u043d\u043e\u043f\u043a\u0443 \u043d\u0438\u0436\u0435, \u0447\u0442\u043e\u0431\u044b \u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u043f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433. \u041f\u043e\u0441\u043b\u0435 \u044d\u0442\u043e\u0433\u043e Chrome \u043f\u043e\u043a\u0430\u0436\u0435\u0442 \u0441\u0438\u0441\u0442\u0435\u043c\u043d\u044b\u0435 \u043e\u043a\u043d\u0430 \u0434\u043b\u044f \u043a\u0430\u043c\u0435\u0440\u044b, \u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d\u0430 \u0438 \u044d\u043a\u0440\u0430\u043d\u0430.',
        requesting: '\u0417\u0430\u043f\u0443\u0441\u043a\u0430\u0435\u0442\u0441\u044f \u043f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433.',
        active: '\u042d\u043a\u0440\u0430\u043d, \u0432\u0435\u0431-\u043a\u0430\u043c\u0435\u0440\u0430 \u0438 \u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d \u0437\u0430\u043f\u0438\u0441\u044b\u0432\u0430\u044e\u0442\u0441\u044f.',
        permissionDenied:
            '\u0414\u043b\u044f \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u044f \u0442\u0435\u0441\u0442\u0430 \u043d\u0443\u0436\u043d\u043e \u0440\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044c \u0434\u043e\u0441\u0442\u0443\u043f \u043a \u044d\u043a\u0440\u0430\u043d\u0443, \u0432\u0435\u0431-\u043a\u0430\u043c\u0435\u0440\u0435 \u0438 \u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d\u0443.',
        unsupported: '\u042d\u0442\u043e\u0442 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u0437\u0430\u043f\u0438\u0441\u044c \u043f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433\u0430.',
        screenStopped: '\u0414\u0435\u043c\u043e\u043d\u0441\u0442\u0440\u0430\u0446\u0438\u044f \u044d\u043a\u0440\u0430\u043d\u0430 \u0431\u044b\u043b\u0430 \u043e\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u0430. \u0412\u043a\u043b\u044e\u0447\u0438\u0442\u0435 \u043f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433 \u0437\u0430\u043d\u043e\u0432\u043e.',
        uploadFailed: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0437\u0430\u043f\u0438\u0441\u044c \u043f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433\u0430. \u041f\u0435\u0440\u0435\u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u0435 \u0437\u0430\u043f\u0438\u0441\u044c.',
        stopFailed: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u043e \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u043f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433.',
    };
}

function pickMimeType(kind) {
    const candidates =
        kind === 'microphone'
            ? ['audio/webm;codecs=opus', 'audio/webm']
            : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

    return candidates.find((candidate) => window.MediaRecorder?.isTypeSupported?.(candidate)) ?? '';
}

async function uploadChunk({ sessionId, kind, sequence, blob, token, locale }) {
    if (!blob || blob.size === 0) {
        return;
    }

    const formData = new FormData();
    formData.append('kind', kind);
    formData.append('sequence', String(sequence));
    formData.append('chunk', blob, `${kind}-${String(sequence).padStart(6, '0')}.webm`);

    const response = await fetch(`/api/student/proctoring-sessions/${sessionId}/chunks`, {
        method: 'POST',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Locale': locale,
        },
        body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || 'Failed to upload proctoring chunk');
    }

    return data;
}

function createMediaElement(stream) {
    const element = document.createElement('video');
    element.autoplay = true;
    element.muted = true;
    element.playsInline = true;
    element.srcObject = stream;

    return element;
}

function waitForMediaElement(element) {
    return new Promise((resolve) => {
        if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            resolve();
            return;
        }

        const finish = () => {
            element.removeEventListener('loadedmetadata', finish);
            element.removeEventListener('canplay', finish);
            resolve();
        };

        element.addEventListener('loadedmetadata', finish, { once: true });
        element.addEventListener('canplay', finish, { once: true });
        void element.play().catch(() => {});
    });
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function buildCameraPlacement(canvasWidth, canvasHeight, videoWidth, videoHeight) {
    const width = clamp(Math.round(canvasWidth * CAMERA_WIDTH_RATIO), CAMERA_MIN_WIDTH, CAMERA_MAX_WIDTH);
    const aspectRatio = videoWidth > 0 && videoHeight > 0 ? videoHeight / videoWidth : 9 / 16;
    const height = Math.round(width * aspectRatio);

    return {
        width,
        height,
        x: canvasWidth - width - CAMERA_MARGIN,
        y: canvasHeight - height - CAMERA_MARGIN,
    };
}

function drawRoundedVideo(context, video, placement) {
    context.save();
    context.beginPath();
    context.moveTo(placement.x + CAMERA_RADIUS, placement.y);
    context.lineTo(placement.x + placement.width - CAMERA_RADIUS, placement.y);
    context.quadraticCurveTo(placement.x + placement.width, placement.y, placement.x + placement.width, placement.y + CAMERA_RADIUS);
    context.lineTo(placement.x + placement.width, placement.y + placement.height - CAMERA_RADIUS);
    context.quadraticCurveTo(
        placement.x + placement.width,
        placement.y + placement.height,
        placement.x + placement.width - CAMERA_RADIUS,
        placement.y + placement.height,
    );
    context.lineTo(placement.x + CAMERA_RADIUS, placement.y + placement.height);
    context.quadraticCurveTo(placement.x, placement.y + placement.height, placement.x, placement.y + placement.height - CAMERA_RADIUS);
    context.lineTo(placement.x, placement.y + CAMERA_RADIUS);
    context.quadraticCurveTo(placement.x, placement.y, placement.x + CAMERA_RADIUS, placement.y);
    context.closePath();

    context.shadowColor = 'rgba(15, 23, 42, 0.35)';
    context.shadowBlur = 24;
    context.shadowOffsetY = 12;
    context.fillStyle = '#0f172a';
    context.fill();
    context.clip();
    context.drawImage(video, placement.x, placement.y, placement.width, placement.height);
    context.restore();

    context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    context.lineWidth = 3;
    context.strokeRect(placement.x, placement.y, placement.width, placement.height);
}

export function useStageOneProctoring({ olympiadId, token, locale }) {
    const copy = buildCopy(locale);
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState(copy.idle);
    const [webcamStream, setWebcamStream] = useState(null);

    const sessionIdRef = useRef(null);
    const sequencesRef = useRef({
        combined: 0,
    });
    const streamsRef = useRef({
        screen: null,
        camera: null,
        microphone: null,
        combined: null,
    });
    const recordersRef = useRef({
        chunked: null,
    });
    const chunkRotationTimerRef = useRef(null);
    const compositionRef = useRef({
        frameId: null,
        screenVideo: null,
        cameraVideo: null,
    });
    const pendingUploadsRef = useRef(new Set());
    const drainQueuePromiseRef = useRef(Promise.resolve());
    const startPromiseRef = useRef(null);
    const stopPromiseRef = useRef(null);
    const isStoppingRef = useRef(false);

    const cleanupComposition = () => {
        if (compositionRef.current.frameId) {
            window.cancelAnimationFrame(compositionRef.current.frameId);
        }

        [compositionRef.current.screenVideo, compositionRef.current.cameraVideo].forEach((element) => {
            if (!element) {
                return;
            }

            element.pause();
            element.srcObject = null;
        });

        compositionRef.current = {
            frameId: null,
            screenVideo: null,
            cameraVideo: null,
        };
    };

    const releaseStreams = () => {
        if (chunkRotationTimerRef.current) {
            window.clearTimeout(chunkRotationTimerRef.current);
            chunkRotationTimerRef.current = null;
        }

        Object.values(streamsRef.current).forEach((stream) => {
            stream?.getTracks?.().forEach((track) => track.stop());
        });

        cleanupComposition();
        streamsRef.current = {
            screen: null,
            camera: null,
            microphone: null,
            combined: null,
        };
        recordersRef.current = {
            chunked: null,
        };
        setWebcamStream(null);
    };

    const waitForPendingUploads = async () => {
        while (pendingUploadsRef.current.size > 0) {
            const uploads = Array.from(pendingUploadsRef.current);
            await Promise.allSettled(uploads);
        }
    };

    const stopCurrentProctoring = async ({ markFinished }) => {
        if (stopPromiseRef.current) {
            return stopPromiseRef.current;
        }

        stopPromiseRef.current = (async () => {
            isStoppingRef.current = true;

            try {
                const stopTasks = Object.values(recordersRef.current)
                    .filter((recorder) => recorder && recorder.state !== 'inactive')
                    .map(
                        (recorder) =>
                            new Promise((resolve) => {
                                recorder.addEventListener('stop', resolve, { once: true });
                                recorder.stop();
                            }),
                    );

                await Promise.all(stopTasks);
                await waitForPendingUploads();

                if (markFinished && sessionIdRef.current) {
                    await api(`/student/proctoring-sessions/${sessionIdRef.current}/finish`, {
                        method: 'POST',
                        token,
                    });
                    sessionIdRef.current = null;
                }
            } finally {
                releaseStreams();
                isStoppingRef.current = false;
                stopPromiseRef.current = null;
            }
        })();

        return stopPromiseRef.current;
    };

    const blockProctoring = async (nextMessage) => {
        setStatus('blocked');
        setMessage(nextMessage);

        try {
            await stopCurrentProctoring({ markFinished: false });
        } catch {
            releaseStreams();
        }
    };

    const registerPendingUpload = (uploadPromise) => {
        pendingUploadsRef.current.add(uploadPromise);
        uploadPromise.finally(() => {
            pendingUploadsRef.current.delete(uploadPromise);
        });
    };

    const queueChunkUpload = (blob) => {
        if (!sessionIdRef.current || !blob || blob.size === 0) {
            return;
        }

        const sequence = sequencesRef.current.combined;
        sequencesRef.current.combined += 1;

        const uploadPromise = Promise.resolve()
            .then(async () => {
                if (isProctoringQueueSupported()) {
                    await saveQueuedChunk({
                        sessionId: sessionIdRef.current,
                        kind: 'combined',
                        sequence,
                        blob,
                    });

                    await drainQueuedChunks(sessionIdRef.current);
                    return;
                }

                await uploadChunk({
                    sessionId: sessionIdRef.current,
                    kind: 'combined',
                    sequence,
                    blob,
                    token,
                    locale,
                });
            })
            .catch(() => {
                if (!isStoppingRef.current) {
                    void blockProctoring(copy.uploadFailed);
                }
            });

        registerPendingUpload(uploadPromise);
    };

    const drainQueuedChunks = (sessionId) => {
        if (!isProctoringQueueSupported()) {
            return Promise.resolve();
        }

        const drainPromise = drainQueuePromiseRef.current
            .catch(() => {})
            .then(async () => {
                const queuedChunks = await listQueuedChunks(sessionId, 'combined');

                for (const queuedChunk of queuedChunks) {
                    await uploadChunk({
                        sessionId,
                        kind: queuedChunk.kind,
                        sequence: queuedChunk.sequence,
                        blob: queuedChunk.blob,
                        token,
                        locale,
                    });

                    await deleteQueuedChunk(queuedChunk.id);
                }
            });

        drainQueuePromiseRef.current = drainPromise;
        registerPendingUpload(drainPromise);

        return drainPromise;
    };

    const createCombinedStream = async ({ screenStream, cameraStream, microphoneStream }) => {
        if (!HTMLCanvasElement.prototype.captureStream) {
            throw new Error('COMPOSITION_NOT_SUPPORTED');
        }

        cleanupComposition();

        const canvas = document.createElement('canvas');
        canvas.width = DEFAULT_CANVAS_WIDTH;
        canvas.height = DEFAULT_CANVAS_HEIGHT;

        const context = canvas.getContext('2d', { alpha: false });

        if (!context) {
            throw new Error('COMPOSITION_NOT_SUPPORTED');
        }

        const screenVideo = createMediaElement(screenStream);
        const cameraVideo = createMediaElement(new MediaStream(cameraStream.getVideoTracks()));

        await Promise.all([waitForMediaElement(screenVideo), waitForMediaElement(cameraVideo)]);

        const syncCanvasSize = () => {
            const nextWidth = screenVideo.videoWidth || DEFAULT_CANVAS_WIDTH;
            const nextHeight = screenVideo.videoHeight || DEFAULT_CANVAS_HEIGHT;

            if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
                canvas.width = nextWidth;
                canvas.height = nextHeight;
            }
        };

        const drawFrame = () => {
            syncCanvasSize();

            context.fillStyle = '#020617';
            context.fillRect(0, 0, canvas.width, canvas.height);

            if (screenVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                context.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
            }

            if (cameraVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                const placement = buildCameraPlacement(canvas.width, canvas.height, cameraVideo.videoWidth, cameraVideo.videoHeight);
                drawRoundedVideo(context, cameraVideo, placement);
            }

            compositionRef.current.frameId = window.requestAnimationFrame(drawFrame);
        };

        drawFrame();

        const combinedStream = canvas.captureStream(COMPOSITION_FPS);

        microphoneStream.getAudioTracks().forEach((track) => {
            combinedStream.addTrack(track.clone());
        });

        compositionRef.current = {
            frameId: compositionRef.current.frameId,
            screenVideo,
            cameraVideo,
        };

        return combinedStream;
    };

    const startRecorders = (stream) => {
        const mimeType = pickMimeType('combined');
        const startNextSegment = () => {
            if (!sessionIdRef.current || isStoppingRef.current) {
                return;
            }

            const chunkedRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            let chunkBlob = null;

            chunkedRecorder.addEventListener('dataavailable', (event) => {
                if (!event.data || event.data.size === 0) {
                    return;
                }

                chunkBlob = event.data;
            });

            chunkedRecorder.addEventListener('stop', () => {
                if (chunkRotationTimerRef.current) {
                    window.clearTimeout(chunkRotationTimerRef.current);
                    chunkRotationTimerRef.current = null;
                }

                if (chunkBlob) {
                    queueChunkUpload(chunkBlob);
                }

                if (!isStoppingRef.current && sessionIdRef.current) {
                    startNextSegment();
                }
            });

            chunkedRecorder.start();
            recordersRef.current = {
                chunked: chunkedRecorder,
            };

            chunkRotationTimerRef.current = window.setTimeout(() => {
                if (chunkedRecorder.state !== 'inactive') {
                    chunkedRecorder.stop();
                }
            }, CHUNK_INTERVAL_MS);
        };

        startNextSegment();
    };

    const startProctoring = async () => {
        if (startPromiseRef.current) {
            return startPromiseRef.current;
        }

        startPromiseRef.current = (async () => {
            if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.getDisplayMedia) {
                setStatus('blocked');
                setMessage(copy.unsupported);
                return false;
            }

            setStatus('requesting');
            setMessage(copy.requesting);

            try {
                const cameraStreamPromise = navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                const screenStreamPromise = navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false,
                });

                try {
                    await stopCurrentProctoring({ markFinished: false });
                } catch {
                    releaseStreams();
                }

                const [cameraResult, screenResult, sessionResult] = await Promise.allSettled([
                    cameraStreamPromise,
                    screenStreamPromise,
                    api(`/student/olympiads/${olympiadId}/proctoring/start`, {
                        method: 'POST',
                        token,
                    }),
                ]);

                if (cameraResult.status === 'rejected' || screenResult.status === 'rejected' || sessionResult.status === 'rejected') {
                    if (cameraResult.status === 'fulfilled') {
                        cameraResult.value.getTracks().forEach((track) => track.stop());
                    }

                    if (screenResult.status === 'fulfilled') {
                        screenResult.value.getTracks().forEach((track) => track.stop());
                    }

                    throw new Error('PROCTORING_START_FAILED');
                }

                const cameraStream = cameraResult.value;
                const screenStream = screenResult.value;
                const session = sessionResult.value;

                sessionIdRef.current = session.session_id;
                const nextQueuedSequence = isProctoringQueueSupported() ? await getNextQueuedSequence(session.session_id, 'combined') : 0;
                sequencesRef.current = {
                    combined: Math.max(session.uploaded_counts?.combined ?? 0, nextQueuedSequence),
                };

                const microphoneStream = new MediaStream(cameraStream.getAudioTracks().map((track) => track.clone()));
                const combinedStream = await createCombinedStream({
                    screenStream,
                    cameraStream,
                    microphoneStream,
                });

                streamsRef.current = {
                    screen: screenStream,
                    camera: cameraStream,
                    microphone: microphoneStream,
                    combined: combinedStream,
                };

                screenStream.getVideoTracks().forEach((track) => {
                    track.addEventListener('ended', () => {
                        if (!isStoppingRef.current) {
                            void blockProctoring(copy.screenStopped);
                        }
                    });
                });

                setWebcamStream(cameraStream);
                void drainQueuedChunks(session.session_id).catch(() => {});

                startRecorders(combinedStream);

                setStatus('active');
                setMessage(copy.active);
                return true;
            } catch (error) {
                releaseStreams();
                setStatus('blocked');
                setMessage(error?.message ? copy.permissionDenied : copy.permissionDenied);
                return false;
            }
        })();

        try {
            return await startPromiseRef.current;
        } finally {
            startPromiseRef.current = null;
        }
    };

    const finishProctoring = async () => {
        if (!sessionIdRef.current) {
            return true;
        }

        try {
            await stopCurrentProctoring({ markFinished: true });
            setStatus('finished');
            return true;
        } catch (error) {
            setStatus('blocked');
            setMessage(error.message || copy.stopFailed);
            return false;
        }
    };

    useEffect(() => {
        setMessage(copy.idle);

        const flushPendingData = () => {
            if (recordersRef.current.chunked?.state === 'recording') {
                recordersRef.current.chunked.stop();
            }
        };

        window.addEventListener('pagehide', flushPendingData);
        window.addEventListener('beforeunload', flushPendingData);

        return () => {
            window.removeEventListener('pagehide', flushPendingData);
            window.removeEventListener('beforeunload', flushPendingData);
            void stopCurrentProctoring({ markFinished: false });
        };
    }, [copy.idle, olympiadId]);

    return {
        status,
        message,
        webcamStream,
        isReady: status === 'active',
        retryProctoring: startProctoring,
        finishProctoring,
    };
}
