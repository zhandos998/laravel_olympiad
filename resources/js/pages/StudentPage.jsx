import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    const { t } = useLocale();
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

    return (
        <section className={ui.card}>
            <h2 className="text-xl font-bold">{t('student.title')}</h2>
            <h3 className="mt-4 mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">{t('student.availableOlympiads')}</h3>

            <div className="grid gap-3 md:grid-cols-2">
                {olympiads.map((olympiad) => (
                    <div key={olympiad.id} className={ui.block}>
                        <p className="font-semibold text-slate-900">{olympiad.title}</p>
                        {olympiad.description ? <p className="mt-1 text-sm text-slate-600">{olympiad.description}</p> : null}
                        <p className="mt-2 text-sm text-slate-600">
                            {t('student.registration')}: {olympiad.registration_open ? t('common.open') : t('common.closed')}
                        </p>

                        {olympiad.registration ? (
                            <div className="mt-3 grid gap-2">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                                    {t('student.enrolledSuccess')}
                                </div>
                                <p className="text-sm text-slate-600">
                                    {t('common.status')}: {statusLabel(olympiad.registration.current_status)}
                                </p>
                                <p className="text-sm text-slate-600">
                                    {t('auth.testLanguage')}: {languageLabel(olympiad.registration.test_language)}
                                </p>
                                <p className="text-sm text-slate-600">
                                    {t('auth.profileSubjects')}: {profileLabel(olympiad.registration.profile_subjects)}
                                </p>
                                <Link className={`${ui.primaryButton} inline-flex items-center justify-center`} to={`/student/olympiads/${olympiad.id}`}>
                                    {t('common.openVerb')}
                                </Link>
                            </div>
                        ) : (
                            <div className="mt-3 grid gap-3">
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
                ))}
            </div>
        </section>
    );
}
