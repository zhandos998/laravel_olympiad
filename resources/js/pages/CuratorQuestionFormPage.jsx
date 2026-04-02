import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RichContent } from '../components/common/RichContent';
import { RichTextEditor } from '../components/common/RichTextEditor';
import { buildEmptyOptions, buildEmptyQuestionForm, curatorCopy } from '../components/curator/curatorShared';
import { ui } from '../constants/ui';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../lib/api';

const CURATOR_IMAGE_UPLOAD_URL = '/api/curator/question-images';

export function CuratorQuestionFormPage() {
    const { token, setError } = useAuth();
    const { locale, t } = useLocale();
    const { showNotification } = useNotification();
    const { subjectId, questionId } = useParams();
    const navigate = useNavigate();
    const text = curatorCopy[locale] ?? curatorCopy.rus;
    const isEditing = Boolean(questionId);

    const [subjects, setSubjects] = useState([]);
    const [questionForm, setQuestionForm] = useState(buildEmptyQuestionForm);
    const [editorInitialContent, setEditorInitialContent] = useState({
        text: '',
        options: buildEmptyOptions().map((option) => option.text),
    });
    const [editorVersion, setEditorVersion] = useState(0);
    const [loading, setLoading] = useState(true);

    const selectedSubject = useMemo(
        () => subjects.find((subject) => String(subject.id) === String(subjectId)) ?? null,
        [subjects, subjectId],
    );

    useEffect(() => {
        async function loadData() {
            setLoading(true);

            try {
                const subjectData = await api('/curator/subjects', { token });
                setSubjects(subjectData);

                if (isEditing) {
                    const question = await api(`/curator/subjects/${subjectId}/questions/${questionId}`, { token });
                    const nextForm = {
                        text: question.text ?? '',
                        explanation: '',
                        options:
                            question.options?.map((option) => ({
                                text: option.text,
                                is_correct: Boolean(option.is_correct),
                            })) ?? buildEmptyOptions(),
                    };
                    setQuestionForm(nextForm);
                    setEditorInitialContent({
                        text: nextForm.text,
                        options: nextForm.options.map((option) => option.text),
                    });
                } else {
                    const nextForm = buildEmptyQuestionForm();
                    setQuestionForm(nextForm);
                    setEditorInitialContent({
                        text: nextForm.text,
                        options: nextForm.options.map((option) => option.text),
                    });
                }
                setEditorVersion((previous) => previous + 1);

                setError('');
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [isEditing, questionId, subjectId, token]);

    const updateOptionText = (index, value) => {
        setQuestionForm((previous) => {
            const nextOptions = [...previous.options];
            nextOptions[index] = { ...nextOptions[index], text: value };

            return { ...previous, options: nextOptions };
        });
    };

    const markCorrectOption = (index) => {
        setQuestionForm((previous) => ({
            ...previous,
            options: previous.options.map((option, itemIndex) => ({
                ...option,
                is_correct: itemIndex === index,
            })),
        }));
    };

    const currentEditorContent = (editorId, fallbackValue) => {
        if (typeof window === 'undefined' || !window.tinymce?.get(editorId)) {
            return fallbackValue;
        }

        return window.tinymce.get(editorId).getContent();
    };

    const saveQuestion = async ({ createAnother = false } = {}) => {
        const payload = {
            ...questionForm,
            text: currentEditorContent('curator-question-text-editor', questionForm.text),
            explanation: '',
            options: questionForm.options.map((option, index) => ({
                ...option,
                text: currentEditorContent(`curator-question-option-editor-${index}`, option.text),
            })),
        };

        try {
            await api(
                isEditing
                    ? `/curator/subjects/${subjectId}/questions/${questionId}`
                    : `/curator/subjects/${subjectId}/questions`,
                {
                    method: isEditing ? 'PUT' : 'POST',
                    token,
                    body: payload,
                },
            );

            setError('');
            showNotification({ type: 'success', message: isEditing ? text.questionUpdated : text.questionCreated });

            if (!isEditing && createAnother) {
                const nextForm = buildEmptyQuestionForm();
                setQuestionForm(nextForm);
                setEditorInitialContent({
                    text: nextForm.text,
                    options: nextForm.options.map((option) => option.text),
                });
                setEditorVersion((previous) => previous + 1);
                return;
            }

            navigate(`/curator/subjects/${subjectId}/questions`);
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
                        <h2 className="text-xl font-bold">{isEditing ? text.editQuestionTitle : text.createQuestionTitle}</h2>
                        <p className="mt-1 text-sm text-slate-600">{`${selectedSubject.display_name ?? selectedSubject.name} - ${text.olympiadLabel}: ${selectedSubject.olympiad?.title ?? '-'}`}</p>
                    </div>

                    <Link className={ui.secondaryButton} to={`/curator/subjects/${subjectId}/questions`}>
                        {text.backToSubjects}
                    </Link>
                </div>
            </div>

            <section className={ui.card}>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-semibold text-slate-700">{t('common.questionText')}</label>
                        <div data-testid="curator-question-text">
                            <RichTextEditor
                                key={`curator-question-text-editor-${editorVersion}`}
                                id="curator-question-text-editor"
                                value={editorInitialContent.text}
                                onChange={(nextValue) => setQuestionForm((previous) => ({ ...previous, text: nextValue }))}
                                imageUploadUrl={CURATOR_IMAGE_UPLOAD_URL}
                                authToken={token}
                            />
                        </div>
                        <p className="text-xs text-slate-500">{text.formattingHelp}</p>
                    </div>

                    <div className="grid gap-3">
                        <p className="text-sm font-semibold text-slate-700">{text.answerOptions}</p>

                        {questionForm.options.map((option, index) => (
                            <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="grid gap-2">
                                    <label className="text-sm font-semibold text-slate-700">{`${t('curator.option')} ${index + 1}`}</label>
                                    <RichTextEditor
                                        key={`curator-question-option-editor-${editorVersion}-${index}`}
                                        id={`curator-question-option-editor-${index}`}
                                        value={editorInitialContent.options[index] ?? ''}
                                        onChange={(nextValue) => updateOptionText(index, nextValue)}
                                        height={180}
                                        imageUploadUrl={CURATOR_IMAGE_UPLOAD_URL}
                                        authToken={token}
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <input type="radio" name="correct-option" checked={option.is_correct} onChange={() => markCorrectOption(index)} />
                                    {text.correctAnswer}
                                </label>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-700">{text.preview}</p>
                        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
                            <RichContent content={questionForm.text} />
                        </div>
                        <div className="grid gap-2">
                            {questionForm.options.map((option, index) => (
                                <div
                                    key={`preview-option-${index}`}
                                    className={[
                                        'rounded-xl border px-3 py-3',
                                        option.is_correct ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white',
                                    ].join(' ')}
                                >
                                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{`${t('curator.option')} ${index + 1}`}</div>
                                    <RichContent content={option.text} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                        <Link className={ui.secondaryButton} to={`/curator/subjects/${subjectId}/questions`}>
                            {text.cancelEdit}
                        </Link>
                        {!isEditing && (
                            <button className={ui.secondaryButton} data-testid="curator-save-and-new-question" onClick={() => saveQuestion({ createAnother: true })}>
                                {text.saveAndCreateAnother}
                            </button>
                        )}
                        <button className={ui.primaryButton} data-testid="curator-save-question" onClick={() => saveQuestion()}>
                            {text.saveQuestion}
                        </button>
                    </div>
                </div>
            </section>
        </section>
    );
}
