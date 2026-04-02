import React, { useEffect, useMemo, useState } from 'react';
import { ui } from '../../constants/ui';
import { api } from '../../lib/api';
import { DEFAULT_LOCALE, LOCALE_KEY } from '../../constants/locale';
import { formatDate } from './adminOlympiadUtils';

function buildText(locale) {
    if (locale === 'kaz') {
        return {
            eyebrow: 'Прокторинг',
            title: 'Қатысушы жазбалары',
            loading: 'Прокторинг жазбалары жүктелуде...',
            empty: 'Бұл қатысушы бойынша прокторинг жазбасы табылмады.',
            close: 'Жабу',
            session: 'Тур',
            startedAt: 'Басталған уақыт',
            finishedAt: 'Аяқталған уақыт',
            combined: 'Біріктірілген жазба',
            noRecording: 'Жазба әлі жиналмаған.',
            participant: 'Қатысушы',
            loadingRecording: 'Жазба жүктелуде...',
            downloadFailed: 'Жазбаны жүктеу мүмкін болмады.',
            segment: 'Бөлік',
            segments: 'Бөліктер',
        };
    }

    return {
        eyebrow: 'Прокторинг',
        title: 'Записи участника',
        loading: 'Записи прокторинга загружаются...',
        empty: 'Для этого участника записей прокторинга пока нет.',
        close: 'Закрыть',
        session: 'Тур',
        startedAt: 'Начало',
        finishedAt: 'Завершение',
        combined: 'Общая запись',
        noRecording: 'Итоговая запись пока не собрана.',
        participant: 'Участник',
        loadingRecording: 'Запись загружается...',
        downloadFailed: 'Не удалось загрузить запись.',
        segment: 'Сегмент',
        segments: 'Сегменты',
    };
}

export function AdminProctoringModal({ open, olympiadId, registrationId, token, locale, onClose }) {
    const text = useMemo(() => buildText(locale), [locale]);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [mediaState, setMediaState] = useState({
        mode: 'empty',
        recordingUrl: '',
        chunkUrls: [],
        currentIndex: 0,
        loading: false,
        error: '',
    });

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

    useEffect(() => {
        if (!open || !selectedSession || !token) {
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
                    loading: false,
                    error: '',
                };
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
                    mode: 'recording',
                    recordingUrl: nextRecordingUrl,
                    chunkUrls: [],
                    currentIndex: 0,
                    loading: false,
                    error: '',
                });
                return;
            }

            if (combinedChunks.length === 0) {
                setMediaState({
                    mode: 'empty',
                    recordingUrl: '',
                    chunkUrls: [],
                    currentIndex: 0,
                    loading: false,
                    error: '',
                });
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
                mode: 'segments',
                recordingUrl: '',
                chunkUrls: nextChunkUrls,
                currentIndex: 0,
                loading: false,
                error: '',
            });
        };

        loadMedia().catch((nextError) => {
            if (controller.signal.aborted) {
                return;
            }

            setMediaState({
                mode: 'empty',
                recordingUrl: '',
                chunkUrls: [],
                currentIndex: 0,
                loading: false,
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
    }, [open, selectedSession?.id, token, text.downloadFailed, combinedChunks, combinedRecording?.available, combinedRecording?.media_url]);

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
                                        {session.combined_recording?.available ? text.combined : `${text.segments}: ${session.combined_chunks?.length ?? 0}`}
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
                                        {text.noRecording}
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
                                    {combinedRecording?.available ? text.combined : combinedChunks.length > 0 ? `${text.segments}: ${combinedChunks.length}` : text.noRecording}
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
