import React from 'react';
import { ui } from '../../constants/ui';
import { StatusPill } from './AdminUi';

export function AdminOlympiadSettings({ text, locale, t, olympiad, olympiadForm, setOlympiadForm, saveOlympiadSettings }) {
    const stageOneStartLabel = locale === 'kaz' ? '1 кезеңнің басталу күні' : 'Дата начала 1 тура';
    const stageOneEndLabel = locale === 'kaz' ? '1 кезеңнің аяқталу күні' : 'Дата окончания 1 тура';
    const stageTwoStartLabel = locale === 'kaz' ? '2 кезеңнің басталу күні' : 'Дата начала 2 тура';
    const stageTwoEndLabel = locale === 'kaz' ? '2 кезеңнің аяқталу күні' : 'Дата окончания 2 тура';
    const stageOneDatesTitle = locale === 'kaz' ? '1 кезең: тестілеу' : '1 тур: тестирование';
    const stageTwoDatesTitle = locale === 'kaz' ? '2 кезең' : '2 тур';
    const stageOneDurationLabel = locale === 'kaz' ? '1 кезең уақыты, минут' : 'Время 1 тура, минут';

    return (
        <section className={ui.card}>
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold">{text.settings}</h3>
                <StatusPill tone={olympiad.registration_open ? 'success' : 'warning'}>
                    {text.registrationOpen}: {olympiad.registration_open ? t('common.open') : t('common.closed')}
                </StatusPill>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">{text.olympiadTitle}</label>
                    <input
                        className={ui.input}
                        data-testid="settings-title-input"
                        value={olympiadForm.title}
                        onChange={(event) => setOlympiadForm((prev) => ({ ...prev, title: event.target.value }))}
                    />
                </div>

                <div className="grid gap-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">{text.description}</label>
                    <textarea
                        className={`${ui.input} min-h-28`}
                        value={olympiadForm.description}
                        onChange={(event) => setOlympiadForm((prev) => ({ ...prev, description: event.target.value }))}
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-700">{text.defaultQuestionCount}</label>
                    <input
                        className={ui.input}
                        type="number"
                        data-testid="settings-question-count-input"
                        min="1"
                        max="100"
                        value={olympiadForm.stage1_question_count}
                        onChange={(event) => setOlympiadForm((prev) => ({ ...prev, stage1_question_count: event.target.value }))}
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-semibold text-slate-700">{text.passPercent}</label>
                    <input
                        className={ui.input}
                        type="number"
                        data-testid="settings-pass-percent-input"
                        min="1"
                        max="100"
                        value={olympiadForm.stage1_pass_percent}
                        onChange={(event) => setOlympiadForm((prev) => ({ ...prev, stage1_pass_percent: event.target.value }))}
                    />
                </div>

                <div className="grid gap-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">{stageOneDurationLabel}</label>
                    <input
                        className={ui.input}
                        type="number"
                        min="1"
                        max="300"
                        value={olympiadForm.stage1_duration_minutes}
                        onChange={(event) => setOlympiadForm((prev) => ({ ...prev, stage1_duration_minutes: event.target.value }))}
                    />
                </div>

                <p className="text-xs text-slate-500 md:col-span-2">{text.defaultQuestionHelp}</p>

                <div className="grid gap-4 md:col-span-2">
                    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <p className="text-sm font-semibold text-slate-700">{stageOneDatesTitle}</p>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">{stageOneStartLabel}</label>
                            <input
                                className={ui.input}
                                type="datetime-local"
                                value={olympiadForm.stage1_starts_at}
                                onChange={(event) => setOlympiadForm((prev) => ({ ...prev, stage1_starts_at: event.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">{stageOneEndLabel}</label>
                            <input
                                className={ui.input}
                                type="datetime-local"
                                value={olympiadForm.stage1_ends_at}
                                onChange={(event) => setOlympiadForm((prev) => ({ ...prev, stage1_ends_at: event.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <p className="text-sm font-semibold text-slate-700">{stageTwoDatesTitle}</p>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">{stageTwoStartLabel}</label>
                            <input
                                className={ui.input}
                                type="datetime-local"
                                value={olympiadForm.stage2_starts_at}
                                onChange={(event) => setOlympiadForm((prev) => ({ ...prev, stage2_starts_at: event.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-semibold text-slate-700">{stageTwoEndLabel}</label>
                            <input
                                className={ui.input}
                                type="datetime-local"
                                value={olympiadForm.stage2_ends_at}
                                onChange={(event) => setOlympiadForm((prev) => ({ ...prev, stage2_ends_at: event.target.value }))}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-5">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                        type="checkbox"
                        checked={olympiadForm.registration_open}
                        onChange={(event) => setOlympiadForm((prev) => ({ ...prev, registration_open: event.target.checked }))}
                    />
                    {text.registrationOpen}
                </label>

                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                        type="checkbox"
                        checked={olympiadForm.is_active}
                        onChange={(event) => setOlympiadForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                    />
                    {text.olympiadActive}
                </label>
            </div>

            <div className="mt-5 flex justify-end">
                <button className={ui.primaryButton} data-testid="save-olympiad-settings" onClick={saveOlympiadSettings}>
                    {text.saveOlympiad}
                </button>
            </div>
        </section>
    );
}
