import React, { useEffect, useMemo, useState } from 'react';
import { ui } from '../constants/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export function StudentPage() {
    const { token, setError } = useAuth();
    const [olympiads, setOlympiads] = useState([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [attempt, setAttempt] = useState(null);
    const [answers, setAnswers] = useState({});
    const [resultOlympiadId, setResultOlympiadId] = useState('');
    const [results, setResults] = useState(null);

    const subjectMap = useMemo(() => {
        const entries = [];
        olympiads.forEach((olympiad) =>
            olympiad.subjects?.forEach((subject) =>
                entries.push([String(subject.id), { ...subject, olympiad_id: olympiad.id }]),
            ),
        );
        return new Map(entries);
    }, [olympiads]);

    useEffect(() => {
        api('/student/olympiads', { token })
            .then(setOlympiads)
            .catch((error) => setError(error.message));
    }, [token, setError]);

    const enroll = async (olympiadId) => {
        try {
            await api('/auth/enroll', { method: 'POST', token, body: { olympiad_id: olympiadId } });
            setError('');
            alert('Enrolled successfully');
        } catch (error) {
            setError(error.message);
        }
    };

    const startStage = async () => {
        if (!selectedSubjectId) {
            return;
        }

        try {
            const data = await api(`/student/subjects/${selectedSubjectId}/stage-one/start`, {
                method: 'POST',
                token,
            });
            setAttempt(data);
            setAnswers({});
            setError('');
        } catch (error) {
            setError(error.message);
        }
    };

    const submitStage = async () => {
        if (!selectedSubjectId || !attempt) {
            return;
        }

        const payload = {
            answers: attempt.questions.map((question) => ({
                question_id: question.question_id,
                option_id: answers[question.question_id] ? Number(answers[question.question_id]) : null,
            })),
        };

        try {
            const data = await api(`/student/subjects/${selectedSubjectId}/stage-one/submit`, {
                method: 'POST',
                token,
                body: payload,
            });
            alert(`Score: ${data.score_percent}%. Passed: ${data.is_passed ? 'Yes' : 'No'}`);
            setAttempt(null);
            setError('');
        } catch (error) {
            setError(error.message);
        }
    };

    const fetchResults = async () => {
        if (!resultOlympiadId) {
            return;
        }

        try {
            const data = await api(`/student/olympiads/${resultOlympiadId}/results`, { token });
            setResults(data);
            setError('');
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <section className={ui.card}>
            <h2 className="text-xl font-bold">Student Panel</h2>

            <h3 className="mt-4 mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">Available Olympiads</h3>
            <div className="grid gap-3 md:grid-cols-2">
                {olympiads.map((olympiad) => (
                    <div key={olympiad.id} className={ui.block}>
                        <p className="font-semibold text-slate-900">{olympiad.title}</p>
                        <p className="mt-1 text-sm text-slate-600">
                            Registration: {olympiad.registration_open ? 'Open' : 'Closed'}
                        </p>
                        <button className={`${ui.primaryButton} mt-3`} onClick={() => enroll(olympiad.id)}>
                            Enroll
                        </button>
                    </div>
                ))}
            </div>

            <h3 className="mt-6 mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">Stage 1 Test</h3>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <select className={ui.input} value={selectedSubjectId} onChange={(event) => setSelectedSubjectId(event.target.value)}>
                    <option value="">Select subject</option>
                    {[...subjectMap.values()].map((subject) => (
                        <option key={subject.id} value={subject.id}>{`${subject.name} (Olympiad #${subject.olympiad_id})`}</option>
                    ))}
                </select>
                <button className={ui.primaryButton} onClick={startStage}>
                    Start Stage 1
                </button>
            </div>

            {attempt && (
                <div className="mt-4 grid gap-3">
                    {attempt.questions.map((question, index) => (
                        <div key={question.question_id} className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="font-semibold text-slate-900">{`${index + 1}. ${question.text}`}</p>
                            <div className="mt-2 grid gap-2">
                                {question.options.map((option) => (
                                    <label key={option.id} className="flex items-center gap-2 text-sm text-slate-700">
                                        <input
                                            type="radio"
                                            name={`q-${question.question_id}`}
                                            value={option.id}
                                            checked={String(answers[question.question_id] || '') === String(option.id)}
                                            onChange={(event) =>
                                                setAnswers((previous) => ({ ...previous, [question.question_id]: event.target.value }))
                                            }
                                        />
                                        {option.text}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                    <button className={ui.primaryButton} onClick={submitStage}>
                        Submit Stage 1
                    </button>
                </div>
            )}

            <h3 className="mt-6 mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">Results</h3>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <select className={ui.input} value={resultOlympiadId} onChange={(event) => setResultOlympiadId(event.target.value)}>
                    <option value="">Select olympiad</option>
                    {olympiads.map((olympiad) => (
                        <option key={olympiad.id} value={olympiad.id}>
                            {olympiad.title}
                        </option>
                    ))}
                </select>
                <button className={ui.secondaryButton} onClick={fetchResults}>
                    Get results
                </button>
            </div>

            {results && (
                <div className={`${ui.block} mt-3`}>
                    <p className="text-sm font-semibold text-slate-700">Status: {results.registration_status}</p>
                    <div className="mt-2 grid gap-1 text-sm text-slate-700">
                        {results.subjects.map((subject) => (
                            <p key={subject.subject_id}>
                                {subject.subject_name}: stage1={subject.stage1_score_percent ?? '-'}%, stage2={subject.stage2_score_percent ?? '-'}%, total={subject.subject_total_score ?? '-'}%
                            </p>
                        ))}
                    </div>
                    <p className="mt-3 text-base font-extrabold text-slate-900">Overall score: {results.overall_score ?? '-'}%</p>
                </div>
            )}
        </section>
    );
}
