import React from 'react';
import { ui } from '../../constants/ui';
import { StatusPill } from './AdminUi';

export function AdminResultsTab({ text, subjects, filteredParticipants, exportResultsCsv, statusLabel }) {
    return (
        <section className={ui.card}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="text-lg font-bold">{text.results}</h3>
                <button className={ui.secondaryButton} onClick={exportResultsCsv}>
                    {text.exportCsv}
                </button>
            </div>

            {filteredParticipants.length === 0 ? (
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
                            {filteredParticipants.map((participant) => (
                                <tr key={participant.registration_id} className="border-b border-slate-100 align-top">
                                    <td className="px-3 py-3 font-semibold text-slate-900">{participant.user.name}</td>
                                    <td className="px-3 py-3">
                                        <StatusPill tone={participant.current_status === 'eliminated' ? 'danger' : 'info'}>
                                            {statusLabel(participant.current_status)}
                                        </StatusPill>
                                    </td>
                                    {participant.subject_results.map((result) => (
                                        <td key={result.subject_id} className="px-3 py-3 text-slate-600">
                                            <div className="grid gap-1">
                                                <span>
                                                    {text.stageOne}: {result.stage1_score_percent ?? '-'}%
                                                </span>
                                                <span>
                                                    {text.stageTwo}: {result.stage2_score_percent ?? '-'}%
                                                </span>
                                                <span className="font-semibold text-slate-900">
                                                    {text.total}: {result.subject_total_score ?? '-'}%
                                                </span>
                                            </div>
                                        </td>
                                    ))}
                                    <td className="px-3 py-3 text-base font-bold text-slate-900">{participant.overall_score ?? '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
