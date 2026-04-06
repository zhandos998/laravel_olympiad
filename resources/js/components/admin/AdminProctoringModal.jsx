import React, { useEffect, useMemo, useState } from 'react';
import { ui } from '../../constants/ui';
import { api } from '../../lib/api';
import { DEFAULT_LOCALE, LOCALE_KEY } from '../../constants/locale';
import { formatDate } from './adminOlympiadUtils';

const EMPTY_MEDIA_STATE = {
    mode: 'empty',
    recordingUrl: '',
    chunkUrls: [],
    currentIndex: 0,
    loading: false,
    error: '',
};

function buildText(locale) {
    if (locale === 'kaz') {
        return {
            eyebrow: 'РџСЂРѕРєС‚РѕСЂРёРЅРі',
            title: 'ТљР°С‚С‹СЃСѓС€С‹ Р¶Р°Р·Р±Р°Р»Р°СЂС‹',
            loading: 'РџСЂРѕРєС‚РѕСЂРёРЅРі Р¶Р°Р·Р±Р°Р»Р°СЂС‹ Р¶ТЇРєС‚РµР»СѓРґРµ...',
            empty: 'Р‘Т±Р» Т›Р°С‚С‹СЃСѓС€С‹ Р±РѕР№С‹РЅС€Р° РїСЂРѕРєС‚РѕСЂРёРЅРі Р¶Р°Р·Р±Р°СЃС‹ С‚Р°Р±С‹Р»РјР°РґС‹.',
            close: 'Р–Р°Р±Сѓ',
            session: 'РўСѓСЂ',
            startedAt: 'Р‘Р°СЃС‚Р°Р»Т“Р°РЅ СѓР°Т›С‹С‚',
            finishedAt: 'РђСЏТ›С‚Р°Р»Т“Р°РЅ СѓР°Т›С‹С‚',
            combined: 'Р‘С–СЂС–РєС‚С–СЂС–Р»РіРµРЅ Р¶Р°Р·Р±Р°',
            noRecording: 'Р–Р°Р·Р±Р° У™Р»С– Р¶РёРЅР°Р»РјР°Т“Р°РЅ.',
            assembling: '\u0416\u0430\u0437\u0431\u0430 \u049b\u0430\u0437\u0456\u0440 \u0436\u0438\u043d\u0430\u043b\u044b\u043f \u0436\u0430\u0442\u044b\u0440.',
            assemblyFailed: '\u0416\u0430\u0437\u0431\u0430\u043d\u044b \u0436\u0438\u043d\u0430\u0443 \u0441\u04d9\u0442\u0441\u0456\u0437 \u0430\u044f\u049b\u0442\u0430\u043b\u0434\u044b.',
            participant: 'ТљР°С‚С‹СЃСѓС€С‹',
            loadingRecording: 'Р–Р°Р·Р±Р° Р¶ТЇРєС‚РµР»СѓРґРµ...',
            downloadFailed: 'Р–Р°Р·Р±Р°РЅС‹ Р¶ТЇРєС‚РµСѓ РјТЇРјРєС–РЅ Р±РѕР»РјР°РґС‹.',
            segment: 'Р‘У©Р»С–Рє',
            segments: 'Р‘У©Р»С–РєС‚РµСЂ',
        };
    }

    return {
        eyebrow: 'РџСЂРѕРєС‚РѕСЂРёРЅРі',
        title: 'Р—Р°РїРёСЃРё РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ',
        loading: 'Р—Р°РїРёСЃРё РїСЂРѕРєС‚РѕСЂРёРЅРіР° Р·Р°РіСЂСѓР¶Р°СЋС‚СЃСЏ...',
        empty: 'Р”Р»СЏ СЌС‚РѕРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ Р·Р°РїРёСЃРµР№ РїСЂРѕРєС‚РѕСЂРёРЅРіР° РїРѕРєР° РЅРµС‚.',
        close: 'Р—Р°РєСЂС‹С‚СЊ',
        session: 'РўСѓСЂ',
        startedAt: 'РќР°С‡Р°Р»Рѕ',
        finishedAt: 'Р—Р°РІРµСЂС€РµРЅРёРµ',
        combined: 'РћР±С‰Р°СЏ Р·Р°РїРёСЃСЊ',
        noRecording: 'РС‚РѕРіРѕРІР°СЏ Р·Р°РїРёСЃСЊ РїРѕРєР° РЅРµ СЃРѕР±СЂР°РЅР°.',
        assembling: '\u0418\u0442\u043e\u0433\u043e\u0432\u0430\u044f \u0437\u0430\u043f\u0438\u0441\u044c \u0441\u0435\u0439\u0447\u0430\u0441 \u0441\u043e\u0431\u0438\u0440\u0430\u0435\u0442\u0441\u044f.',
        assemblyFailed: '\u0421\u0431\u043e\u0440\u043a\u0430 \u0438\u0442\u043e\u0433\u043e\u0432\u043e\u0439 \u0437\u0430\u043f\u0438\u0441\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043b\u0430\u0441\u044c \u0441 \u043e\u0448\u0438\u0431\u043a\u043e\u0439.',
        participant: 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ',
        loadingRecording: 'Р—Р°РїРёСЃСЊ Р·Р°РіСЂСѓР¶Р°РµС‚СЃСЏ...',
        downloadFailed: 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Р·Р°РїРёСЃСЊ.',
        segment: 'РЎРµРіРјРµРЅС‚',
        segments: 'РЎРµРіРјРµРЅС‚С‹',
    };
}

export function AdminProctoringModal({ open, olympiadId, registrationId, token, locale, onClose }) {
    const text = useMemo(() => buildText(locale), [locale]);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [mediaState, setMediaState] = useState(EMPTY_MEDIA_STATE);

    useEffect(() => {
        if (!open || !registrationId) {
            setData(null);
            setError('');
            setLoading(false);
            setSelectedSessionId(null);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError('');

        api(`/admin/olympiads/${olympiadId}/registrations/${registrationId}/proctoring`, { token })
            .then((response) => {
                if (cancelled) {
                    return;
                }

                setData(response);
                const firstSession = response.sessions?.[0] ?? null;
                setSelectedSessionId(firstSession?.id ?? null);
            })
            .catch((nextError) => {
                if (!cancelled) {
                    setError(nextError.message);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [open, registrationId, olympiadId, token]);

    const selectedSession = data?.sessions?.find((session) => session.id === selectedSessionId) ?? data?.sessions?.[0] ?? null;
    const combinedChunks = selectedSession?.combined_chunks ?? [];
    const combinedRecording = selectedSession?.combined_recording ?? null;
    const isAssemblyInProgress = selectedSession?.assembly_status === 'queued' || selectedSession?.assembly_status === 'processing';
    const recordingPlaceholderText = isAssemblyInProgress
        ? text.assembling
        : selectedSession?.assembly_status === 'failed'
          ? selectedSession?.assembly_error || text.assemblyFailed
          : text.noRecording;
    const combinedChunkMediaUrlsKey = useMemo(() => combinedChunks.map((chunk) => chunk.media_url ?? '').join('|'), [combinedChunks]);
    const combinedRecordingMediaUrl = combinedRecording?.media_url ?? '';

    useEffect(() => {
        if (!open || !selectedSession || !token) {
            setMediaState((current) => {
                if (current.recordingUrl) {
                    URL.revokeObjectURL(current.recordingUrl);
                }

                current.chunkUrls.forEach((url) => URL.revokeObjectURL(url));

                if (
                    current.mode === EMPTY_MEDIA_STATE.mode &&
                    current.recordingUrl === EMPTY_MEDIA_STATE.recordingUrl &&
                    current.chunkUrls.length === 0 &&
                    current.currentIndex === EMPTY_MEDIA_STATE.currentIndex &&
                    current.loading === EMPTY_MEDIA_STATE.loading &&
                    current.error === EMPTY_MEDIA_STATE.error
                ) {
                    return current;
                }

                return EMPTY_MEDIA_STATE;
            });

            return;
        }

        const controller = new AbortController();
        let nextRecordingUrl = '';
        let nextChunkUrls = [];

        setMediaState((current) => {
            if (current.recordingUrl) {
                URL.revokeObjectURL(current.recordingUrl);
            }

            current.chunkUrls.forEach((url) => URL.revokeObjectURL(url));

            return {
                mode: 'empty',
                recordingUrl: '',
                chunkUrls: [],
                currentIndex: 0,
                loading: true,
                error: '',
            };
        });

        const requestLocale = localStorage.getItem(LOCALE_KEY) || DEFAULT_LOCALE;

        const loadMedia = async () => {
            if (combinedRecording?.available && combinedRecording.media_url) {
                const response = await fetch(combinedRecording.media_url, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'X-Locale': requestLocale,
                    },
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const payload = await response.json().catch(() => ({}));
                    throw new Error(payload.message || text.downloadFailed);
                }

                nextRecordingUrl = URL.createObjectURL(await response.blob());
                setMediaState({
                    ...EMPTY_MEDIA_STATE,
                    mode: 'recording',
                    recordingUrl: nextRecordingUrl,
                });
                return;
            }

            if (isAssemblyInProgress) {
                setMediaState(EMPTY_MEDIA_STATE);
                return;
            }

            if (combinedChunks.length === 0) {
                setMediaState(EMPTY_MEDIA_STATE);
                return;
            }

            const blobs = await Promise.all(
                combinedChunks.map(async (chunk) => {
                    const response = await fetch(chunk.media_url, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'X-Locale': requestLocale,
                        },
                        signal: controller.signal,
                    });

                    if (!response.ok) {
                        const payload = await response.json().catch(() => ({}));
                        throw new Error(payload.message || text.downloadFailed);
                    }

                    return response.blob();
                }),
            );

            if (controller.signal.aborted) {
                return;
            }

            nextChunkUrls = blobs.map((blob) => URL.createObjectURL(blob));
            setMediaState({
                ...EMPTY_MEDIA_STATE,
                mode: 'segments',
                chunkUrls: nextChunkUrls,
            });
        };

        loadMedia().catch((nextError) => {
            if (controller.signal.aborted) {
                return;
            }

            setMediaState({
                ...EMPTY_MEDIA_STATE,
                error: nextError.message || text.downloadFailed,
            });
        });

        return () => {
            controller.abort();

            if (nextRecordingUrl) {
                URL.revokeObjectURL(nextRecordingUrl);
            }

            nextChunkUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [open, selectedSession?.id, token, text.downloadFailed, combinedChunkMediaUrlsKey, combinedRecording?.available, combinedRecordingMediaUrl, isAssemblyInProgress]);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
            <div
                className="grid max-h-[90vh] w-full max-w-6xl gap-4 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_30px_90px_-35px_rgba(15,23,42,0.5)] lg:grid-cols-[280px_minmax(0,1fr)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="grid gap-4 overflow-y-auto pr-1">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{text.eyebrow}</p>
                        <h3 className="mt-2 text-2xl font-extrabold text-slate-900">{text.title}</h3>
                        {data?.registration?.user ? (
                            <p className="mt-2 text-sm text-slate-600">
                                {text.participant}: {data.registration.user.name} ({data.registration.user.email})
                            </p>
                        ) : null}
                    </div>

                    <div className="grid gap-2">
                        {loading ? <p className="text-sm text-slate-600">{text.loading}</p> : null}
                        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                        {!loading && !error && (data?.sessions?.length ?? 0) === 0 ? <p className="text-sm text-slate-600">{text.empty}</p> : null}

                        {data?.sessions?.map((session, index) => (
                            <button
                                key={session.id}
                                className={`rounded-2xl border px-4 py-3 text-left transition ${
                                    session.id === selectedSession?.id ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                }`}
                                onClick={() => setSelectedSessionId(session.id)}
                                type="button"
                            >
                                <p className="text-sm font-semibold text-slate-900">
                                    {text.session} {index + 1}
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                    {text.startedAt}: {formatDate(session.started_at, locale)}
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                    {text.finishedAt}: {formatDate(session.finished_at, locale)}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">
                                        {session.combined_recording?.available
                                            ? text.combined
                                            : session.assembly_status === 'queued' || session.assembly_status === 'processing'
                                              ? text.assembling
                                              : `${text.segments}: ${session.combined_chunks?.length ?? 0}`}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <button className={ui.secondaryButton} onClick={onClose} type="button">
                        {text.close}
                    </button>
                </div>

                <div className="grid min-h-0 gap-4 overflow-y-auto">
                    {selectedSession ? (
                        <>
                            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4">
                                {mediaState.loading ? (
                                    <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-sm text-slate-300">
                                        {text.loadingRecording}
                                    </div>
                                ) : mediaState.error ? (
                                    <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-rose-500/60 text-sm text-rose-200">
                                        {mediaState.error}
                                    </div>
                                ) : mediaState.mode === 'recording' && mediaState.recordingUrl ? (
                                    <video autoPlay className="max-h-[52vh] w-full rounded-2xl bg-black" controls src={mediaState.recordingUrl} />
                                ) : mediaState.chunkUrls.length > 0 ? (
                                    <video
                                        key={`${selectedSession.id}-${mediaState.currentIndex}`}
                                        autoPlay
                                        className="max-h-[52vh] w-full rounded-2xl bg-black"
                                        controls
                                        onEnded={() => {
                                            setMediaState((current) => {
                                                if (current.currentIndex >= current.chunkUrls.length - 1) {
                                                    return current;
                                                }

                                                return {
                                                    ...current,
                                                    currentIndex: current.currentIndex + 1,
                                                };
                                            });
                                        }}
                                        src={mediaState.chunkUrls[mediaState.currentIndex]}
                                    />
                                ) : (
                                    <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-sm text-slate-300">
                                        {recordingPlaceholderText}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <h4 className="text-lg font-bold text-slate-900">{text.combined}</h4>
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                                        {mediaState.mode === 'recording'
                                            ? text.combined
                                            : `${text.segment} ${Math.min(mediaState.currentIndex + 1, mediaState.chunkUrls.length || 1)} / ${
                                                  mediaState.chunkUrls.length || combinedChunks.length || 0
                                              }`}
                                    </span>
                                </div>

                                <p className="mt-4 text-sm text-slate-600">
                                    {combinedRecording?.available
                                        ? text.combined
                                        : isAssemblyInProgress
                                          ? text.assembling
                                          : combinedChunks.length > 0
                                            ? `${text.segments}: ${combinedChunks.length}`
                                            : recordingPlaceholderText}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600">
                            {loading ? text.loading : text.empty}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
