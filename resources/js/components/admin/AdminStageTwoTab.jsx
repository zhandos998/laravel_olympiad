import React from 'react';
import { ui } from '../../constants/ui';
import { StatusPill } from './AdminUi';

export function AdminStageTwoTab({ text, stageTwoRows, stageTwoEdits, setStageTwoEdits, saveStageTwo, exportStageTwoCsv, statusLabel }) {
    return (
        <section className={ui.card}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="text-lg font-bold">{text.stageTwo}</h3>
                <button className={ui.secondaryButton} onClick={exportStageTwoCsv}>
                    {text.exportCsv}
                </button>
            </div>

            {stageTwoRows.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">{text.noStageTwo}</p>
            ) : (
                <div className="mt-4 grid gap-3">
                    {stageTwoRows.map((row) => {
                        const edit = stageTwoEdits[row.key] ?? {
                            status: row.stage2Status,
                            meeting_link: row.stage2MeetingLink,
                            score_percent: row.stage2Score === null || row.stage2Score === undefined ? '' : String(row.stage2Score),
                        };

                        return (
                            <div key={row.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-900">{row.participantName}</p>
                                        <p className="text-sm text-slate-600">
                                            {row.participantEmail} · {row.subjectName}
                                        </p>
                                    </div>
                                    <StatusPill tone="info">
                                        {text.stageOne}: {row.stage1Score ?? '-'}%
                                    </StatusPill>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                    <div className="grid gap-2">
                                        <label className="text-sm font-semibold text-slate-700">{text.stageTwoStatus}</label>
                                        <select
                                            className={ui.input}
                                            value={edit.status}
                                            onChange={(event) =>
                                                setStageTwoEdits((previous) => ({
                                                    ...previous,
                                                    [row.key]: {
                                                        ...edit,
                                                        status: event.target.value,
                                                    },
                                                }))
                                            }
                                        >
                                            {['scheduled', 'completed', 'absent'].map((status) => (
                                                <option key={status} value={status}>
                                                    {statusLabel(status)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid gap-2">
                                        <label className="text-sm font-semibold text-slate-700">{text.stageTwoScore}</label>
                                        <input
                                            className={ui.input}
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={edit.score_percent}
                                            onChange={(event) =>
                                                setStageTwoEdits((previous) => ({
                                                    ...previous,
                                                    [row.key]: {
                                                        ...edit,
                                                        score_percent: event.target.value,
                                                    },
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2 md:col-span-3">
                                        <label className="text-sm font-semibold text-slate-700">{text.meetingLink}</label>
                                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                                            <input
                                                className={ui.input}
                                                value={edit.meeting_link}
                                                onChange={(event) =>
                                                    setStageTwoEdits((previous) => ({
                                                        ...previous,
                                                        [row.key]: {
                                                            ...edit,
                                                            meeting_link: event.target.value,
                                                        },
                                                    }))
                                                }
                                            />
                                            <button className={ui.primaryButton} onClick={() => saveStageTwo(row)}>
                                                {text.saveStageTwo}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
