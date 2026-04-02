import React from 'react';
import { PROFILE_SUBJECTS, TEST_LANGUAGES } from '../../constants/registration';
import { ui } from '../../constants/ui';
import { formatDate } from './adminOlympiadUtils';
import { StatusPill } from './AdminUi';

export function AdminParticipantsTab({
    text,
    t,
    locale,
    proctoringText,
    filteredParticipants,
    participantSearch,
    setParticipantSearch,
    languageFilter,
    setLanguageFilter,
    profileFilter,
    setProfileFilter,
    statusFilter,
    setStatusFilter,
    exportParticipantsCsv,
    languageLabel,
    profileLabel,
    statusLabel,
    openProctoringViewer,
}) {
    return (
        <section className={ui.card}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="text-lg font-bold">{text.participants}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                        {text.participantCount}: {filteredParticipants.length}
                    </p>
                </div>
                <button className={ui.secondaryButton} onClick={exportParticipantsCsv}>
                    {text.exportCsv}
                </button>
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-2 xl:col-span-4">
                    <label className="text-sm font-semibold text-slate-700">{text.filters}</label>
                    <input
                        className={ui.input}
                        value={participantSearch}
                        placeholder={text.searchPlaceholder}
                        onChange={(event) => setParticipantSearch(event.target.value)}
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-700">{text.language}</label>
                    <select className={ui.input} value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
                        <option value="all">{text.all}</option>
                        {TEST_LANGUAGES.map((language) => (
                            <option key={language.value} value={language.value}>
                                {t(language.labelKey)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-700">{text.profile}</label>
                    <select className={ui.input} value={profileFilter} onChange={(event) => setProfileFilter(event.target.value)}>
                        <option value="all">{text.all}</option>
                        {PROFILE_SUBJECTS.map((profile) => (
                            <option key={profile.value} value={profile.value}>
                                {t(profile.labelKey)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-700">{text.status}</label>
                    <select className={ui.input} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                        <option value="all">{text.all}</option>
                        {['registered', 'stage2', 'eliminated', 'completed'].map((status) => (
                            <option key={status} value={status}>
                                {statusLabel(status)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {filteredParticipants.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">{text.noParticipants}</p>
            ) : (
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-slate-200 text-slate-500">
                            <tr>
                                <th className="px-3 py-2 font-semibold">{text.participantName}</th>
                                <th className="px-3 py-2 font-semibold">{text.email}</th>
                                <th className="px-3 py-2 font-semibold">{text.phone}</th>
                                <th className="px-3 py-2 font-semibold">{text.language}</th>
                                <th className="px-3 py-2 font-semibold">{text.profile}</th>
                                <th className="px-3 py-2 font-semibold">{text.location}</th>
                                <th className="px-3 py-2 font-semibold">{text.school}</th>
                                <th className="px-3 py-2 font-semibold">{text.status}</th>
                                <th className="px-3 py-2 font-semibold">{text.stage1Passed}</th>
                                <th className="px-3 py-2 font-semibold">{text.overallScore}</th>
                                <th className="px-3 py-2 font-semibold">{text.registeredAt}</th>
                                <th className="px-3 py-2 font-semibold">{proctoringText.title}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredParticipants.map((participant) => (
                                <tr key={participant.registration_id} className="border-b border-slate-100 align-top">
                                    <td className="px-3 py-3 font-semibold text-slate-900">{participant.user.name}</td>
                                    <td className="px-3 py-3 text-slate-600">{participant.user.email}</td>
                                    <td className="px-3 py-3 text-slate-600">{participant.user.phone}</td>
                                    <td className="px-3 py-3 text-slate-600">{languageLabel(participant.user.test_language)}</td>
                                    <td className="px-3 py-3 text-slate-600">{profileLabel(participant.user.profile_subjects)}</td>
                                    <td className="px-3 py-3 text-slate-600">
                                        {participant.user.region} / {participant.user.city}
                                    </td>
                                    <td className="px-3 py-3 text-slate-600">{participant.user.school}</td>
                                    <td className="px-3 py-3">
                                        <StatusPill tone={participant.current_status === 'eliminated' ? 'danger' : 'info'}>
                                            {statusLabel(participant.current_status)}
                                        </StatusPill>
                                    </td>
                                    <td className="px-3 py-3 text-slate-600">{participant.passed_stage1_count}</td>
                                    <td className="px-3 py-3 text-slate-600">{participant.overall_score ?? '-'}</td>
                                    <td className="px-3 py-3 text-slate-600">{formatDate(participant.registered_at, locale)}</td>
                                    <td className="px-3 py-3">
                                        <button
                                            className={ui.secondaryButton}
                                            disabled={!participant.has_proctoring}
                                            onClick={() => openProctoringViewer(participant)}
                                            type="button"
                                        >
                                            {participant.has_proctoring
                                                ? `${proctoringText.open} (${participant.proctoring_sessions_count})`
                                                : proctoringText.emptyShort}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
