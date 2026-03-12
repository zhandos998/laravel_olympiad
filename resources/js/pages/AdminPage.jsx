import React, { useEffect, useState } from 'react';
import { ui } from '../constants/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export function AdminPage() {
    const { token, setError } = useAuth();
    const [olympiads, setOlympiads] = useState([]);
    const [title, setTitle] = useState('');

    const loadOlympiads = () => {
        api('/admin/olympiads', { token })
            .then(setOlympiads)
            .catch((error) => setError(error.message));
    };

    useEffect(loadOlympiads, [token, setError]);

    const createOlympiad = async () => {
        try {
            await api('/admin/olympiads', {
                method: 'POST',
                token,
                body: { title },
            });
            setTitle('');
            loadOlympiads();
            setError('');
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
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <section className={ui.card}>
            <h2 className="text-xl font-bold">Admin Panel</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                <input className={ui.input} value={title} placeholder="Olympiad title" onChange={(event) => setTitle(event.target.value)} />
                <button className={ui.primaryButton} onClick={createOlympiad}>
                    Create Olympiad
                </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
                {olympiads.map((olympiad) => (
                    <div key={olympiad.id} className={ui.block}>
                        <p className="font-semibold text-slate-900">{olympiad.title}</p>
                        <p className="mt-1 text-sm text-slate-600">
                            Stage 1 questions: {olympiad.stage1_question_count} | pass threshold: {olympiad.stage1_pass_percent}%
                        </p>
                        <button
                            className={`${ui.secondaryButton} mt-3`}
                            onClick={() => toggleRegistration(olympiad.id, olympiad.registration_open)}
                        >
                            Registration: {olympiad.registration_open ? 'Close' : 'Open'}
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}
