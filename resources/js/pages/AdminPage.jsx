import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
        <section className={ui.card}>
            <h2 className="text-xl font-bold">{text.title}</h2>

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

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {olympiads.length === 0 ? (
                    <div className={ui.block}>
                        <p className="text-sm text-slate-600">{text.noOlympiads}</p>
                    </div>
                ) : (
                    olympiads.map((olympiad) => (
                        <div key={olympiad.id} className={ui.block} data-testid={`olympiad-card-${olympiad.id}`}>
                            <p className="font-semibold text-slate-900">{olympiad.title}</p>
                            <p className="mt-1 text-sm text-slate-600">
                                {text.registeredCount}: {olympiad.registrations_count ?? 0}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                                {text.registrationStatus}: {olympiad.registration_open ? t('common.open') : t('common.closed')}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Link
                                    className={ui.primaryButton}
                                    data-testid={`open-olympiad-${olympiad.id}`}
                                    to={`/admin/olympiads/${olympiad.id}`}
                                >
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
                    ))
                )}
            </div>
        </section>
    );
}
