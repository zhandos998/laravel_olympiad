import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PROFILE_SUBJECTS, TEST_LANGUAGES } from '../constants/registration';
import { ui } from '../constants/ui';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { api } from '../lib/api';

function formatRemainingTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export function StudentOlympiadPage() {
    const { olympiadId } = useParams();
    const navigate = useNavigate();
    const { token, setError } = useAuth();
    const { locale, t } = useLocale();
    const [data, setData] = useState(null);
    const [now, setNow] = useState(Date.now());
    const [isStarting, setIsStarting] = useState(false);

    const copy = useMemo(
        () => ({
            back: locale === 'kaz' ? 'Вернуться к олимпиадам' : 'Вернуться к олимпиадам',
            duration: locale === 'kaz' ? 'Время 1 тура' : 'Время 1 тура',
            startOlympiad: locale === 'kaz' ? 'Начать тестирование' : 'Начать тестирование',
            continueOlympiad: locale === 'kaz' ? 'Перейти к тестированию' : 'Перейти к тестированию',
            subjectsTitle: locale === 'kaz' ? 'Мои предметы' : 'Мои предметы',
            subjectReady: locale === 'kaz' ? 'Готов к прохождению' : 'Готов к прохождению',
            subjectInProgress: locale === 'kaz' ? 'Тестирование в процессе' : 'Тестирование в процессе',
            subjectCompleted: locale === 'kaz' ? 'Предмет завершён' : 'Предмет завершён',
            stagePassed: locale === 'kaz' ? 'Пройден' : 'Пройден',
            stageFailed: locale === 'kaz' ? 'Не пройден' : 'Не пройден',
            stageNotStarted:
                locale === 'kaz'
                    ? 'Сначала запустите 1 тур. После старта откроется отдельная страница тестирования.'
                    : 'Сначала запустите 1 тур. После старта откроется отдельная страница тестирования.',
            noSubjects:
                locale === 'kaz'
                    ? 'Предметы для выбранного языка и профиля пока не подготовлены.'
                    : 'Предметы для выбранного языка и профиля пока не подготовлены.',
            timeLeft: locale === 'kaz' ? 'Осталось времени' : 'Осталось времени',
        }),
        [locale],
    );

    const loadOlympiad = async () => {
        try {
            const response = await api(`/student/olympiads/${olympiadId}`, { token });
            setData(response);
            setError('');
        } catch (error) {
            setError(error.message);
        }
    };

    useEffect(() => {
        loadOlympiad();
    }, [olympiadId, token]);

    const overallEndsAt = data?.registration?.stage1_ends_at ?? null;

    useEffect(() => {
        if (!overallEndsAt) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [overallEndsAt]);

    const languageLabel = (value) => {
        const item = TEST_LANGUAGES.find((entry) => entry.value === value);
        return item ? t(item.labelKey) : value || '-';
    };

    const profileLabel = (value) => {
        const item = PROFILE_SUBJECTS.find((entry) => entry.value === value);
        return item ? t(item.labelKey) : value || '-';
    };

    const statusLabel = (status) => {
        if (!status) {
            return '-';
        }

        const translated = t(`statuses.${status}`);
        return translated === `statuses.${status}` ? status : translated;
    };

    const attemptResultLabel = (isPassed) => (isPassed ? copy.stagePassed : copy.stageFailed);
    const stageOneStarted = Boolean(data?.registration?.stage1_started_at);
    const remainingSeconds = overallEndsAt ? Math.max(Math.floor((new Date(overallEndsAt).getTime() - now) / 1000), 0) : null;
    const hasPendingSubjects = Boolean(
        data?.subjects?.some((subject) => subject.stage1_attempt?.status !== 'completed'),
    );

    const startOlympiad = async () => {
        try {
            setIsStarting(true);
            await api(`/student/olympiads/${olympiadId}/stage-one/start`, {
                method: 'POST',
                token,
            });
            setError('');
            navigate(`/student/olympiads/${olympiadId}/test`);
        } catch (error) {
            setError(error.message);
        } finally {
            setIsStarting(false);
        }
    };

    if (!data) {
        return <section className={ui.card}>{t('common.loading')}</section>;
    }

    return (
        <section className="grid gap-4">
            <div className={ui.card}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="grid gap-2">
                        <Link className={`${ui.secondaryButton} inline-flex w-fit items-center justify-center`} to="/student">
                            {'<- \u041d\u0430\u0437\u0430\u0434'}
                        </Link>
                        <h2 className="text-2xl font-bold text-slate-900">{data.olympiad.title}</h2>
                        {data.olympiad.description ? <p className="text-sm text-slate-600">{data.olympiad.description}</p> : null}
                    </div>
                    <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p>
                            {t('common.status')}: {statusLabel(data.registration.current_status)}
                        </p>
                        <p>
                            {t('auth.testLanguage')}: {languageLabel(data.registration.test_language)}
                        </p>
                        <p>
                            {t('auth.profileSubjects')}: {profileLabel(data.registration.profile_subjects)}
                        </p>
                        <p>
                            {copy.duration}: {data.olympiad.stage1_duration_minutes} мин
                        </p>
                        {remainingSeconds !== null ? (
                            <p>
                                {copy.timeLeft}: {formatRemainingTime(remainingSeconds)}
                            </p>
                        ) : null}
                    </div>
                </div>

                {!stageOneStarted ? (
                    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-teal-900">{copy.stageNotStarted}</p>
                        <button className={ui.primaryButton} disabled={isStarting} onClick={startOlympiad}>
                            {copy.startOlympiad}
                        </button>
                    </div>
                ) : hasPendingSubjects ? (
                    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-amber-900">{copy.stageNotStarted}</p>
                        <button className={ui.primaryButton} onClick={() => navigate(`/student/olympiads/${olympiadId}/test`)}>
                            {copy.continueOlympiad}
                        </button>
                    </div>
                ) : null}
            </div>

            <div className={ui.card}>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">{copy.subjectsTitle}</h3>

                {data.subjects.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-600">{copy.noSubjects}</p>
                ) : (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {data.subjects.map((subject) => {
                            const attempt = subject.stage1_attempt;

                            return (
                                <div key={subject.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="grid gap-2">
                                        <h4 className="text-lg font-semibold text-slate-900">{subject.display_name ?? subject.name}</h4>
                                        {subject.description ? <p className="text-sm text-slate-600">{subject.description}</p> : null}
                                        <p className="text-sm text-slate-600">
                                            {t('common.totalQuestions')}: {subject.stage1_question_count}
                                        </p>
                                        {!attempt ? (
                                            <p className="text-sm font-medium text-slate-600">{copy.subjectReady}</p>
                                        ) : attempt.status === 'completed' ? (
                                            <>
                                                <p className="text-sm font-medium text-emerald-700">{copy.subjectCompleted}</p>
                                                <p className="text-sm text-slate-700">
                                                    {attempt.correct_answers ?? 0}/{attempt.total_questions ?? 0} | {attempt.score_percent ?? 0}% |{' '}
                                                    {attemptResultLabel(attempt.is_passed)}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-sm font-medium text-amber-700">{copy.subjectInProgress}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
