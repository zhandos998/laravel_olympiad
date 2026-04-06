import React from 'react';

export function StatusPill({ tone, children }) {
    const toneMap = {
        success: 'border-[#bfd0f4] bg-[#f7f9ff] text-[#355da8]',
        warning: 'border-[#d7e3fb] bg-[#eef3ff] text-[#355da8]',
        danger: 'border-[#355da8] bg-[#eef3ff] text-[#355da8]',
        info: 'border-[#d7e3fb] bg-white text-[#355da8]',
        slate: 'border-[#d7e3fb] bg-white text-[#355da8]',
    };

    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneMap[tone]}`}>{children}</span>;
}

export function SummaryCard({ label, value }) {
    return (
        <div className="rounded-2xl border border-[#d7e3fb] bg-white p-4 shadow-[0_18px_40px_-30px_rgba(53,93,168,0.26)]">
            <p className="text-sm font-medium text-[#6e84b5]">{label}</p>
            <p className="mt-2 text-2xl font-bold text-[#27498c]">{value}</p>
        </div>
    );
}
