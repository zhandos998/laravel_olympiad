import React, { useState } from 'react';
import { PROFILE_SUBJECTS, TEST_LANGUAGES } from '../../constants/registration';
import { ui } from '../../constants/ui';
import { api } from '../../lib/api';

export function AuthForm({ onAuthSuccess, onError }) {
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        region: '',
        city: '',
        school: '',
        test_language: 'kaz',
        profile_subjects: PROFILE_SUBJECTS[0].value,
        password: '',
        password_confirmation: '',
    });

    const submit = async (event) => {
        event.preventDefault();
        onError('');

        try {
            const data = await api(mode === 'login' ? '/auth/login' : '/auth/register', {
                method: 'POST',
                body: form,
            });

            onAuthSuccess(data.token, data.user);
        } catch (error) {
            onError(error.message);
        }
    };

    return (
        <section className={`${ui.card} mx-auto w-full max-w-3xl`}>
            <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">{mode === 'login' ? 'Login' : 'Student Registration'}</h2>
                <p className="text-sm text-slate-600">Use your account to access olympiad testing.</p>
            </div>

            <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
                {mode === 'register' && (
                    <input
                        className={`${ui.input} md:col-span-2`}
                        placeholder="Full name"
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                    />
                )}

                <input
                    className={ui.input}
                    placeholder="Email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
                <input
                    className={ui.input}
                    type="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                />

                {mode === 'register' && (
                    <>
                        <input
                            className={ui.input}
                            placeholder="Phone"
                            value={form.phone}
                            onChange={(event) => setForm({ ...form, phone: event.target.value })}
                        />
                        <input
                            className={ui.input}
                            placeholder="Region"
                            value={form.region}
                            onChange={(event) => setForm({ ...form, region: event.target.value })}
                        />
                        <input
                            className={ui.input}
                            placeholder="City"
                            value={form.city}
                            onChange={(event) => setForm({ ...form, city: event.target.value })}
                        />
                        <input
                            className={ui.input}
                            placeholder="School"
                            value={form.school}
                            onChange={(event) => setForm({ ...form, school: event.target.value })}
                        />
                        <select
                            className={ui.input}
                            value={form.test_language}
                            onChange={(event) => setForm({ ...form, test_language: event.target.value })}
                        >
                            {TEST_LANGUAGES.map((item) => (
                                <option key={item.value} value={item.value}>
                                    Test language: {item.label}
                                </option>
                            ))}
                        </select>
                        <select
                            className={ui.input}
                            value={form.profile_subjects}
                            onChange={(event) => setForm({ ...form, profile_subjects: event.target.value })}
                        >
                            {PROFILE_SUBJECTS.map((item) => (
                                <option key={item.value} value={item.value}>
                                    Profile: {item.label}
                                </option>
                            ))}
                        </select>
                        <input
                            className={`${ui.input} md:col-span-2`}
                            type="password"
                            placeholder="Confirm Password"
                            value={form.password_confirmation}
                            onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })}
                        />
                    </>
                )}

                <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button className={ui.primaryButton} type="submit">
                        {mode === 'login' ? 'Login' : 'Create account'}
                    </button>
                    <button
                        className={ui.linkButton}
                        type="button"
                        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    >
                        {mode === 'login' ? 'No account? Register' : 'Have account? Login'}
                    </button>
                </div>
            </form>
        </section>
    );
}
