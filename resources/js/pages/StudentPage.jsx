import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/layout/PageHero';
import { formatDate } from '../components/admin/adminOlympiadUtils';
import { PROFILE_SUBJECTS, TEST_LANGUAGES } from '../constants/registration';
import { ui } from '../constants/ui';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../lib/api';

function buildEnrollForms(olympiads, currentForms, user) {
    return olympiads.reduce((nextForms, olympiad) => {
        const registration = olympiad.registration;
        nextForms[olympiad.id] = currentForms[olympiad.id] ?? {
            test_language: registration?.test_language ?? user?.test_language ?? TEST_LANGUAGES[0].value,
            profile_subjects: registration?.profile_subjects ?? user?.profile_subjects ?? PROFILE_SUBJECTS[0].value,
        };
        return nextForms;
    }, {});
}

export function StudentPage() {
    const { token, user, setError } = useAuth();
    const { locale, t } = useLocale();
    const { showNotification } = useNotification();
    const [olympiads, setOlympiads] = useState([]);
    const [enrollForms, setEnrollForms] = useState({});

    const languageLabel = (value) => {
        const item = TEST_LANGUAGES.find((entry) => entry.value === value);
        return item ? t(item.labelKey) : value || '-';
    };

    const profileLabel = (value) => {
        const item = PROFILE_SUBJECTS.find((entry) => entry.value === value);
        return item ? t(item.labelKey) : value || '-';
    };

    const loadOlympiads = async () => {
        try {
            const data = await api('/student/olympiads', { token });
            setOlympiads(data);
            setEnrollForms((previous) => buildEnrollForms(data, previous, user));
            setError('');
        } catch (error) {
            setError(error.message);
        }
    };

    useEffect(() => {
        loadOlympiads();
    }, [token, user]);

    const updateEnrollForm = (olympiadId, field, value) => {
        setEnrollForms((previous) => ({
            ...previous,
            [olympiadId]: {
                ...(previous[olympiadId] ?? {}),
                [field]: value,
            },
        }));
    };

    const enroll = async (olympiadId) => {
        try {
            await api('/auth/enroll', {
                method: 'POST',
                token,
                body: {
                    olympiad_id: olympiadId,
                    test_language: enrollForms[olympiadId]?.test_language ?? TEST_LANGUAGES[0].value,
                    profile_subjects: enrollForms[olympiadId]?.profile_subjects ?? PROFILE_SUBJECTS[0].value,
                },
            });

            await loadOlympiads();
            setError('');
            showNotification({
                type: 'success',
                message: t('student.enrolledSuccess'),
            });
        } catch (error) {
            setError(error.message);
        }
    };

    const statusLabel = (status) => {
        if (!status) {
            return '-';
        }

        const translated = t(`statuses.${status}`);

        return translated === `statuses.${status}` ? status : translated;
    };

    const stageTwoPeriodLabel = (olympiad) => {
        const start = olympiad.stage2_starts_at ? formatDate(olympiad.stage2_starts_at, locale) : null;
        const end = olympiad.stage2_ends_at ? formatDate(olympiad.stage2_ends_at, locale) : null;

        if (!start && !end) {
            return null;
        }

        if (start && end) {
            return `${start} - ${end}`;
        }

        return start ?? end;
    };

    const enrolledCount = olympiads.filter((olympiad) => Boolean(olympiad.registration)).length;

    return (
        <section className="grid gap-5">
            <PageHero
                eyebrow={t('header.badge')}
                title={t('student.title')}
                description={
                    locale === 'kaz'
                        ? 'Қолжетімді олимпиадаларды қарап, өз профиліңізді басқарыңыз және қажетті кезеңге өтіңіз.'
                        : 'Просматривайте доступные олимпиады, управляйте параметрами регистрации и переходите к своим этапам.'
                }
                aside={
                    <>
                        <div className={ui.metricCard}>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d82b2]">{t('student.availableOlympiads')}</p>
                            <p className="mt-2 text-3xl font-extrabold text-[#27498c]">{olympiads.length}</p>
                        </div>
                        <div className={ui.metricCard}>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d82b2]">{t('student.registration')}</p>
                            <p className="mt-2 text-3xl font-extrabold text-[#27498c]">{enrolledCount}</p>
                        </div>
                    </>
                }
            />

            <section className={ui.card}>
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.24em] text-[#6d82b2]">{t('student.availableOlympiads')}</h3>
                        <p className="mt-2 text-lg font-bold text-[#27498c]">{locale === 'kaz' ? 'Қазіргі тізім' : 'Актуальный список'}</p>
                    </div>
                    <p className="text-sm text-slate-600">{locale === 'kaz' ? `Барлығы: ${olympiads.length}` : `Всего: ${olympiads.length}`}</p>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    {olympiads.map((olympiad) => (
                        <div key={olympiad.id} className={`${ui.block} relative overflow-hidden`}>
                            <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[#d7e3fb]/70 blur-2xl" />

                            <div className="relative">
                                {stageTwoPeriodLabel(olympiad) ? (
                                    <p className="mb-3 inline-flex rounded-full border border-[#bfd0f4] bg-[#f7f9ff] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#355da8]">
                                        {t('student.stage2Label')}: {stageTwoPeriodLabel(olympiad)}
                                    </p>
                                ) : null}

                                <p className="text-xl font-bold text-slate-900">{olympiad.title}</p>
                                {olympiad.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{olympiad.description}</p> : null}
                                <p className="mt-3 text-sm text-slate-600">
                                    {t('student.registration')}: {olympiad.registration_open ? t('common.open') : t('common.closed')}
                                </p>

                                {olympiad.registration ? (
                                    <div className="mt-4 grid gap-3">
                                        <div className="rounded-[1.2rem] border border-[#bfd0f4] bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#355da8]">
                                            {t('student.enrolledSuccess')}
                                        </div>

                                        <div className="grid gap-2 rounded-[1.2rem] border border-[#e4ecfc] bg-white px-4 py-4">
                                            <p className="text-sm text-slate-600">
                                                {t('common.status')}: {statusLabel(olympiad.registration.current_status)}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                {t('auth.testLanguage')}: {languageLabel(olympiad.registration.test_language)}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                {t('auth.profileSubjects')}: {profileLabel(olympiad.registration.profile_subjects)}
                                            </p>
                                        </div>

                                        <Link className={`${ui.primaryButton} inline-flex items-center justify-center`} to={`/student/olympiads/${olympiad.id}`}>
                                            {t('common.openVerb')}
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="mt-4 grid gap-3 rounded-[1.2rem] border border-[#e4ecfc] bg-white px-4 py-4">
                                        <p className="text-sm font-semibold text-slate-700">{t('student.registration')}</p>

                                        <label className="grid gap-1 text-sm text-slate-700">
                                            <span>{t('auth.testLanguage')}</span>
                                            <select
                                                className={ui.input}
                                                value={enrollForms[olympiad.id]?.test_language ?? TEST_LANGUAGES[0].value}
                                                onChange={(event) => updateEnrollForm(olympiad.id, 'test_language', event.target.value)}
                                            >
                                                {TEST_LANGUAGES.map((item) => (
                                                    <option key={item.value} value={item.value}>
                                                        {languageLabel(item.value)}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="grid gap-1 text-sm text-slate-700">
                                            <span>{t('auth.profileSubjects')}</span>
                                            <select
                                                className={ui.input}
                                                value={enrollForms[olympiad.id]?.profile_subjects ?? PROFILE_SUBJECTS[0].value}
                                                onChange={(event) => updateEnrollForm(olympiad.id, 'profile_subjects', event.target.value)}
                                            >
                                                {PROFILE_SUBJECTS.map((item) => (
                                                    <option key={item.value} value={item.value}>
                                                        {profileLabel(item.value)}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <button className={ui.primaryButton} disabled={!olympiad.registration_open} onClick={() => enroll(olympiad.id)}>
                                            {t('student.enroll')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </section>
    );
}
