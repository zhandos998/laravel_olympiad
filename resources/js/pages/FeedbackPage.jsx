import React, { useEffect, useState } from 'react';
import { formatDate } from '../components/admin/adminOlympiadUtils';
import { PageHero } from '../components/layout/PageHero';
import { feedbackCopy } from '../constants/feedbackCopy';
import { ui } from '../constants/ui';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../lib/api';

function statusClasses(status) {
    if (status === 'answered') {
        return 'border border-[#bfd0f4] bg-[#f7f9ff] text-[#355da8]';
    }

    return 'border border-[#d7e3fb] bg-[#eef3ff] text-[#355da8]';
}

function buildReplyDrafts(items, currentDrafts) {
    return items.reduce((drafts, item) => {
        drafts[item.id] = currentDrafts[item.id] ?? item.admin_reply ?? '';
        return drafts;
    }, {});
}

export function FeedbackPage() {
    const { token, user, setError } = useAuth();
    const { locale, t } = useLocale();
    const { showNotification } = useNotification();
    const text = feedbackCopy[locale] ?? feedbackCopy.rus;

    const [items, setItems] = useState([]);
    const [message, setMessage] = useState('');
    const [replyDrafts, setReplyDrafts] = useState({});
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [savingId, setSavingId] = useState(null);

    const isAdmin = user?.role === 'admin';

    const loadFeedback = async () => {
        setLoading(true);

        try {
            const data = await api('/feedback', { token });
            setItems(data);
            setReplyDrafts((currentDrafts) => buildReplyDrafts(data, currentDrafts));
            setError('');
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFeedback();
    }, [token, isAdmin, setError]);

    const submitFeedback = async () => {
        const trimmedMessage = message.trim();

        if (!trimmedMessage) {
            setError(text.emptyMessage);
            showNotification({ type: 'error', message: text.emptyMessage });
            return;
        }

        setSending(true);

        try {
            const created = await api('/feedback', {
                method: 'POST',
                token,
                body: {
                    message: trimmedMessage,
                },
            });

            setItems((currentItems) => [created, ...currentItems]);
            setMessage('');
            setError('');
            showNotification({ type: 'success', message: text.feedbackSent });
        } catch (error) {
            setError(error.message);
        } finally {
            setSending(false);
        }
    };

    const updateReplyDraft = (feedbackId, value) => {
        setReplyDrafts((currentDrafts) => ({
            ...currentDrafts,
            [feedbackId]: value,
        }));
    };

    const saveReply = async (feedbackId) => {
        const reply = (replyDrafts[feedbackId] ?? '').trim();

        if (!reply) {
            setError(text.replyPlaceholder);
            showNotification({ type: 'error', message: text.replyPlaceholder });
            return;
        }

        setSavingId(feedbackId);

        try {
            const updated = await api(`/feedback/${feedbackId}/reply`, {
                method: 'PATCH',
                token,
                body: {
                    admin_reply: reply,
                },
            });

            setItems((currentItems) => currentItems.map((item) => (item.id === feedbackId ? updated : item)));
            setReplyDrafts((currentDrafts) => ({
                ...currentDrafts,
                [feedbackId]: updated.admin_reply ?? reply,
            }));
            setError('');
            showNotification({ type: 'success', message: text.replySaved });
        } catch (error) {
            setError(error.message);
        } finally {
            setSavingId(null);
        }
    };

    return (
        <section className="grid gap-5">
            <PageHero
                eyebrow={t('header.badge')}
                title={text.title}
                description={isAdmin ? text.adminSubtitle : text.subtitle}
                aside={
                    <>
                        <div className={ui.metricCard}>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d82b2]">{isAdmin ? text.allRequests : text.history}</p>
                            <p className="mt-2 text-3xl font-extrabold text-[#27498c]">{items.length}</p>
                        </div>
                        <div className={ui.metricCard}>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d82b2]">{text.statusPending}</p>
                            <p className="mt-2 text-3xl font-extrabold text-[#27498c]">{items.filter((item) => item.status === 'pending').length}</p>
                        </div>
                    </>
                }
            />

            {!isAdmin ? (
                <div className={ui.card}>
                    <h3 className="text-sm font-black uppercase tracking-[0.24em] text-[#6d82b2]">{text.newFeedback}</h3>

                    <label className="mt-4 grid gap-2 text-sm text-slate-700">
                        <span>{text.messageLabel}</span>
                        <textarea
                            className={`${ui.input} min-h-32 resize-y`}
                            data-testid="feedback-message-input"
                            placeholder={text.messagePlaceholder}
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                        />
                    </label>

                    <div className="mt-4">
                        <button className={ui.primaryButton} data-testid="feedback-send-button" disabled={sending} onClick={submitFeedback}>
                            {text.send}
                        </button>
                    </div>
                </div>
            ) : null}

            <div className={ui.card}>
                <h3 className="text-sm font-black uppercase tracking-[0.24em] text-[#6d82b2]">{isAdmin ? text.allRequests : text.history}</h3>

                {loading ? (
                    <p className="mt-4 text-sm text-slate-600">{t('common.loading')}</p>
                ) : items.length === 0 ? (
                    <div className={`${ui.block} mt-4`}>
                        <p className="text-sm text-slate-600">{isAdmin ? text.noFeedbackAdmin : text.noFeedbackUser}</p>
                    </div>
                ) : (
                    <div className="mt-4 grid gap-4">
                        {items.map((item) => (
                            <article key={item.id} className={`${ui.block} relative overflow-hidden`}>
                                <div className="pointer-events-none absolute -right-3 -top-3 h-20 w-20 rounded-full bg-[#355da8]/12 blur-2xl" />

                                <div className="relative">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div className="grid gap-1">
                                            {isAdmin && item.user ? (
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {text.fromUser}: {item.user.name} ({item.user.email}) | {t(`header.role.${item.user.role}`)}
                                                </p>
                                            ) : null}
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                {text.createdAt}: {formatDate(item.created_at, locale)}
                                            </p>
                                            {item.replied_at ? (
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    {text.answeredAt}: {formatDate(item.replied_at, locale)}
                                                </p>
                                            ) : null}
                                        </div>

                                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(item.status)}`}>
                                            {item.status === 'answered' ? text.statusAnswered : text.statusPending}
                                        </span>
                                    </div>

                                    <div className="mt-4 grid gap-3">
                                        <div className="rounded-[1.2rem] border border-[#e4ecfc] bg-white p-3">
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{text.userMessage}</p>
                                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p>
                                        </div>

                                        {isAdmin ? (
                                            <div className="rounded-[1.2rem] border border-[#e4ecfc] bg-white p-3">
                                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{text.adminReply}</p>
                                                <textarea
                                                    className={`${ui.input} mt-3 min-h-28 resize-y`}
                                                    data-testid={`feedback-reply-input-${item.id}`}
                                                    placeholder={text.replyPlaceholder}
                                                    value={replyDrafts[item.id] ?? ''}
                                                    onChange={(event) => updateReplyDraft(item.id, event.target.value)}
                                                />
                                                <div className="mt-3">
                                                    <button
                                                        className={ui.primaryButton}
                                                        data-testid={`feedback-reply-save-${item.id}`}
                                                        disabled={savingId === item.id}
                                                        onClick={() => saveReply(item.id)}
                                                    >
                                                        {item.admin_reply ? text.updateReply : text.saveReply}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : item.admin_reply ? (
                                            <div className="rounded-[1.2rem] border border-[#bfd0f4] bg-[#f7f9ff] p-3">
                                                <p className="text-xs font-bold uppercase tracking-wide text-[#355da8]">{text.adminReply}</p>
                                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#355da8]">{item.admin_reply}</p>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
