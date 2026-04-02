import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RichContent } from '../components/common/RichContent';
import { curatorCopy } from '../components/curator/curatorShared';
import { ui } from '../constants/ui';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useLocale } from '../context/LocaleContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../lib/api';

const QUESTIONS_PER_PAGE = 10;

function extractPlainText(html) {
    if (!html) {
        return '';
    }

    if (typeof document === 'undefined') {
        return html.replace(/<[^>]*>/g, ' ');
    }

    const container = document.createElement('div');
    container.innerHTML = html;
    return container.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

export function CuratorSubjectQuestionsPage() {
    const { token, setError } = useAuth();
    const { locale, t } = useLocale();
    const { showNotification } = useNotification();
    const { confirm } = useConfirm();
    const { subjectId } = useParams();
    const navigate = useNavigate();
    const text = curatorCopy[locale] ?? curatorCopy.rus;

    const [subjects, setSubjects] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortMode, setSortMode] = useState('newest');
    const [page, setPage] = useState(1);
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const searchPlaceholder =
        locale === 'kaz'
            ? 'Сурак пен жауаптар бойынша іздеу'
            : 'Поиск по тексту вопроса и вариантам ответа';
    const sortLabel = locale === 'kaz' ? 'Сұрыптау' : 'Сортировка';
    const noMatchesText = locale === 'kaz' ? 'Іздеу бойынша ештеңе табылмады.' : 'По вашему запросу ничего не найдено.';
    const previousPageText = locale === 'kaz' ? 'Артқа' : 'Назад';
    const nextPageText = locale === 'kaz' ? 'Алға' : 'Вперёд';
    const pageLabel = locale === 'kaz' ? 'Бет' : 'Страница';
    const sortOptions = [
        { value: 'newest', label: locale === 'kaz' ? 'Алдымен жаңа' : 'Сначала новые' },
        { value: 'oldest', label: locale === 'kaz' ? 'Алдымен ескі' : 'Сначала старые' },
        { value: 'alphabetical', label: locale === 'kaz' ? 'Әліпби бойынша' : 'По алфавиту' },
    ];

    const selectedSubject = useMemo(
        () => subjects.find((subject) => String(subject.id) === String(subjectId)) ?? null,
        [subjects, subjectId],
    );

    const filteredQuestions = useMemo(() => {
        const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
        const nextQuestions = questions.filter((question) => {
            if (!normalizedQuery) {
                return true;
            }

            const searchableText = [
                extractPlainText(question.text),
                ...(question.options?.map((option) => extractPlainText(option.text)) ?? []),
            ]
                .join(' ')
                .toLowerCase();

            return searchableText.includes(normalizedQuery);
        });

        nextQuestions.sort((left, right) => {
            if (sortMode === 'alphabetical') {
                return extractPlainText(left.text).localeCompare(extractPlainText(right.text), locale === 'kaz' ? 'kk' : 'ru');
            }

            if (sortMode === 'oldest') {
                return new Date(left.created_at ?? 0).getTime() - new Date(right.created_at ?? 0).getTime();
            }

            return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime();
        });

        return nextQuestions;
    }, [deferredSearchQuery, locale, questions, sortMode]);

    const totalPages = Math.max(Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE), 1);
    const currentPage = Math.min(page, totalPages);
    const paginatedQuestions = useMemo(() => {
        const pageStart = (currentPage - 1) * QUESTIONS_PER_PAGE;
        return filteredQuestions.slice(pageStart, pageStart + QUESTIONS_PER_PAGE);
    }, [currentPage, filteredQuestions]);

    useEffect(() => {
        setPage(1);
    }, [deferredSearchQuery, sortMode, questions.length]);

    const loadData = async () => {
        setLoading(true);

        try {
            const [subjectData, questionData] = await Promise.all([
                api('/curator/subjects', { token }),
                api(`/curator/subjects/${subjectId}/questions`, { token }),
            ]);
            setSubjects(subjectData);
            setQuestions(questionData);
            setError('');
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [subjectId, token]);

    const deleteQuestion = async (questionId) => {
        const confirmed = await confirm({
            title: text.deleteQuestion,
            message: text.deleteQuestionConfirm,
            confirmText: text.deleteQuestion,
            tone: 'danger',
        });

        if (!confirmed) {
            return;
        }

        try {
            await api(`/curator/subjects/${subjectId}/questions/${questionId}`, {
                method: 'DELETE',
                token,
            });

            setQuestions((previous) => previous.filter((question) => question.id !== questionId));
            setSubjects((previous) =>
                previous.map((subject) =>
                    String(subject.id) === String(subjectId)
                        ? { ...subject, questions_count: Math.max((subject.questions_count ?? 1) - 1, 0) }
                        : subject,
                ),
            );
            setError('');
            showNotification({ type: 'success', message: text.questionDeleted });
        } catch (error) {
            setError(error.message);
        }
    };

    if (loading) {
        return (
            <section className={ui.card}>
                <p className="text-sm text-slate-600">{t('common.loading')}</p>
            </section>
        );
    }

    if (!selectedSubject) {
        return (
            <section className={ui.card}>
                <p className="text-sm text-slate-600">{text.subjectNotFound}</p>
                <div className="mt-4">
                    <Link className={ui.secondaryButton} to="/curator">
                        {text.backToSubjects}
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section className="grid gap-5">
            <div className={ui.card}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-xl font-bold">{selectedSubject.display_name ?? selectedSubject.name}</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            {text.olympiadLabel}: {selectedSubject.olympiad?.title ?? '-'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link className={ui.secondaryButton} to="/curator">
                            {text.backToSubjects}
                        </Link>
                        <Link className={ui.primaryButton} data-testid="curator-create-question-link" to={`/curator/subjects/${subjectId}/questions/new`}>
                            {text.createQuestion}
                        </Link>
                    </div>
                </div>
            </div>

            <section className={ui.card}>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold">{text.questionsList}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                            {t('common.totalQuestions')}: {filteredQuestions.length}
                        </p>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                    <input
                        className={ui.input}
                        data-testid="curator-question-search"
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                    <label className="grid gap-1 text-sm font-semibold text-slate-700">
                        <span>{sortLabel}</span>
                        <select className={ui.input} data-testid="curator-question-sort" value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                            {sortOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {questions.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-600">{text.noQuestions}</p>
                ) : filteredQuestions.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-600">{noMatchesText}</p>
                ) : (
                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-y-2">
                            <thead>
                                <tr className="text-left text-sm text-slate-500">
                                    <th className="px-3 py-2">#</th>
                                    <th className="px-3 py-2">{text.question}</th>
                                    <th className="px-3 py-2">{text.answers}</th>
                                    <th className="px-3 py-2">{text.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedQuestions.map((question, index) => (
                                    <tr key={question.id} data-testid={`curator-question-${question.id}`} className="rounded-2xl bg-slate-50 align-top">
                                        <td className="rounded-l-2xl px-3 py-3 text-sm text-slate-600">{(currentPage - 1) * QUESTIONS_PER_PAGE + index + 1}</td>
                                        <td className="px-3 py-3 text-sm font-medium text-slate-900">
                                            <RichContent content={question.text} />
                                        </td>
                                        <td className="px-3 py-3 text-sm text-slate-700">
                                            <div className="grid gap-2">
                                                {question.options?.map((option) => (
                                                    <div
                                                        key={option.id}
                                                        className={[
                                                            'rounded-xl border px-3 py-2',
                                                            option.is_correct ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white',
                                                        ].join(' ')}
                                                    >
                                                        <RichContent content={option.text} />
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="rounded-r-2xl px-3 py-3">
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    className={ui.secondaryButton}
                                                    data-testid={`curator-edit-question-${question.id}`}
                                                    onClick={() => navigate(`/curator/subjects/${subjectId}/questions/${question.id}/edit`)}
                                                >
                                                    {text.editQuestion}
                                                </button>
                                                <button
                                                    className={ui.secondaryButton}
                                                    data-testid={`curator-delete-question-${question.id}`}
                                                    onClick={() => deleteQuestion(question.id)}
                                                >
                                                    {text.deleteQuestion}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                <div className="text-sm text-slate-600" data-testid="curator-question-page-label">
                                    {pageLabel}: {currentPage} / {totalPages}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        className={ui.secondaryButton}
                                        data-testid="curator-question-page-prev"
                                        disabled={currentPage <= 1}
                                        onClick={() => setPage((previous) => Math.max(previous - 1, 1))}
                                    >
                                        {previousPageText}
                                    </button>
                                    <button
                                        className={ui.secondaryButton}
                                        data-testid="curator-question-page-next"
                                        disabled={currentPage >= totalPages}
                                        onClick={() => setPage((previous) => Math.min(previous + 1, totalPages))}
                                    >
                                        {nextPageText}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </section>
    );
}
