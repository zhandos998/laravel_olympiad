import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHero } from '../layout/PageHero';
import { ui } from '../../constants/ui';
import { SummaryCard } from './AdminUi';

export function AdminOlympiadPageFrame({ children, currentSection, headerContent = null, loaded, olympiad, olympiadId, summary, text }) {
    const navigate = useNavigate();
    const sectionLinks = [
        { key: 'overview', label: text.overview, to: `/admin/olympiads/${olympiadId}` },
        { key: 'settings', label: text.settings, to: `/admin/olympiads/${olympiadId}/settings` },
        { key: 'subjects', label: text.subjects, to: `/admin/olympiads/${olympiadId}/subjects` },
    ];

    if (loaded && !olympiad) {
        return (
            <section className={ui.card}>
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">{text.olympiadNotFound}</p>
                    <Link className={ui.secondaryButton} to="/admin">
                        {text.backToOlympiads}
                    </Link>
                </div>
            </section>
        );
    }

    if (!olympiad) {
        return (
            <section className={ui.card}>
                <p className="text-sm text-slate-600">{text.testingAdmin}...</p>
            </section>
        );
    }

    return (
        <section className="grid gap-5">
            <PageHero
                eyebrow={text.testingAdmin}
                title={olympiad.title}
                description={olympiad.description || text.testingAdmin}
                actions={
                    <>
                        <Link className={ui.secondaryButton} to="/admin">
                            {text.backToOlympiads}
                        </Link>
                        {sectionLinks.map((section) => (
                            <button
                                key={section.key}
                                aria-pressed={currentSection === section.key}
                                className={currentSection === section.key ? ui.primaryButton : ui.secondaryButton}
                                data-testid={`section-${section.key}`}
                                onClick={() => {
                                    if (currentSection !== section.key) {
                                        navigate(section.to);
                                    }
                                }}
                                type="button"
                            >
                                {section.label}
                            </button>
                        ))}
                    </>
                }
                aside={
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 xl:min-w-[420px]">
                        <SummaryCard label={text.statsParticipants} value={summary?.participants_total ?? 0} />
                        <SummaryCard label={text.statsSubjects} value={summary?.subjects_total ?? 0} />
                        <SummaryCard label={text.statsReadySubjects} value={summary?.ready_subjects_total ?? 0} />
                        <SummaryCard label={text.statsEliminated} value={summary?.eliminated_total ?? 0} />
                        <SummaryCard label={text.statsStageTwo} value={summary?.stage2_total ?? 0} />
                        <SummaryCard label={text.statsCompleted} value={summary?.completed_total ?? 0} />
                    </div>
                }
            />

            {headerContent ? <div className={ui.card}>{headerContent}</div> : null}

            {children}
        </section>
    );
}
