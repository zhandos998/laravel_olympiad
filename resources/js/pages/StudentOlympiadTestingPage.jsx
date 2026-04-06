import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RichContent } from '../components/common/RichContent';
import { ui } from '../constants/ui';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useLocale } from '../context/LocaleContext';
import { useNotification } from '../context/NotificationContext';
import { useStageOneProctoring } from '../hooks/useStageOneProctoring';
import { api } from '../lib/api';

const OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function formatTimeParts(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0'));
}

function buildAnswerMap(questions = []) {
    return questions.reduce((result, question) => {
        if (question.selected_option_id) {
            result[question.question_id] = String(question.selected_option_id);
        }

        return result;
    }, {});
}

export function StudentOlympiadTestingPage() {
    const { olympiadId } = useParams();
    const navigate = useNavigate();
    const { token, setError } = useAuth();
    const { locale, t } = useLocale();
    const { showNotification } = useNotification();
    const { confirm } = useConfirm();
    const [data, setData] = useState(null);
    const [attemptsBySubject, setAttemptsBySubject] = useState({});
    const [answersBySubject, setAnswersBySubject] = useState({});
    const [activeSubjectId, setActiveSubjectId] = useState('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [now, setNow] = useState(Date.now());
    const [isFinishing, setIsFinishing] = useState(false);
    const webcamPreviewRef = useRef(null);

    const copy = useMemo(() => {
        if (locale === 'kaz') {
            return {
                finishTesting: '\u0422\u0435\u0441\u0442\u0456\u043b\u0435\u0443\u0434\u0456 \u0430\u044f\u049b\u0442\u0430\u0443',
                previous: '\u0410\u043b\u0434\u044b\u04a3\u0493\u044b',
                next: '\u041a\u0435\u043b\u0435\u0441\u0456',
                finishSubject: '\u041f\u04d9\u043d\u0434\u0456 \u0430\u044f\u049b\u0442\u0430\u0443',
                subjectDone: '\u041f\u04d9\u043d \u0430\u044f\u049b\u0442\u0430\u043b\u0434\u044b',
                answered: '\u0416\u0430\u0443\u0430\u043f \u0431\u0435\u0440\u0456\u043b\u0434\u0456',
                unanswered: '\u0416\u0430\u0443\u0430\u043f\u0441\u044b\u0437',
                finishConfirm:
                    '\u0411\u0430\u0440\u043b\u044b\u049b \u043f\u04d9\u043d \u0431\u043e\u0439\u044b\u043d\u0448\u0430 \u0442\u0435\u0441\u0442\u0456\u043b\u0435\u0443\u0434\u0456 \u0430\u044f\u049b\u0442\u0430\u0439\u0441\u044b\u0437 \u0431\u0430? \u0416\u0430\u0443\u0430\u043f \u0431\u0435\u0440\u0456\u043b\u043c\u0435\u0433\u0435\u043d \u0441\u04b1\u0440\u0430\u049b\u0442\u0430\u0440 \u0431\u043e\u0441 \u0442\u04af\u0440\u0456\u043d\u0434\u0435 \u0436\u0456\u0431\u0435\u0440\u0456\u043b\u0435\u0434\u0456.',
                timeLeft: '\u049a\u0430\u043b\u0493\u0430\u043d \u0443\u0430\u049b\u044b\u0442',
                totalSubjects: '\u041f\u04d9\u043d\u0434\u0435\u0440',
                completedSubjects: '\u0410\u044f\u049b\u0442\u0430\u043b\u0493\u0430\u043d \u043f\u04d9\u043d\u0434\u0435\u0440',
                currentSubject: '\u0411\u0435\u043b\u0441\u0435\u043d\u0434\u0456 \u043f\u04d9\u043d',
                pickQuestion: '\u0421\u04b1\u0440\u0430\u049b \u043d\u04e9\u043c\u0456\u0440\u0456\u043d \u0442\u0430\u04a3\u0434\u0430\u04a3\u044b\u0437',
                subjectQuestionCount: '\u0441\u04b1\u0440\u0430\u049b',
                currentQuestion: '\u0421\u04b1\u0440\u0430\u049b',
                noActiveSubject: '\u0422\u0435\u0441\u0442 \u0434\u0430\u0439\u044b\u043d',
                noActiveSubjectDescription:
                    '\u0416\u0430\u043b\u0493\u0430\u0441\u0442\u044b\u0440\u0443 \u04af\u0448\u0456\u043d \u0441\u043e\u043b \u0436\u0430\u049b\u0442\u0430\u0493\u044b \u043f\u04d9\u043d\u043d\u0456\u04a3 \u0441\u04b1\u0440\u0430\u049b \u043d\u04e9\u043c\u0456\u0440\u0456\u043d \u0431\u0430\u0441\u044b\u04a3\u044b\u0437.',
                answerInstruction: '\u0411\u0456\u0440 \u043d\u04b1\u0441\u049b\u0430\u043d\u044b \u0442\u0430\u04a3\u0434\u0430\u04a3\u044b\u0437',
                proctoringTitle: '\u041f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433',
                proctoringStart: '\u0420\u04b1\u049b\u0441\u0430\u0442 \u0431\u0435\u0440\u0456\u043f, \u043f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433\u0442\u0456 \u0431\u0430\u0441\u0442\u0430\u0443',
                proctoringRetry: '\u041f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433\u0442\u0456 \u049b\u0430\u0439\u0442\u0430 \u049b\u043e\u0441\u0443',
                combinedLabel: '\u0411\u0456\u0440\u0456\u043a\u043a\u0435\u043d \u0436\u0430\u0437\u0431\u0430',
            };
        }

        return {
            finishTesting: '\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u0442\u0435\u0441\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435',
            previous: '\u041d\u0430\u0437\u0430\u0434',
            next: '\u0414\u0430\u043b\u0435\u0435',
            finishSubject: '\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u043f\u0440\u0435\u0434\u043c\u0435\u0442',
            subjectDone: '\u041f\u0440\u0435\u0434\u043c\u0435\u0442 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d',
            answered: '\u041e\u0442\u0432\u0435\u0447\u0435\u043d\u043e',
            unanswered: '\u041d\u0435 \u043e\u0442\u0432\u0435\u0447\u0435\u043d\u043e',
            finishConfirm:
                '\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u0442\u0435\u0441\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u043f\u043e \u0432\u0441\u0435\u043c \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u0430\u043c? \u0412\u0441\u0435 \u043d\u0435\u043e\u0442\u0432\u0435\u0447\u0435\u043d\u043d\u044b\u0435 \u0432\u043e\u043f\u0440\u043e\u0441\u044b \u0431\u0443\u0434\u0443\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u044b \u043f\u0443\u0441\u0442\u044b\u043c\u0438.',
            timeLeft: '\u041e\u0441\u0442\u0430\u043b\u043e\u0441\u044c \u0432\u0440\u0435\u043c\u0435\u043d\u0438',
            totalSubjects: '\u041f\u0440\u0435\u0434\u043c\u0435\u0442\u043e\u0432',
            completedSubjects: '\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e',
            currentSubject: '\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u043f\u0440\u0435\u0434\u043c\u0435\u0442',
            pickQuestion: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043d\u043e\u043c\u0435\u0440 \u0432\u043e\u043f\u0440\u043e\u0441\u0430',
            subjectQuestionCount: '\u0432\u043e\u043f\u0440\u043e\u0441\u043e\u0432',
            currentQuestion: '\u0412\u043e\u043f\u0440\u043e\u0441',
            noActiveSubject: '\u0422\u0435\u0441\u0442 \u0433\u043e\u0442\u043e\u0432 \u043a \u0440\u0430\u0431\u043e\u0442\u0435',
            noActiveSubjectDescription:
                '\u0421\u043b\u0435\u0432\u0430 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u0435\u0434\u043c\u0435\u0442 \u0438 \u043d\u043e\u043c\u0435\u0440 \u0432\u043e\u043f\u0440\u043e\u0441\u0430, \u0447\u0442\u043e\u0431\u044b \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u0442\u0435\u0441\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435.',
            answerInstruction: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043e\u0434\u0438\u043d \u0432\u0430\u0440\u0438\u0430\u043d\u0442 \u043e\u0442\u0432\u0435\u0442\u0430',
            proctoringTitle: '\u041f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433',
            proctoringStart: '\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044c \u0434\u043e\u0441\u0442\u0443\u043f \u0438 \u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u043f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433',
            proctoringRetry: '\u0417\u0430\u043d\u043e\u0432\u043e \u0432\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433',
            combinedLabel: '\u041e\u0431\u0449\u0430\u044f \u0437\u0430\u043f\u0438\u0441\u044c',
        };
    }, [locale]);

    const { status: proctoringStatus, message: proctoringMessage, webcamStream, isReady: isProctoringReady, retryProctoring, finishProctoring } =
        useStageOneProctoring({
            olympiadId,
            token,
            locale,
        });

    const loadOlympiad = async () => {
        try {
            const response = await api(`/student/olympiads/${olympiadId}`, { token });
            setData(response);
            setError('');
            return response;
        } catch (error) {
            setError(error.message);
            return null;
        }
    };

    useEffect(() => {
        loadOlympiad();
    }, [olympiadId, token]);

    useEffect(() => {
        const endsAt = data?.registration?.stage1_ends_at;

        if (!endsAt) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [data?.registration?.stage1_ends_at]);

    const remainingSeconds = data?.registration?.stage1_ends_at
        ? Math.max(Math.floor((new Date(data.registration.stage1_ends_at).getTime() - now) / 1000), 0)
        : 0;

    const timeParts = formatTimeParts(remainingSeconds);

    const loadSubjectAttempt = async (subjectId, questionIndex = 0) => {
        try {
            const response = await api(`/student/subjects/${subjectId}/stage-one/start`, {
                method: 'POST',
                token,
            });

            setAttemptsBySubject((previous) => ({
                ...previous,
                [String(subjectId)]: response,
            }));
            setAnswersBySubject((previous) => ({
                ...previous,
                [String(subjectId)]: buildAnswerMap(response.questions),
            }));
            setActiveSubjectId(String(subjectId));
            setCurrentQuestionIndex(questionIndex);
            setError('');

            return response;
        } catch (error) {
            setError(error.message);
            return null;
        }
    };

    useEffect(() => {
        if (!data?.registration?.stage1_started_at || activeSubjectId) {
            return;
        }

        const nextSubject = data.subjects.find((subject) => subject.stage1_attempt?.status !== 'completed') ?? null;

        if (nextSubject) {
            loadSubjectAttempt(nextSubject.id);
        }
    }, [data, activeSubjectId]);

    useEffect(() => {
        if (data && !data.registration.stage1_started_at) {
            navigate(`/student/olympiads/${olympiadId}`);
        }
    }, [data, navigate, olympiadId]);

    useEffect(() => {
        if (remainingSeconds !== 0 || !data?.registration?.stage1_started_at || isFinishing) {
            return;
        }

        finishOlympiad();
    }, [remainingSeconds, data?.registration?.stage1_started_at, isFinishing]);

    useEffect(() => {
        if (!webcamPreviewRef.current) {
            return;
        }

        webcamPreviewRef.current.srcObject = webcamStream ?? null;

        return () => {
            if (webcamPreviewRef.current) {
                webcamPreviewRef.current.srcObject = null;
            }
        };
    }, [webcamStream]);

    const activeAttempt = attemptsBySubject[String(activeSubjectId)] ?? null;
    const activeAnswers = answersBySubject[String(activeSubjectId)] ?? {};
    const activeQuestion = activeAttempt?.questions?.[currentQuestionIndex] ?? null;
    const activeSubject = data?.subjects.find((subject) => String(subject.id) === String(activeSubjectId)) ?? null;
    const completedSubjectsCount = data?.subjects.filter((subject) => subject.stage1_attempt?.status === 'completed').length ?? 0;
    const activeAnsweredCount = activeAttempt
        ? activeAttempt.questions.filter((question) => {
              const answers = answersBySubject[String(activeSubjectId)] ?? {};
              return Boolean(answers[question.question_id]);
          }).length
        : 0;

    const getQuestionCount = (subject) => attemptsBySubject[String(subject.id)]?.questions?.length ?? subject.stage1_question_count ?? 0;

    const getAnswerLetter = (subjectId, question) => {
        const answers = answersBySubject[String(subjectId)] ?? {};
        const selectedOptionId = String(answers[question.question_id] || '');

        if (!selectedOptionId) {
            return '';
        }

        const selectedIndex = question.options.findIndex((option) => String(option.id) === selectedOptionId);

        if (selectedIndex < 0) {
            return '';
        }

        return OPTION_LETTERS[selectedIndex] || String(selectedIndex + 1);
    };

    const openSubjectQuestion = async (subjectId, questionIndex = 0) => {
        const normalizedSubjectId = String(subjectId);
        const existingAttempt = attemptsBySubject[normalizedSubjectId];

        if (existingAttempt) {
            setActiveSubjectId(normalizedSubjectId);
            setCurrentQuestionIndex(questionIndex);
            return;
        }

        await loadSubjectAttempt(subjectId, questionIndex);
    };

    const updateAnswer = async (subjectId, questionId, optionId) => {
        const normalizedSubjectId = String(subjectId);
        const previousOptionId = answersBySubject[normalizedSubjectId]?.[questionId] ?? '';

        setAnswersBySubject((previous) => ({
            ...previous,
            [normalizedSubjectId]: {
                ...(previous[normalizedSubjectId] ?? {}),
                [questionId]: String(optionId),
            },
        }));

        try {
            await api(`/student/subjects/${subjectId}/stage-one/answer`, {
                method: 'PATCH',
                token,
                keepalive: true,
                body: {
                    question_id: questionId,
                    option_id: Number(optionId),
                },
            });
            setError('');
        } catch (error) {
            setAnswersBySubject((previous) => {
                const nextSubjectAnswers = {
                    ...(previous[normalizedSubjectId] ?? {}),
                };

                if (previousOptionId) {
                    nextSubjectAnswers[questionId] = String(previousOptionId);
                } else {
                    delete nextSubjectAnswers[questionId];
                }

                return {
                    ...previous,
                    [normalizedSubjectId]: nextSubjectAnswers,
                };
            });
            setError(error.message);
        }
    };

    const submitSubject = async (subjectId, options = {}) => {
        const normalizedSubjectId = String(subjectId);
        let attempt = attemptsBySubject[normalizedSubjectId] ?? null;

        if (!attempt) {
            attempt = await loadSubjectAttempt(subjectId);
        }

        if (!attempt) {
            return false;
        }

        const answers = answersBySubject[normalizedSubjectId] ?? buildAnswerMap(attempt.questions);

        try {
            const response = await api(`/student/subjects/${subjectId}/stage-one/submit`, {
                method: 'POST',
                token,
                body: {
                    answers: attempt.questions.map((question) => ({
                        question_id: question.question_id,
                        option_id: answers[question.question_id] ? Number(answers[question.question_id]) : null,
                    })),
                },
            });

            setAttemptsBySubject((previous) => {
                const next = { ...previous };
                delete next[normalizedSubjectId];
                return next;
            });
            setAnswersBySubject((previous) => {
                const next = { ...previous };
                delete next[normalizedSubjectId];
                return next;
            });

            if (String(activeSubjectId) === normalizedSubjectId) {
                setActiveSubjectId('');
                setCurrentQuestionIndex(0);
            }

            if (!options.silent) {
                showNotification({
                    type: response.is_passed ? 'success' : 'info',
                    message: t('student.scoreAlert', {
                        score: response.score_percent,
                        passed: response.is_passed ? t('student.passedYes') : t('student.passedNo'),
                    }),
                    duration: 5000,
                });
            }

            if (options.refresh !== false) {
                const refreshed = await loadOlympiad();

                if (!options.silent && refreshed) {
                    const nextSubject = refreshed.subjects.find((subject) => subject.stage1_attempt?.status !== 'completed');

                    if (nextSubject) {
                        await openSubjectQuestion(nextSubject.id, 0);
                    } else {
                        navigate(`/student/olympiads/${olympiadId}`);
                    }
                }
            }

            return true;
        } catch (error) {
            setError(error.message);
            return false;
        }
    };

    async function finishOlympiad() {
        if (!data || isFinishing) {
            return;
        }

        if (
            remainingSeconds > 0 &&
            !(await confirm({
                title: copy.finishTesting,
                message: copy.finishConfirm,
                confirmText: copy.finishTesting,
                tone: 'danger',
            }))
        ) {
            return;
        }

        setIsFinishing(true);

        try {
            for (const subject of data.subjects) {
                if (subject.stage1_attempt?.status === 'completed') {
                    continue;
                }

                const submitted = await submitSubject(subject.id, { silent: true, refresh: false });

                if (!submitted) {
                    setIsFinishing(false);
                    return;
                }
            }

            const proctoringFinished = await finishProctoring();

            if (!proctoringFinished) {
                setError(proctoringMessage);
                return;
            }

            await loadOlympiad();
            navigate(`/student/olympiads/${olympiadId}`);
        } finally {
            setIsFinishing(false);
        }
    }

    const goToNextQuestion = () => {
        if (activeAttempt && currentQuestionIndex < activeAttempt.questions.length - 1) {
            setCurrentQuestionIndex((previous) => previous + 1);
        }
    };

    const goToPreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((previous) => previous - 1);
        }
    };

    if (!data) {
        return <section className={ui.card}>{t('common.loading')}</section>;
    }

    if (!data.registration.stage1_started_at) {
        return null;
    }

    return (
        <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
            <aside className="grid gap-4 xl:sticky xl:top-4">
                <div className="overflow-hidden rounded-[1.5rem] bg-[linear-gradient(145deg,_#eef4ff_0%,_#ffffff_52%,_#edf3ff_100%)] p-4 text-slate-950 shadow-[0_24px_60px_-28px_rgba(53,93,168,0.22)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{copy.timeLeft}</p>
                            <h2 className="mt-1 text-xl font-extrabold">{data.olympiad.title}</h2>
                        </div>
                        <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                            {copy.currentSubject}: {activeSubject?.display_name ?? activeSubject?.name ?? '-'}
                        </span>
                    </div>

                    <div className="mt-4 rounded-[1.25rem] border border-slate-300 bg-white px-4 py-4 text-center shadow-sm">
                        <div className="text-2xl font-extrabold leading-none tracking-[0.14em] md:text-4xl">
                            {timeParts.join(':')}
                        </div>
                    </div>

                    <button
                        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#27498c] px-4 py-2.5 text-sm font-bold text-white shadow-[0_18px_38px_-20px_rgba(53,93,168,0.32)] transition hover:bg-[#1f3c75] disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={isFinishing}
                        onClick={finishOlympiad}
                        type="button"
                    >
                        {copy.finishTesting}
                    </button>

                    <div className="mt-4 rounded-[1.25rem] border border-slate-300 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{copy.proctoringTitle}</p>
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    isProctoringReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}
                            >
                                {isProctoringReady ? 'REC' : 'WAIT'}
                            </span>
                        </div>

                        <div className="mt-3 overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-950">
                            {webcamStream ? (
                                <video ref={webcamPreviewRef} autoPlay muted playsInline className="h-32 w-full object-cover" />
                            ) : (
                                <div className="flex h-32 items-center justify-center px-3 text-center text-xs text-slate-300">{proctoringMessage}</div>
                            )}
                        </div>

                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] font-semibold text-slate-600">
                            {copy.combinedLabel}
                        </div>
                    </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white/95 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{copy.totalSubjects}</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">{copy.pickQuestion}</h3>

                    <div className="mt-4 grid gap-3">
                        {data.subjects.map((subject) => {
                            const subjectId = String(subject.id);
                            const cachedAttempt = attemptsBySubject[subjectId] ?? null;
                            const questionCount = getQuestionCount(subject);
                            const questionIndexes = Array.from({ length: questionCount }, (_, index) => index);
                            const isCompleted = subject.stage1_attempt?.status === 'completed';
                            const isActiveSubject = subjectId === String(activeSubjectId);
                            const subjectAnsweredCount = cachedAttempt
                                ? cachedAttempt.questions.filter((question) => {
                                      const answers = answersBySubject[subjectId] ?? {};
                                      return Boolean(answers[question.question_id]);
                                  }).length
                                : 0;

                            return (
                                <div
                                    key={subject.id}
                                    className={`rounded-[1.25rem] border p-3 transition ${
                                        isActiveSubject
                                            ? 'border-teal-400 bg-teal-50 shadow-[0_20px_45px_-35px_rgba(13,148,136,0.7)]'
                                            : 'border-slate-200 bg-slate-50'
                                    }`}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-slate-900">{subject.display_name ?? subject.name}</h4>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {questionCount} {copy.subjectQuestionCount}
                                            </p>
                                        </div>

                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                isCompleted
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : isActiveSubject
                                                      ? 'bg-teal-100 text-teal-700'
                                                      : 'bg-white text-slate-600'
                                            }`}
                                        >
                                            {isCompleted ? copy.subjectDone : `${copy.answered}: ${subjectAnsweredCount}/${questionCount}`}
                                        </span>
                                    </div>

                                    {!isCompleted ? (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {questionIndexes.map((questionIndex) => {
                                                const question = cachedAttempt?.questions?.[questionIndex] ?? null;
                                                const letter = question ? getAnswerLetter(subject.id, question) : '';
                                                const isCurrent =
                                                    isActiveSubject &&
                                                    questionIndex === currentQuestionIndex &&
                                                    Boolean(cachedAttempt);
                                                const isAnswered = Boolean(letter);

                                                return (
                                                    <button
                                                        key={`${subject.id}-${questionIndex}`}
                                                        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-bold shadow-sm transition ${
                                                            isCurrent
                                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                                : isAnswered
                                                                  ? 'border-teal-500 bg-teal-500 text-white'
                                                                  : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-700'
                                                        }`}
                                                        onClick={() => openSubjectQuestion(subject.id, questionIndex)}
                                                        type="button"
                                                    >
                                                        {questionIndex + 1}
                                                        {letter ? (
                                                            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-extrabold text-teal-700 shadow-sm">
                                                                {letter}
                                                            </span>
                                                        ) : null}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </aside>

            <div className="grid gap-5">
                {activeAttempt && activeQuestion ? (
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white/95 p-4 shadow-sm md:p-5">
                        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
                            <div className="grid gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                                        {activeSubject?.display_name ?? activeSubject?.name ?? activeAttempt.subject}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                        {copy.currentQuestion} {currentQuestionIndex + 1} / {activeAttempt.questions.length}
                                    </span>
                                </div>

                                <h3 className="text-xl font-extrabold text-slate-900 md:text-2xl">
                                    {copy.currentQuestion} {currentQuestionIndex + 1}
                                </h3>
                            </div>

                            <div className="grid gap-1 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                                <p>
                                    {copy.answered}: {activeAnsweredCount}/{activeAttempt.questions.length}
                                </p>
                                <p>
                                    {copy.unanswered}: {activeAttempt.questions.length - activeAnsweredCount}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 md:p-5">
                            <RichContent
                                content={activeQuestion.text}
                                className="text-sm leading-6 text-slate-900 md:text-base md:leading-7 [&_p]:m-0 [&_img]:align-middle"
                            />
                        </div>

                        <div className="mt-4">
                            <p className="text-xs font-medium text-slate-500">{copy.answerInstruction}</p>
                        </div>

                        <div className="mt-3 grid gap-2.5">
                            {activeQuestion.options.map((option, optionIndex) => {
                                const isSelected = String(activeAnswers[activeQuestion.question_id] || '') === String(option.id);

                                return (
                                    <label
                                        key={option.id}
                                        className={`group flex cursor-pointer items-start gap-3 rounded-[1.1rem] border px-3 py-3 transition md:px-4 ${
                                            isSelected
                                                ? 'border-teal-500 bg-teal-50 shadow-[0_18px_40px_-32px_rgba(13,148,136,0.85)]'
                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <input
                                            checked={isSelected}
                                            className="sr-only"
                                            name={`question-${activeQuestion.question_id}`}
                                            onChange={() => updateAnswer(activeSubjectId, activeQuestion.question_id, option.id)}
                                            type="radio"
                                            value={option.id}
                                        />

                                        <span
                                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                                                isSelected ? 'border-teal-600 bg-teal-600' : 'border-slate-300 bg-white'
                                            }`}
                                        >
                                            <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-white' : 'bg-transparent'}`} />
                                        </span>

                                        <span
                                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${
                                                isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {OPTION_LETTERS[optionIndex] || `${optionIndex + 1}`}
                                        </span>

                                        <RichContent
                                            content={option.text}
                                            className="min-w-0 flex-1 text-sm leading-6 text-slate-900 [&_p]:m-0 [&_img]:align-middle"
                                        />
                                    </label>
                                );
                            })}
                        </div>

                        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
                            <button
                                className={`${ui.secondaryButton} min-h-10 px-4 disabled:cursor-not-allowed disabled:opacity-50`}
                                disabled={currentQuestionIndex === 0}
                                onClick={goToPreviousQuestion}
                                type="button"
                            >
                                {copy.previous}
                            </button>

                            {currentQuestionIndex < activeAttempt.questions.length - 1 ? (
                                <button
                                    className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                                    onClick={goToNextQuestion}
                                    type="button"
                                >
                                    {copy.next}
                                </button>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <div className="flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white/80 p-6 text-center shadow-sm">
                        <div className="max-w-md">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{copy.pickQuestion}</p>
                            <h3 className="mt-3 text-2xl font-extrabold text-slate-900">{copy.noActiveSubject}</h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">{copy.noActiveSubjectDescription}</p>
                        </div>
                    </div>
                )}
            </div>

            {proctoringStatus !== 'active' ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_-35px_rgba(15,23,42,0.5)]">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{copy.proctoringTitle}</p>
                        <h3 className="mt-3 text-2xl font-extrabold text-slate-900">{copy.proctoringTitle}</h3>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{proctoringMessage}</p>
                        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button
                                className={`${ui.primaryButton} min-h-11`}
                                disabled={proctoringStatus === 'requesting'}
                                onClick={() => retryProctoring()}
                                type="button"
                            >
                                {proctoringStatus === 'idle' ? copy.proctoringStart : copy.proctoringRetry}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
