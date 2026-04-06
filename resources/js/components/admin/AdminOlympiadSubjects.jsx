import React from 'react';
import { ui } from '../../constants/ui';
import { StatusPill } from './AdminUi';

export function AdminOlympiadSubjects({
    text,
    subjectName,
    setSubjectName,
    subjectLanguage,
    setSubjectLanguage,
    subjectQuestionCount,
    setSubjectQuestionCount,
    createSubject,
    subjects,
    subjectLanguages,
    setSubjectLanguages,
    subjectLanguageOptions,
    subjectQuestionCounts,
    setSubjectQuestionCounts,
    assignedUsers,
    setAssignedUsers,
    curators,
    saveSubject,
    archiveSubject,
}) {
    return (
        <section className={ui.card}>
            <h3 className="text-lg font-bold">{text.subjects}</h3>

            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_200px_220px_auto]">
                <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-700">{text.subjectName}</label>
                    <input
                        className={ui.input}
                        data-testid="subject-name-input"
                        value={subjectName}
                        placeholder={text.subjectName}
                        onChange={(event) => setSubjectName(event.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-700">{text.language}</label>
                    <select className={ui.input} value={subjectLanguage} onChange={(event) => setSubjectLanguage(event.target.value)}>
                        {subjectLanguageOptions.map((option) => (
                            <option key={option.value || 'none'} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-700">{text.questionCountLabel}</label>
                    <input
                        className={ui.input}
                        type="number"
                        data-testid="subject-question-count-input"
                        min="1"
                        max="100"
                        value={subjectQuestionCount}
                        onChange={(event) => setSubjectQuestionCount(event.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <span className="invisible text-sm font-semibold">action</span>
                    <button className={`w-full ${ui.primaryButton}`} data-testid="create-subject-button" onClick={createSubject}>
                        {text.addSubject}
                    </button>
                </div>
                <p className="text-xs text-slate-500 md:col-span-3">{text.questionCountHelp}</p>
            </div>

            <div className="mt-4 grid gap-3">
                {subjects.length === 0 ? (
                    <p className="text-sm text-slate-600">{text.noSubjects}</p>
                ) : (
                    subjects.map((subject) => (
                        <div key={subject.id} className="rounded-2xl border border-slate-200 bg-white p-4" data-testid={`subject-card-${subject.id}`}>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-semibold text-slate-900">{subject.display_name ?? subject.name}</p>
                                <StatusPill tone={subject.is_ready ? 'success' : 'warning'}>
                                    {subject.is_ready ? text.ready : text.notReady}
                                </StatusPill>
                            </div>

                            <div className="mt-2 grid gap-1 text-sm text-slate-600">
                                <p>
                                    {text.uploadedQuestions}: {subject.questions_count} / {subject.stage1_question_count}
                                </p>
                                <p>
                                    {text.assignedUser}: {subject.assigned_curator?.name ?? text.noAssignedUser}
                                </p>
                            </div>

                            {!subject.is_ready && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {subject.readiness_reasons.includes('missing_curator') && <StatusPill tone="danger">{text.missingCurator}</StatusPill>}
                                    {subject.readiness_reasons.includes('missing_questions') && (
                                        <StatusPill tone="danger">
                                            {text.missingQuestions}: {subject.question_gap}
                                        </StatusPill>
                                    )}
                                </div>
                            )}

                            <div className="mt-4 grid gap-4 md:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)_auto]">
                                <div className="grid gap-2">
                                    <p className="text-sm font-semibold text-slate-700">{text.language}</p>
                                    <select
                                        className={ui.input}
                                        value={subjectLanguages[subject.id] ?? ''}
                                        onChange={(event) =>
                                            setSubjectLanguages((previous) => ({
                                                ...previous,
                                                [subject.id]: event.target.value,
                                            }))
                                        }
                                    >
                                        {subjectLanguageOptions.map((option) => (
                                            <option key={`${subject.id}-${option.value || 'none'}`} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <p className="text-sm font-semibold text-slate-700">{text.questionCountLabel}</p>
                                    <input
                                        className={ui.input}
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={subjectQuestionCounts[subject.id] ?? ''}
                                        onChange={(event) =>
                                            setSubjectQuestionCounts((previous) => ({
                                                ...previous,
                                                [subject.id]: event.target.value,
                                            }))
                                        }
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <p className="text-sm font-semibold text-slate-700">{text.assignUser}</p>
                                    {curators.length > 0 ? (
                                        <select
                                            className={ui.input}
                                            value={assignedUsers[subject.id] ?? ''}
                                            onChange={(event) =>
                                                setAssignedUsers((previous) => ({
                                                    ...previous,
                                                    [subject.id]: event.target.value,
                                                }))
                                            }
                                        >
                                            <option value="">{text.selectUser}</option>
                                            {curators.map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name} ({user.email})
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-sm text-slate-600">{text.noCurators}</p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <span className="invisible text-sm font-semibold">action</span>
                                    <button className={ui.primaryButton} data-testid={`save-subject-${subject.id}`} onClick={() => saveSubject(subject.id)}>
                                        {text.saveSubject}
                                    </button>
                                </div>

                                <p className="text-xs text-slate-500 md:col-span-3">{text.questionCountHelp}</p>
                            </div>

                            <div className="mt-3 flex justify-end">
                                <button className={ui.secondaryButton} data-testid={`archive-subject-${subject.id}`} onClick={() => archiveSubject(subject.id)}>
                                    {text.archiveSubject}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
