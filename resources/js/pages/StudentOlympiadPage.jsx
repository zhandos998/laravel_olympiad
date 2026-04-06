import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatDate } from '../components/admin/adminOlympiadUtils';
import { PageHero } from '../components/layout/PageHero';
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

function formatDateRange(startValue, endValue, locale) {
    const start = startValue ? formatDate(startValue, locale) : null;
    const end = endValue ? formatDate(endValue, locale) : null;

    if (!start && !end) {
        return null;
    }

    if (start && end) {
        return `${start} - ${end}`;
    }

    return start ?? end;
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
            back: locale === 'kaz' ? 'Артқа' : 'Назад',
            duration: locale === 'kaz' ? '1 кезең уақыты' : 'Время 1 тура',
            startOlympiad: locale === 'kaz' ? 'Тестілеуді бастау' : 'Начать тестирование',
            continueOlympiad: locale === 'kaz' ? 'Тестілеуге өту' : 'Перейти к тестированию',
            subjectsTitle: locale === 'kaz' ? 'Менің пәндерім' : 'Мои предметы',
            subjectReady: locale === 'kaz' ? 'Өтуге дайын' : 'Готов к прохождению',
            subjectInProgress: locale === 'kaz' ? 'Тестілеу жүріп жатыр' : 'Тестирование в процессе',
            subjectCompleted: locale === 'kaz' ? 'Пән аяқталды' : 'Предмет завершен',
            stagePassed: locale === 'kaz' ? 'Өтті' : 'Пройден',
            stageFailed: locale === 'kaz' ? 'Не өтті' : 'Не пройден',
            stageNotStarted:
                locale === 'kaz'
                    ? 'Алдымен 1 кезеңді бастаңыз. Старттан кейін тестілеудің бөлек беті ашылады.'
                    : 'Сначала запустите 1 тур. После старта откроется отдельная страница тестирования.',
            noSubjects:
                locale === 'kaz'
                    ? 'Таңдалған тіл мен бейін үшін пәндер әлі дайын емес.'
                    : 'Предметы для выбранного языка и профиля пока не подготовлены.',
            timeLeft: locale === 'kaz' ? 'Қалған уақыт' : 'Осталось времени',
            stageTwoTitle: locale === 'kaz' ? '2 кезең' : '2 тур',
            stageTwoPeriod: locale === 'kaz' ? '2 кезең уақыты' : 'Период 2 тура',
            stageTwoHint:
                locale === 'kaz'
                    ? '2 кезең туралы ақпарат осы бетте көрсетіледі. Қатысу 1 кезеңнен өткен пәндерге ғана ашылады.'
                    : 'Информация о 2 туре показывается здесь. Доступ открывается только по предметам, пройденным в 1 туре.',
            stageTwoPeriodMissing: locale === 'kaz' ? 'Период 2 кезең үшін әлі қойылмаған.' : 'Период 2 тура пока не назначен.',
            meetingLinkLabel: locale === 'kaz' ? 'Zoom/Meet сілтемесі' : 'Ссылка Zoom/Meet',
            openMeetingLink: locale === 'kaz' ? 'сілтемені ашу' : 'открыть ссылку',
            meetingLinkMissing: locale === 'kaz' ? 'Сілтеме әлі тағайындалмаған.' : 'Ссылка пока не назначена.',
            stageTwoAwaiting: locale === 'kaz' ? 'тағайындау күтілуде' : 'ожидает назначения',
            stageTwoScore: locale === 'kaz' ? 'Балл 2 кезең' : 'Балл 2 тура',
            noStageTwoSubjects: locale === 'kaz' ? '2 кезеңге өткен пәндер әзірге жоқ.' : 'Пока нет предметов, допущенных ко 2 туру.',
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
    const hasPendingSubjects = Boolean(data?.subjects?.some((subject) => subject.stage1_attempt?.status !== 'completed'));
    const stageTwoSubjects = data?.subjects?.filter((subject) => subject.stage2?.eligible) ?? [];
    const hasStageTwoSection = Boolean(data?.olympiad?.stage2_starts_at || data?.olympiad?.stage2_ends_at || stageTwoSubjects.length > 0);
    const olympiadStageTwoPeriod = formatDateRange(data?.olympiad?.stage2_starts_at, data?.olympiad?.stage2_ends_at, locale);

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
        <section className="grid gap-5">
            <PageHero
                eyebrow={t('header.badge')}
                title={data.olympiad.title}
                description={
                    data.olympiad.description ||
                    (locale === 'kaz'
                        ? 'Олимпиада профилі, кезеңдер кестесі және пәндер мәртебесі осы бетте жиналған.'
                        : 'Профиль олимпиады, расписание этапов и статусы предметов собраны на этой странице.')
                }
                actions={
                    <Link className={`${ui.secondaryButton} inline-flex w-fit items-center justify-center`} to="/student">
                        {`<- ${copy.back}`}
                    </Link>
                }
                aside={
                    <div className="grid gap-3">
                        <div className={ui.metricCard}>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d82b2]">{t('common.status')}</p>
                            <p className="mt-2 text-lg font-bold text-[#27498c]">{statusLabel(data.registration.current_status)}</p>
                        </div>
                        <div className={ui.metricCard}>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d82b2]">{t('auth.testLanguage')}</p>
                            <p className="mt-2 text-lg font-bold text-[#27498c]">{languageLabel(data.registration.test_language)}</p>
                        </div>
                        <div className={ui.metricCard}>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d82b2]">{t('auth.profileSubjects')}</p>
                            <p className="mt-2 text-sm font-semibold leading-6 text-[#27498c]">{profileLabel(data.registration.profile_subjects)}</p>
                        </div>
                        <div className={ui.metricCard}>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d82b2]">{copy.duration}</p>
                            <p className="mt-2 text-lg font-bold text-[#27498c]">{data.olympiad.stage1_duration_minutes} мин</p>
                            {olympiadStageTwoPeriod ? <p className="mt-2 text-sm text-slate-600">{copy.stageTwoPeriod}: {olympiadStageTwoPeriod}</p> : null}
                            {remainingSeconds !== null ? <p className="mt-1 text-sm text-slate-600">{copy.timeLeft}: {formatRemainingTime(remainingSeconds)}</p> : null}
                        </div>
                    </div>
                }
            />

            <div className={ui.card}>
                {!stageOneStarted ? (
                    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[#bfd0f4] bg-[#f7f9ff] p-4 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm leading-6 text-[#355da8]">{copy.stageNotStarted}</p>
                        <button className={ui.primaryButton} disabled={isStarting} onClick={startOlympiad} type="button">
                            {copy.startOlympiad}
                        </button>
                    </div>
                ) : hasPendingSubjects ? (
                    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[#d7e3fb] bg-[#eef3ff] p-4 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm leading-6 text-[#355da8]">{copy.stageNotStarted}</p>
                        <button className={ui.primaryButton} onClick={() => navigate(`/student/olympiads/${olympiadId}/test`)} type="button">
                            {copy.continueOlympiad}
                        </button>
                    </div>
                ) : null}
            </div>

            <div className={ui.card}>
                <h3 className="text-sm font-black uppercase tracking-[0.24em] text-[#6d82b2]">{copy.subjectsTitle}</h3>

                {data.subjects.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-600">{copy.noSubjects}</p>
                ) : (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        {data.subjects.map((subject) => {
                            const attempt = subject.stage1_attempt;

                            return (
                                <div key={subject.id} className={`${ui.block} relative overflow-hidden`}>
                                    <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-full bg-[#d7e3fb]/70 blur-2xl" />

                                    <div className="relative grid gap-2">
                                        <h4 className="text-lg font-semibold text-slate-900">{subject.display_name ?? subject.name}</h4>
                                        {subject.description ? <p className="text-sm text-slate-600">{subject.description}</p> : null}
                                        <p className="text-sm text-slate-600">
                                            {t('common.totalQuestions')}: {subject.stage1_question_count}
                                        </p>
                                        {!attempt ? (
                                            <p className="text-sm font-medium text-slate-600">{copy.subjectReady}</p>
                                        ) : attempt.status === 'completed' ? (
                                            <>
                                                <p className="text-sm font-medium text-[#355da8]">{copy.subjectCompleted}</p>
                                                <p className="text-sm text-slate-700">
                                                    {attempt.correct_answers ?? 0}/{attempt.total_questions ?? 0} | {attempt.score_percent ?? 0}% | {attemptResultLabel(attempt.is_passed)}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-sm font-medium text-[#355da8]">{copy.subjectInProgress}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {hasStageTwoSection ? (
                <div className={ui.card}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="grid gap-2">
                            <h3 className="text-sm font-black uppercase tracking-[0.24em] text-[#6d82b2]">{copy.stageTwoTitle}</h3>
                            <p className="text-sm text-slate-700">
                                {copy.stageTwoPeriod}: {olympiadStageTwoPeriod ?? copy.stageTwoPeriodMissing}
                            </p>
                            <p className="text-sm text-slate-600">{copy.stageTwoHint}</p>
                        </div>
                        <div className="rounded-[1.2rem] border border-[#e4ecfc] bg-white px-4 py-3 text-sm text-slate-700">
                            {t('common.status')}: {statusLabel(data.registration.current_status)}
                        </div>
                    </div>

                    {stageTwoSubjects.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-600">{copy.noStageTwoSubjects}</p>
                    ) : (
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            {stageTwoSubjects.map((subject) => {
                                const stageTwo = subject.stage2 ?? {};
                                const subjectStageTwoPeriod = formatDateRange(stageTwo.starts_at, stageTwo.ends_at, locale);

                                return (
                                    <div key={`stage-two-${subject.id}`} className={`${ui.block} relative overflow-hidden`}>
                                        <div className="pointer-events-none absolute left-0 top-0 h-20 w-20 rounded-full bg-[#355da8]/10 blur-2xl" />

                                        <div className="relative grid gap-2">
                                            <h4 className="text-lg font-semibold text-slate-900">{subject.display_name ?? subject.name}</h4>
                                            <p className="text-sm text-slate-700">
                                                {t('common.status')}: {stageTwo.status ? statusLabel(stageTwo.status) : copy.stageTwoAwaiting}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                {copy.stageTwoPeriod}: {subjectStageTwoPeriod ?? olympiadStageTwoPeriod ?? copy.stageTwoPeriodMissing}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                {copy.stageTwoScore}: {stageTwo.score_percent ?? '-'}%
                                            </p>
                                            {stageTwo.meeting_link ? (
                                                <p className="text-sm text-slate-600">
                                                    {copy.meetingLinkLabel}:{' '}
                                                    <a className="font-semibold text-[#355da8] hover:text-[#2b4d90]" href={stageTwo.meeting_link} rel="noreferrer" target="_blank">
                                                        {copy.openMeetingLink}
                                                    </a>
                                                </p>
                                            ) : (
                                                <p className="text-sm text-slate-600">
                                                    {copy.meetingLinkLabel}: {copy.meetingLinkMissing}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : null}
        </section>
    );
}
