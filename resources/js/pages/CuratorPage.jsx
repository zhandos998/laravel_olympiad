import React, { useState } from 'react';
import { ui } from '../constants/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

function buildEmptyOptions() {
    return [
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
    ];
}

export function CuratorPage() {
    const { token, setError } = useAuth();
    const [subjectId, setSubjectId] = useState('');
    const [questions, setQuestions] = useState([]);
    const [text, setText] = useState('');
    const [options, setOptions] = useState(buildEmptyOptions);

    const loadQuestions = async () => {
        if (!subjectId) {
            return;
        }

        try {
            const data = await api(`/curator/subjects/${subjectId}/questions`, { token });
            setQuestions(data);
            setError('');
        } catch (error) {
            setError(error.message);
        }
    };

    const createQuestion = async () => {
        try {
            await api(`/curator/subjects/${subjectId}/questions`, {
                method: 'POST',
                token,
                body: { text, options },
            });
            setText('');
            setOptions(buildEmptyOptions());
            loadQuestions();
            setError('');
        } catch (error) {
            setError(error.message);
        }
    };

    const updateOptionText = (index, value) => {
        setOptions((previous) => {
            const nextOptions = [...previous];
            nextOptions[index].text = value;
            return nextOptions;
        });
    };

    const markCorrectOption = (index) => {
        setOptions((previous) => previous.map((option, itemIndex) => ({ ...option, is_correct: itemIndex === index })));
    };

    return (
        <section className={ui.card}>
            <h2 className="text-xl font-bold">Curator Panel</h2>
            <p className="mt-1 text-sm text-slate-600">Enter subject ID assigned by admin</p>

            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                <input className={ui.input} value={subjectId} onChange={(event) => setSubjectId(event.target.value)} placeholder="Subject ID" />
                <button className={ui.secondaryButton} onClick={loadQuestions}>
                    Load Questions
                </button>
            </div>

            <div className="mt-4 grid gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">New Question (5 options)</h3>
                <input className={ui.input} value={text} onChange={(event) => setText(event.target.value)} placeholder="Question text" />

                {options.map((option, index) => (
                    <div key={index} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto] md:items-center">
                        <input
                            className={ui.input}
                            value={option.text}
                            onChange={(event) => updateOptionText(index, event.target.value)}
                            placeholder={`Option ${index + 1}`}
                        />
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <input
                                type="radio"
                                name="correct-option"
                                checked={option.is_correct}
                                onChange={() => markCorrectOption(index)}
                            />
                            correct
                        </label>
                    </div>
                ))}

                <button className={ui.primaryButton} onClick={createQuestion}>
                    Add question
                </button>
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-700">Total questions: {questions.length}</p>
        </section>
    );
}
