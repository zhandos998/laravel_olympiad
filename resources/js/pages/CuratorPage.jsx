import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { curatorCopy } from '../components/curator/curatorShared';
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

    if (subjects.length === 0) {
        return (
            <section className={ui.card}>
                <h2 className="text-xl font-bold">{t('curator.title')}</h2>
                <p className="mt-1 text-sm text-slate-600">{text.noAssignedSubjects}</p>
            </section>
        );
    }

    return (
        <section className="grid gap-5">
            <div className={ui.card}>
                <h2 className="text-xl font-bold">{t('curator.title')}</h2>
                <p className="mt-1 text-sm text-slate-600">{text.subtitle}</p>
            </div>

            <section className={ui.card}>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">{text.assignedSubjects}</h3>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {subjects.map((subject) => (
                        <div key={subject.id} data-testid={`curator-subject-${subject.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="font-semibold text-slate-900">{subject.display_name ?? subject.name}</p>
                            <p className="mt-1 text-sm text-slate-600">
                                {text.olympiadLabel}: {subject.olympiad?.title ?? '-'}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                                {text.assignedQuestionCount}: {subject.questions_count ?? 0}
                            </p>
                            <div className="mt-4">
                                <Link className={ui.primaryButton} data-testid={`curator-open-subject-${subject.id}`} to={`/curator/subjects/${subject.id}/questions`}>
                                    {text.openSubject}
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </section>
    );
}
