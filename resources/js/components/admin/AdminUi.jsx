import React from 'react';

export function StatusPill({ tone, children }) {
    const toneMap = {
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        warning: 'border-amber-200 bg-amber-50 text-amber-700',
        danger: 'border-rose-200 bg-rose-50 text-rose-700',
        info: 'border-sky-200 bg-sky-50 text-sky-700',
        slate: 'border-slate-200 bg-slate-50 text-slate-700',
    };

    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneMap[tone]}`}>{children}</span>;
}

export function SummaryCard({ label, value }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
    );
}
