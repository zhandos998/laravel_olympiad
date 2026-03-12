import React from 'react';

export function AppFooter() {
    return (
        <footer className="border-t border-slate-200 bg-white">
            <div className="container mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
                <p>University Olympiad Platform</p>
                <p>Stage 1 test + Stage 2 proctoring workflow</p>
            </div>
        </footer>
    );
}
