import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/layout/PageHero';
import { adminCopy } from '../constants/adminCopy';
import { ui } from '../constants/ui';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useLocale } from '../context/LocaleContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../lib/api';

export function AdminPage() {
    const { token, setError } = useAuth();
    const { locale, t } = useLocale();
    const { showNotification } = useNotification();
    const { confirm } = useConfirm();
    const [olympiads, setOlympiads] = useState([]);
    const [title, setTitle] = useState('');

    const text = adminCopy[locale] ?? adminCopy.rus;
    const olympiadTitleRequired = text.invalidOlympiadTitle;

    const loadOlympiads = () => {
        api('/admin/olympiads', { token })
            .then(setOlympiads)
            .catch((error) => setError(error.message));
    };

    useEffect(() => {
        loadOlympiads();
    }, [token, setError]);

    const createOlympiad = async () => {
        const trimmedTitle = title.trim();

        if (!trimmedTitle) {
            setError(olympiadTitleRequired);
            showNotification({ type: 'error', message: olympiadTitleRequired });
            return;
        }

        try {
            await api('/admin/olympiads', {
                method: 'POST',
                token,
                body: { title: trimmedTitle },
            });

            setTitle('');
            loadOlympiads();
            setError('');
            showNotification({ type: 'success', message: text.olympiadCreated });
        } catch (error) {
            setError(error.message);
        }
    };

    const toggleRegistration = async (olympiadId, registrationOpen) => {
        try {
            await api(`/admin/olympiads/${olympiadId}/registration`, {
                method: 'PATCH',
                token,
                body: { registration_open: !registrationOpen },
            });

            loadOlympiads();
            setError('');
            showNotification({ type: 'success', message: text.registrationUpdated });
        } catch (error) {
            setError(error.message);
        }
    };

    const archiveOlympiad = async (olympiadId) => {
        const confirmed = await confirm({
            title: text.archiveOlympiad,
            message: text.archiveOlympiadConfirm,
            confirmText: text.archiveOlympiad,
            tone: 'danger',
        });

        if (!confirmed) {
            return;
        }

        try {
            await api(`/admin/olympiads/${olympiadId}/archive`, {
                method: 'PATCH',
                token,
            });

            loadOlympiads();
            setError('');
            showNotification({ type: 'success', message: text.olympiadArchived });
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <section className="grid gap-5">
            <PageHero
                eyebrow={t('header.badge')}
                title={text.title}
                description={
                    locale === 'kaz'
                        ? 'Олимпиадаларды құрып, тіркеуді басқарыңыз және барлық жұмыс сценарийлерін бір панельден бақылаңыз.'
                        : 'Создавайте олимпиады, управляйте регистрацией и контролируйте все рабочие сценарии из одной панели.'
                }
                aside={
                    <>
                        <div className={ui.metricCard}>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d82b2]">{text.subjects}</p>
                            <p className="mt-2 text-3xl font-extrabold text-[#27498c]">{olympiads.length}</p>
                        </div>
                        <div className={ui.metricCard}>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d82b2]">{text.registrationStatus}</p>
                            <p className="mt-2 text-3xl font-extrabold text-[#27498c]">{olympiads.filter((item) => item.registration_open).length}</p>
                        </div>
                    </>
                }
            />

            <section className={ui.card}>
                <div className="rounded-[1.7rem] border border-[#e4ecfc] bg-white p-4 md:p-5">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6d82b2]">{text.createOlympiad}</p>

                    <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                        <input
                            className={ui.input}
                            data-testid="olympiad-title-input"
                            value={title}
                            placeholder={text.olympiadTitle}
                            onChange={(event) => setTitle(event.target.value)}
                        />
                        <button className={ui.primaryButton} data-testid="create-olympiad-button" onClick={createOlympiad}>
                            {text.createOlympiad}
                        </button>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {olympiads.length === 0 ? (
                        <div className={ui.block}>
                            <p className="text-sm text-slate-600">{text.noOlympiads}</p>
                        </div>
                    ) : (
                        olympiads.map((olympiad) => (
                            <div key={olympiad.id} className={`${ui.block} relative overflow-hidden`} data-testid={`olympiad-card-${olympiad.id}`}>
                                <div className="pointer-events-none absolute left-0 top-0 h-20 w-20 rounded-full bg-[#355da8]/12 blur-2xl" />

                                <div className="relative">
                                    <p className="text-lg font-bold text-slate-900">{olympiad.title}</p>

                                    <div className="mt-4 grid gap-2 rounded-[1.2rem] border border-[#e4ecfc] bg-white px-4 py-4">
                                        <p className="text-sm text-slate-600">
                                            {text.registeredCount}: {olympiad.registrations_count ?? 0}
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            {text.registrationStatus}: {olympiad.registration_open ? t('common.open') : t('common.closed')}
                                        </p>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <Link className={ui.primaryButton} data-testid={`open-olympiad-${olympiad.id}`} to={`/admin/olympiads/${olympiad.id}`}>
                                            {text.openOlympiad}
                                        </Link>
                                        <button
                                            className={ui.secondaryButton}
                                            data-testid={`toggle-registration-${olympiad.id}`}
                                            onClick={() => toggleRegistration(olympiad.id, olympiad.registration_open)}
                                        >
                                            {olympiad.registration_open ? t('common.close') : t('common.openVerb')}
                                        </button>
                                        <button className={ui.secondaryButton} data-testid={`archive-olympiad-${olympiad.id}`} onClick={() => archiveOlympiad(olympiad.id)}>
                                            {text.archiveOlympiad}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </section>
    );
}
