import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { curatorCopy } from '../components/curator/curatorShared';
import { PageHero } from '../components/layout/PageHero';
import { ui } from '../constants/ui';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { api } from '../lib/api';

export function CuratorPage() {
    const { token, setError } = useAuth();
    const { locale, t } = useLocale();
    const text = curatorCopy[locale] ?? curatorCopy.rus;
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSubjects() {
            setLoading(true);

            try {
                const data = await api('/curator/subjects', { token });
                setSubjects(data);
                setError('');
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }

        loadSubjects();
    }, [token, setError]);

    if (loading) {
        return (
            <section className={ui.card}>
                <p className="text-sm text-slate-600">{t('common.loading')}</p>
            </section>
        );
    }

    return (
        <section className="grid gap-5">
            <PageHero
                eyebrow={t('header.badge')}
                title={t('curator.title')}
                description={text.subtitle}
                aside={
                    <div className={ui.metricCard}>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d82b2]">{text.assignedSubjects}</p>
                        <p className="mt-2 text-3xl font-extrabold text-[#27498c]">{subjects.length}</p>
                    </div>
                }
            />

            {subjects.length === 0 ? (
                <section className={ui.card}>
                    <p className="text-sm text-slate-600">{text.noAssignedSubjects}</p>
                </section>
            ) : (
                <section className={ui.card}>
                    <h3 className="text-sm font-black uppercase tracking-[0.24em] text-[#6d82b2]">{text.assignedSubjects}</h3>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {subjects.map((subject) => (
                            <div key={subject.id} data-testid={`curator-subject-${subject.id}`} className={`${ui.block} relative overflow-hidden`}>
                                <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[#d7e3fb]/70 blur-2xl" />

                                <div className="relative">
                                    <p className="text-lg font-bold text-slate-900">{subject.display_name ?? subject.name}</p>

                                    <div className="mt-4 grid gap-2 rounded-[1.2rem] border border-[#e4ecfc] bg-white px-4 py-4">
                                        <p className="text-sm text-slate-600">
                                            {text.olympiadLabel}: {subject.olympiad?.title ?? '-'}
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            {text.assignedQuestionCount}: {subject.questions_count ?? 0}
                                        </p>
                                    </div>

                                    <div className="mt-4">
                                        <Link className={ui.primaryButton} data-testid={`curator-open-subject-${subject.id}`} to={`/curator/subjects/${subject.id}/questions`}>
                                            {text.openSubject}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </section>
    );
}
