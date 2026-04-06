import React, { useEffect, useMemo, useState } from 'react';
import { AdminOlympiadPageFrame } from '../components/admin/AdminOlympiadPageFrame';
import { AdminParticipantsTab } from '../components/admin/AdminParticipantsTab';
import { AdminProctoringModal } from '../components/admin/AdminProctoringModal';
import { AdminResultsTab } from '../components/admin/AdminResultsTab';
import { AdminStageTwoTab } from '../components/admin/AdminStageTwoTab';
import { downloadCsv, parseOptionalPercent } from '../components/admin/adminOlympiadUtils';
import { PROFILE_SUBJECTS, TEST_LANGUAGES } from '../constants/registration';
import { ui } from '../constants/ui';
import { useAdminOlympiadDashboard } from '../hooks/useAdminOlympiadDashboard';
import { api } from '../lib/api';

export function AdminOlympiadPage() {
    const { dashboard, loaded, locale, olympiad, olympiadId, participants, proctoringText, refreshDashboard, setError, showNotification, subjects, t, text, token } =
        useAdminOlympiadDashboard();
    const [participantSearch, setParticipantSearch] = useState('');
    const [languageFilter, setLanguageFilter] = useState('all');
    const [profileFilter, setProfileFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('participants');
    const [stageTwoEdits, setStageTwoEdits] = useState({});
    const [proctoringViewer, setProctoringViewer] = useState({
        open: false,
        registrationId: null,
    });

    useEffect(() => {
        if (!dashboard?.olympiad) {
            setStageTwoEdits({});
            return;
        }

        setStageTwoEdits(
            Object.fromEntries(
                participants.flatMap((participant) =>
                    participant.subject_results
                        .filter((result) => result.stage1_passed || result.stage2_status)
                        .map((result) => [
                            `${participant.registration_id}:${result.subject_id}`,
                            {
                                status: result.stage2_status ?? 'scheduled',
                                meeting_link: result.stage2_meeting_link ?? '',
                                score_percent:
                                    result.stage2_score_percent === null || result.stage2_score_percent === undefined
                                        ? ''
                                        : String(result.stage2_score_percent),
                            },
                        ]),
                ),
            ),
        );
    }, [dashboard]);

    const languageLabel = (value) => {
        const item = TEST_LANGUAGES.find((entry) => entry.value === value);
        return item ? t(item.labelKey) : value;
    };

    const profileLabel = (value) => {
        const item = PROFILE_SUBJECTS.find((entry) => entry.value === value);
        return item ? t(item.labelKey) : value;
    };

    const statusLabel = (status) => {
        if (!status) {
            return '-';
        }

        const translated = t(`statuses.${status}`);

        return translated === `statuses.${status}` ? status : translated;
    };

    const filteredParticipants = useMemo(
        () =>
            participants.filter((participant) => {
                const haystack = [
                    participant.user.name,
                    participant.user.email,
                    participant.user.phone,
                    participant.user.region,
                    participant.user.city,
                    participant.user.school,
                ]
                    .join(' ')
                    .toLowerCase();

                const matchesSearch = !participantSearch.trim() || haystack.includes(participantSearch.trim().toLowerCase());
                const matchesLanguage = languageFilter === 'all' || participant.user.test_language === languageFilter;
                const matchesProfile = profileFilter === 'all' || participant.user.profile_subjects === profileFilter;
                const matchesStatus = statusFilter === 'all' || participant.current_status === statusFilter;

                return matchesSearch && matchesLanguage && matchesProfile && matchesStatus;
            }),
        [participants, participantSearch, languageFilter, profileFilter, statusFilter],
    );

    const stageTwoRows = useMemo(
        () =>
            filteredParticipants.flatMap((participant) =>
                participant.subject_results
                    .filter((result) => result.stage1_passed || result.stage2_status)
                    .map((result) => ({
                        key: `${participant.registration_id}:${result.subject_id}`,
                        registrationId: participant.registration_id,
                        participantName: participant.user.name,
                        participantEmail: participant.user.email,
                        subjectId: result.subject_id,
                        subjectName: result.subject_name,
                        stage1Score: result.stage1_score_percent,
                        stage2Status: result.stage2_status ?? 'scheduled',
                        stage2MeetingLink: result.stage2_meeting_link ?? '',
                        stage2Score: result.stage2_score_percent,
                    })),
            ),
        [filteredParticipants],
    );

    const saveStageTwo = async (row) => {
        const edit = stageTwoEdits[row.key] ?? {
            status: row.stage2Status,
            meeting_link: row.stage2MeetingLink,
            score_percent: row.stage2Score === null || row.stage2Score === undefined ? '' : String(row.stage2Score),
        };
        const parsedScore = parseOptionalPercent(edit.score_percent);

        if (edit.status === 'completed' && (edit.score_percent === '' || parsedScore === null)) {
            const message = edit.score_percent === '' ? text.stageTwoScoreRequired : text.stageTwoScoreInvalid;
            setError(message);
            showNotification({ type: 'error', message });
            return;
        }

        if (edit.score_percent !== '' && parsedScore === null) {
            setError(text.stageTwoScoreInvalid);
            showNotification({ type: 'error', message: text.stageTwoScoreInvalid });
            return;
        }

        try {
            await api(`/admin/subjects/${row.subjectId}/stage-two-result`, {
                method: 'PATCH',
                token,
                body: {
                    olympiad_registration_id: row.registrationId,
                    status: edit.status,
                    meeting_link: edit.meeting_link || null,
                    score_percent: edit.status === 'completed' ? parsedScore : null,
                },
            });

            await refreshDashboard();
            setError('');
            showNotification({ type: 'success', message: text.stageTwoSaved });
        } catch (error) {
            setError(error.message);
        }
    };

    const exportParticipantsCsv = () => {
        downloadCsv(`participants-olympiad-${olympiadId}.csv`, [
            [text.participantName, text.email, text.phone, text.language, text.profile, text.location, text.school, text.status, text.stage1Passed, text.overallScore, text.registeredAt],
            ...filteredParticipants.map((participant) => [
                participant.user.name,
                participant.user.email,
                participant.user.phone,
                languageLabel(participant.user.test_language),
                profileLabel(participant.user.profile_subjects),
                `${participant.user.region} / ${participant.user.city}`,
                participant.user.school,
                statusLabel(participant.current_status),
                participant.passed_stage1_count,
                participant.overall_score ?? '-',
                participant.registered_at ?? '-',
            ]),
        ]);
        showNotification({ type: 'success', message: text.exportedParticipants });
    };

    const exportResultsCsv = (participantsForExport) => {
        downloadCsv(`results-olympiad-${olympiadId}.csv`, [
            [text.participantName, text.status, ...subjects.flatMap((subject) => [`${subject.display_name ?? subject.name} ${text.stageOne}`, `${subject.display_name ?? subject.name} ${text.stageTwo}`, `${subject.display_name ?? subject.name} ${text.total}`]), text.overallScore],
            ...participantsForExport.map((participant) => {
                const resultMap = new Map(participant.subject_results.map((result) => [result.subject_id, result]));

                return [
                    participant.user.name,
                    statusLabel(participant.current_status),
                    ...subjects.flatMap((subject) => {
                        const result = resultMap.get(subject.id);
                        return [result?.stage1_score_percent ?? '-', result?.stage2_score_percent ?? '-', result?.subject_total_score ?? '-'];
                    }),
                    participant.overall_score ?? '-',
                ];
            }),
        ]);
        showNotification({ type: 'success', message: text.exportedResults });
    };

    const exportStageTwoCsv = () => {
        downloadCsv(`stage-two-olympiad-${olympiadId}.csv`, [
            [text.participantName, text.email, text.subject, text.stageOne, text.stageTwoStatus, text.stageTwoScore, text.meetingLink],
            ...stageTwoRows.map((row) => {
                const edit = stageTwoEdits[row.key] ?? { status: row.stage2Status, meeting_link: row.stage2MeetingLink, score_percent: row.stage2Score ?? '' };
                return [row.participantName, row.participantEmail, row.subjectName, row.stage1Score ?? '-', statusLabel(edit.status), edit.score_percent || '-', edit.meeting_link || '-'];
            }),
        ]);
        showNotification({ type: 'success', message: text.exportedStageTwo });
    };

    const openProctoringViewer = (participant) => {
        setProctoringViewer({
            open: true,
            registrationId: participant.registration_id,
        });
    };

    return (
        <AdminOlympiadPageFrame
            currentSection="overview"
            headerContent={
                <div className="mt-3 flex flex-wrap gap-2">
                    {['participants', 'results', 'stageTwo'].map((tab) => (
                        <button key={tab} className={activeTab === tab ? ui.primaryButton : ui.secondaryButton} onClick={() => setActiveTab(tab)} type="button">
                            {text[tab]}
                        </button>
                    ))}
                </div>
            }
            loaded={loaded}
            olympiad={olympiad}
            olympiadId={olympiadId}
            summary={dashboard?.summary ?? null}
            text={text}
        >
            {activeTab === 'participants' && (
                <AdminParticipantsTab
                    text={text}
                    t={t}
                    locale={locale}
                    proctoringText={proctoringText}
                    filteredParticipants={filteredParticipants}
                    participantSearch={participantSearch}
                    setParticipantSearch={setParticipantSearch}
                    languageFilter={languageFilter}
                    setLanguageFilter={setLanguageFilter}
                    profileFilter={profileFilter}
                    setProfileFilter={setProfileFilter}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    exportParticipantsCsv={exportParticipantsCsv}
                    languageLabel={languageLabel}
                    profileLabel={profileLabel}
                    statusLabel={statusLabel}
                    openProctoringViewer={openProctoringViewer}
                />
            )}

            {activeTab === 'results' && (
                <AdminResultsTab text={text} subjects={subjects} participants={participants} exportResultsCsv={exportResultsCsv} statusLabel={statusLabel} />
            )}

            {activeTab === 'stageTwo' && (
                <AdminStageTwoTab
                    text={text}
                    stageTwoRows={stageTwoRows}
                    stageTwoEdits={stageTwoEdits}
                    setStageTwoEdits={setStageTwoEdits}
                    saveStageTwo={saveStageTwo}
                    exportStageTwoCsv={exportStageTwoCsv}
                    statusLabel={statusLabel}
                />
            )}

            <AdminProctoringModal
                locale={locale}
                olympiadId={olympiadId}
                onClose={() => setProctoringViewer({ open: false, registrationId: null })}
                open={proctoringViewer.open}
                registrationId={proctoringViewer.registrationId}
                token={token}
            />
        </AdminOlympiadPageFrame>
    );
}
