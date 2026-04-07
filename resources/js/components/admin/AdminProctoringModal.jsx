import React, { useEffect, useMemo, useState } from 'react';
import { ui } from '../../constants/ui';
import { api } from '../../lib/api';
import { DEFAULT_LOCALE, LOCALE_KEY } from '../../constants/locale';
import { formatDate } from './adminOlympiadUtils';

const EMPTY_MEDIA_STATE = {
    mode: 'empty',
    recordingUrl: '',
    loading: false,
    error: '',
};

const ASSEMBLY_PENDING_STATUSES = ['queued', 'processing'];

function buildText(locale) {
    if (locale === 'kaz') {
        return {
            eyebrow: 'Прокторинг',
            title: 'Қатысушы жазбалары',
            loading: 'Прокторинг жазбалары жүктелуде...',
            empty: 'Бұл қатысушы бойынша прокторинг жазбасы табылмады.',
            close: 'Жабу',
            session: 'Сессия',
            startedAt: 'Басталған уақыты',
            finishedAt: 'Аяқталған уақыты',
            combined: 'Біріктірілген жазба',
            noRecording: 'Қорытынды жазба әлі жиналған жоқ.',
            assembling: 'Қорытынды жазба қазір жиналып жатыр.',
            assemblyFailed: 'Қорытынды жазбаны жинау сәтсіз аяқталды.',
            participant: 'Қатысушы',
            loadingRecording: 'Жазба жүктелуде...',
            downloadFailed: 'Жазбаны жүктеу мүмкін болмады.',
        };
    }

    return {
        eyebrow: 'Прокторинг',
        title: 'Записи пользователя',
        loading: 'Записи прокторинга загружаются...',
        empty: 'Для этого пользователя записи прокторинга пока нет.',
        close: 'Закрыть',
        session: 'Сессия',
        startedAt: 'Начало',
        finishedAt: 'Завершение',
        combined: 'Общая запись',
        noRecording: 'Итоговая запись пока не собрана.',
        assembling: 'Итоговая запись сейчас собирается.',
        assemblyFailed: 'Сборка итоговой записи завершилась с ошибкой.',
        participant: 'Пользователь',
        loadingRecording: 'Запись загружается...',
        downloadFailed: 'Не удалось загрузить запись.',
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
        let timerId = null;

        const loadData = async (showLoader) => {
            if (showLoader) {
                setLoading(true);
            }

            try {
                const response = await api(`/admin/olympiads/${olympiadId}/registrations/${registrationId}/proctoring`, { token });

                if (cancelled) {
                    return;
                }

                setError('');
                setData(response);
                setSelectedSessionId((current) => {
                    if (response.sessions?.some((session) => session.id === current)) {
                        return current;
                    }

                    return response.sessions?.[0]?.id ?? null;
                });

                const hasPendingAssembly = response.sessions?.some((session) => ASSEMBLY_PENDING_STATUSES.includes(session.assembly_status));

                if (hasPendingAssembly) {
                    timerId = window.setTimeout(() => {
                        loadData(false);
                    }, 5000);
                }
            } catch (nextError) {
                if (!cancelled) {
                    setError(nextError.message);
                }
            } finally {
                if (!cancelled && showLoader) {
                    setLoading(false);
                }
            }
        };

        loadData(true);

        return () => {
            cancelled = true;

            if (timerId) {
                window.clearTimeout(timerId);
            }
        };
    }, [open, registrationId, olympiadId, token]);

    const selectedSession = data?.sessions?.find((session) => session.id === selectedSessionId) ?? data?.sessions?.[0] ?? null;
    const combinedRecording = selectedSession?.combined_recording ?? null;
    const isAssemblyInProgress = ASSEMBLY_PENDING_STATUSES.includes(selectedSession?.assembly_status ?? '');
    const recordingPlaceholderText = isAssemblyInProgress
        ? text.assembling
        : selectedSession?.assembly_status === 'failed'
          ? selectedSession?.assembly_error || text.assemblyFailed
          : text.noRecording;
    const combinedRecordingMediaUrl = combinedRecording?.media_url ?? '';

    useEffect(() => {
        if (!open || !selectedSession || !token) {
            setMediaState((current) => {
                if (current.recordingUrl) {
                    URL.revokeObjectURL(current.recordingUrl);
                }

                if (
                    current.mode === EMPTY_MEDIA_STATE.mode &&
                    current.recordingUrl === EMPTY_MEDIA_STATE.recordingUrl &&
                    current.loading === EMPTY_MEDIA_STATE.loading &&
                    current.error === EMPTY_MEDIA_STATE.error
                ) {
                    return current;
                }

                return EMPTY_MEDIA_STATE;
            });

            return;
        }

        if (!combinedRecording?.available || !combinedRecording.media_url) {
            setMediaState((current) => {
                if (current.recordingUrl) {
                    URL.revokeObjectURL(current.recordingUrl);
                }

                if (
                    current.mode === EMPTY_MEDIA_STATE.mode &&
                    current.recordingUrl === EMPTY_MEDIA_STATE.recordingUrl &&
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

        setMediaState((current) => {
            if (current.recordingUrl) {
                URL.revokeObjectURL(current.recordingUrl);
            }

            return {
                ...EMPTY_MEDIA_STATE,
                loading: true,
            };
        });

        const requestLocale = localStorage.getItem(LOCALE_KEY) || DEFAULT_LOCALE;

        fetch(combinedRecording.media_url, {
            headers: {
                Authorization: `Bearer ${token}`,
                'X-Locale': requestLocale,
            },
            signal: controller.signal,
        })
            .then(async (response) => {
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
            })
            .catch((nextError) => {
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
        };
    }, [open, selectedSession?.id, token, text.downloadFailed, combinedRecording?.available, combinedRecordingMediaUrl]);

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
                                            : ASSEMBLY_PENDING_STATUSES.includes(session.assembly_status)
                                              ? text.assembling
                                              : session.assembly_status === 'failed'
                                                ? text.assemblyFailed
                                                : text.noRecording}
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
                                        {combinedRecording?.available ? text.combined : recordingPlaceholderText}
                                    </span>
                                </div>

                                <p className="mt-4 text-sm text-slate-600">
                                    {combinedRecording?.available ? text.combined : recordingPlaceholderText}
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
