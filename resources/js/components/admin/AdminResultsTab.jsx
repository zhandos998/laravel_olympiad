import React, { useMemo, useState } from 'react';
import { ui } from '../../constants/ui';
import { StatusPill } from './AdminUi';

function toSortableScore(value) {
    if (value === null || value === undefined || value === '') {
        return -1;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : -1;
}

export function AdminResultsTab({ text, subjects, participants, exportResultsCsv, statusLabel }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('overall_desc');

    const visibleParticipants = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const collator = new Intl.Collator('ru', { sensitivity: 'base' });

        return [...participants]
            .filter((participant) => {
                const haystack = [participant.user.name, participant.user.email, participant.user.phone, participant.user.school, participant.user.city, participant.user.region]
                    .join(' ')
                    .toLowerCase();
                const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
                const matchesStatus = statusFilter === 'all' || participant.current_status === statusFilter;

                return matchesSearch && matchesStatus;
            })
            .sort((left, right) => {
                if (sortBy === 'name_asc') {
                    return collator.compare(left.user.name, right.user.name);
                }

                if (sortBy === 'name_desc') {
                    return collator.compare(right.user.name, left.user.name);
                }

                if (sortBy === 'overall_asc') {
                    return toSortableScore(left.overall_score) - toSortableScore(right.overall_score);
                }

                return toSortableScore(right.overall_score) - toSortableScore(left.overall_score);
            });
    }, [participants, search, sortBy, statusFilter]);

    return (
        <section className={ui.card}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="text-lg font-bold">{text.results}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                        {text.participantCount}: {visibleParticipants.length}
                    </p>
                </div>
                <button className={ui.secondaryButton} onClick={() => exportResultsCsv(visibleParticipants)} type="button">
                    {text.exportCsv}
                </button>
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-2 xl:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">{text.filters}</label>
                    <input
                        className={ui.input}
                        data-testid="results-search-input"
                        value={search}
                        placeholder={text.resultsSearchPlaceholder}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-700">{text.status}</label>
                    <select
                        className={ui.input}
                        data-testid="results-status-filter"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                    >
                        <option value="all">{text.all}</option>
                        {['registered', 'stage2', 'eliminated', 'completed'].map((status) => (
                            <option key={status} value={status}>
                                {statusLabel(status)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-700">{text.sortBy}</label>
                    <select className={ui.input} data-testid="results-sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                        <option value="overall_desc">{text.sortByOverallDesc}</option>
                        <option value="overall_asc">{text.sortByOverallAsc}</option>
                        <option value="name_asc">{text.sortByNameAsc}</option>
                        <option value="name_desc">{text.sortByNameDesc}</option>
                    </select>
                </div>
            </div>

            {visibleParticipants.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">{text.noResults}</p>
            ) : (
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-slate-200 text-slate-500">
                            <tr>
                                <th className="px-3 py-2 font-semibold">{text.participantName}</th>
                                <th className="px-3 py-2 font-semibold">{text.status}</th>
                                {subjects.map((subject) => (
                                    <th key={subject.id} className="px-3 py-2 font-semibold">
                                        {subject.display_name ?? subject.name}
                                    </th>
                                ))}
                                <th className="px-3 py-2 font-semibold">{text.overallScore}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleParticipants.map((participant) => {
                                const resultMap = new Map(participant.subject_results.map((result) => [result.subject_id, result]));

                                return (
                                    <tr key={participant.registration_id} className="border-b border-slate-100 align-top">
                                        <td className="px-3 py-3 font-semibold text-slate-900">{participant.user.name}</td>
                                        <td className="px-3 py-3">
                                            <StatusPill tone={participant.current_status === 'eliminated' ? 'danger' : 'info'}>
                                                {statusLabel(participant.current_status)}
                                            </StatusPill>
                                        </td>
                                        {subjects.map((subject) => {
                                            const result = resultMap.get(subject.id);

                                            return (
                                                <td key={subject.id} className="px-3 py-3 text-slate-600">
                                                    <div className="grid gap-1">
                                                        <span>
                                                            {text.stageOne}: {result?.stage1_score_percent ?? '-'}%
                                                        </span>
                                                        <span>
                                                            {text.stageTwo}: {result?.stage2_score_percent ?? '-'}%
                                                        </span>
                                                        <span className="font-semibold text-slate-900">
                                                            {text.total}: {result?.subject_total_score ?? '-'}%
                                                        </span>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="px-3 py-3 text-base font-bold text-slate-900">{participant.overall_score ?? '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
