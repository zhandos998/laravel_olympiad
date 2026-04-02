import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AdminParticipantsTab } from '../components/admin/AdminParticipantsTab';
import { AdminProctoringModal } from '../components/admin/AdminProctoringModal';
import { AdminResultsTab } from '../components/admin/AdminResultsTab';
import { AdminOlympiadSettings } from '../components/admin/AdminOlympiadSettings';
import { AdminOlympiadSubjects } from '../components/admin/AdminOlympiadSubjects';
import { AdminStageTwoTab } from '../components/admin/AdminStageTwoTab';
import { SummaryCard } from '../components/admin/AdminUi';
import { adminOlympiadCopy } from '../components/admin/adminOlympiadCopy';
import { downloadCsv, parseOptionalPercent, parsePositiveInteger, toDateTimeInputValue } from '../components/admin/adminOlympiadUtils';
import { PROFILE_SUBJECTS, TEST_LANGUAGES } from '../constants/registration';
import { ui } from '../constants/ui';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useLocale } from '../context/LocaleContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../lib/api';

export function AdminOlympiadPage() {
    const { olympiadId } = useParams();
    const { pathname } = useLocation();
    const { token, setError } = useAuth();
    const { locale, t } = useLocale();
    const { showNotification } = useNotification();
    const { confirm } = useConfirm();
    const [dashboard, setDashboard] = useState(null);
    const [curators, setCurators] = useState([]);
    const [subjectName, setSubjectName] = useState('');
    const [subjectLanguage, setSubjectLanguage] = useState('');
    const [subjectQuestionCount, setSubjectQuestionCount] = useState('25');
    const [assignedUsers, setAssignedUsers] = useState({});
    const [subjectLanguages, setSubjectLanguages] = useState({});
    const [subjectQuestionCounts, setSubjectQuestionCounts] = useState({});
    const [olympiadForm, setOlympiadForm] = useState({
        title: '',
        description: '',
        registration_open: true,
        is_active: true,
        stage1_question_count: '25',
        stage1_duration_minutes: '90',
        stage1_pass_percent: '70',
        stage1_starts_at: '',
        stage1_ends_at: '',
        stage2_starts_at: '',
        stage2_ends_at: '',
    });
    const [stageTwoEdits, setStageTwoEdits] = useState({});
    const [participantSearch, setParticipantSearch] = useState('');
    const [languageFilter, setLanguageFilter] = useState('all');
    const [profileFilter, setProfileFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('participants');
    const [loaded, setLoaded] = useState(false);
    const [proctoringViewer, setProctoringViewer] = useState({
        open: false,
        registrationId: null,
    });

    const text = adminOlympiadCopy[locale] ?? adminOlympiadCopy.rus;
    const subjectLanguageOptions = [
        { value: '', label: locale === 'kaz' ? 'Тілсіз' : 'Без языка' },
        { value: 'kaz', label: locale === 'kaz' ? 'Қазақша' : 'Казахский' },
        { value: 'rus', label: locale === 'kaz' ? 'Орысша' : 'Русский' },
    ];
    const olympiad = dashboard?.olympiad ?? null;
    const subjects = dashboard?.subjects ?? [];
    const participants = dashboard?.participants ?? [];
    const summary = dashboard?.summary ?? null;
    const activeSection = pathname.endsWith('/settings') ? 'settings' : pathname.endsWith('/subjects') ? 'subjects' : 'overview';
    const sectionLinks = [
        { key: 'overview', label: text.overview, to: `/admin/olympiads/${olympiadId}` },
        { key: 'settings', label: text.settings, to: `/admin/olympiads/${olympiadId}/settings` },
        { key: 'subjects', label: text.subjects, to: `/admin/olympiads/${olympiadId}/subjects` },
    ];
    const proctoringText = useMemo(
        () =>
            locale === 'kaz'
                ? {
                      title: '\u041f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433',
                      open: '\u0416\u0430\u0437\u0431\u0430\u043b\u0430\u0440',
                      emptyShort: '\u0416\u043e\u049b',
                  }
                : {
                      title: '\u041f\u0440\u043e\u043a\u0442\u043e\u0440\u0438\u043d\u0433',
                      open: '\u0417\u0430\u043f\u0438\u0441\u0438',
                      emptyShort: '\u041d\u0435\u0442',
                  },
        [locale],
    );

    const loadDashboard = () => {
        api(`/admin/olympiads/${olympiadId}`, { token })
            .then((data) => {
                setDashboard(data);
                setLoaded(true);
            })
            .catch((error) => {
                setLoaded(true);
                setError(error.message);
            });
    };

    const loadCurators = () => {
        api('/admin/users?role=curator', { token })
            .then(setCurators)
            .catch((error) => setError(error.message));
    };

    useEffect(() => {
        loadDashboard();
        loadCurators();
    }, [olympiadId, token, setError]);

    useEffect(() => {
        if (!dashboard?.olympiad) {
            setAssignedUsers({});
            setSubjectLanguages({});
            setSubjectQuestionCounts({});
            setStageTwoEdits({});
            return;
        }

        setAssignedUsers(Object.fromEntries(subjects.map((subject) => [subject.id, String(subject.assigned_curator?.id ?? '')])));
        setSubjectLanguages(Object.fromEntries(subjects.map((subject) => [subject.id, subject.language ?? ''])));
        setSubjectQuestionCounts(
            Object.fromEntries(subjects.map((subject) => [subject.id, String(subject.stage1_question_count ?? olympiad.stage1_question_count ?? 25)])),
        );
        setSubjectQuestionCount(String(olympiad.stage1_question_count ?? 25));
        setSubjectLanguage('');
        setOlympiadForm({
            title: olympiad.title ?? '',
            description: olympiad.description ?? '',
            registration_open: Boolean(olympiad.registration_open),
            is_active: Boolean(olympiad.is_active),
            stage1_question_count: String(olympiad.stage1_question_count ?? 25),
            stage1_duration_minutes: String(olympiad.stage1_duration_minutes ?? 90),
            stage1_pass_percent: String(olympiad.stage1_pass_percent ?? 70),
            stage1_starts_at: toDateTimeInputValue(olympiad.stage1_starts_at ?? olympiad.starts_at),
            stage1_ends_at: toDateTimeInputValue(olympiad.stage1_ends_at ?? olympiad.ends_at),
            stage2_starts_at: toDateTimeInputValue(olympiad.stage2_starts_at),
            stage2_ends_at: toDateTimeInputValue(olympiad.stage2_ends_at),
        });
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
    }, [dashboard, olympiad, participants, subjects]);

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

    const createSubject = async () => {
        if (!olympiad) {
            return;
        }

        const trimmedSubjectName = subjectName.trim();
        const parsedQuestionCount = parsePositiveInteger(subjectQuestionCount);

        if (!trimmedSubjectName) {
            setError(text.invalidSubjectName);
            showNotification({ type: 'error', message: text.invalidSubjectName });
            return;
        }

        if (parsedQuestionCount === null) {
            setError(text.invalidQuestionCount);
            showNotification({ type: 'error', message: text.invalidQuestionCount });
            return;
        }

        try {
            await api(`/admin/olympiads/${olympiad.id}/subjects`, {
                method: 'POST',
                token,
                body: {
                    name: trimmedSubjectName,
                    language: subjectLanguage || null,
                    stage1_question_count: parsedQuestionCount,
                },
            });

            setSubjectName('');
            setSubjectLanguage('');
            setSubjectQuestionCount(String(olympiad.stage1_question_count ?? 25));
            loadDashboard();
            setError('');
            showNotification({ type: 'success', message: text.subjectCreated });
        } catch (error) {
            setError(error.message);
        }
    };

    const saveSubject = async (subjectId) => {
        const parsedQuestionCount = parsePositiveInteger(subjectQuestionCounts[subjectId]);

        if (parsedQuestionCount === null) {
            setError(text.invalidQuestionCount);
            showNotification({ type: 'error', message: text.invalidQuestionCount });
            return;
        }

        try {
            await api(`/admin/subjects/${subjectId}`, {
                method: 'PATCH',
                token,
                body: {
                    stage1_question_count: parsedQuestionCount,
                    language: subjectLanguages[subjectId] || null,
                    user_id: assignedUsers[subjectId] ? Number(assignedUsers[subjectId]) : null,
                },
            });

            loadDashboard();
            setError('');
            showNotification({ type: 'success', message: text.subjectSaved });
        } catch (error) {
            setError(error.message);
        }
    };

    const archiveSubject = async (subjectId) => {
        const confirmed = await confirm({
            title: text.archiveSubject,
            message: text.archiveSubjectConfirm,
            confirmText: text.archiveSubject,
            tone: 'danger',
        });

        if (!confirmed) {
            return;
        }

        try {
            await api(`/admin/subjects/${subjectId}/archive`, {
                method: 'PATCH',
                token,
            });

            loadDashboard();
            setError('');
            showNotification({ type: 'success', message: text.subjectArchived });
        } catch (error) {
            setError(error.message);
        }
    };

    const saveOlympiadSettings = async () => {
        if (!olympiad) {
            return;
        }

        const trimmedTitle = olympiadForm.title.trim();
        const parsedQuestionCount = parsePositiveInteger(olympiadForm.stage1_question_count);
        const parsedDurationMinutes = parsePositiveInteger(olympiadForm.stage1_duration_minutes, 300);
        const parsedPassPercent = parsePositiveInteger(olympiadForm.stage1_pass_percent);

        if (!trimmedTitle) {
            setError(text.invalidOlympiadTitle);
            showNotification({ type: 'error', message: text.invalidOlympiadTitle });
            return;
        }

        if (parsedQuestionCount === null) {
            setError(text.invalidQuestionCount);
            showNotification({ type: 'error', message: text.invalidQuestionCount });
            return;
        }

        if (parsedDurationMinutes === null) {
            const durationMessage = locale === 'kaz' ? '1 кезең уақыты 1 мен 300 минут аралығында болуы керек.' : 'Время 1 тура должно быть от 1 до 300 минут.';
            setError(durationMessage);
            showNotification({ type: 'error', message: durationMessage });
            return;
        }

        if (parsedPassPercent === null) {
            setError(text.invalidPassPercent);
            showNotification({ type: 'error', message: text.invalidPassPercent });
            return;
        }

        try {
            const data = await api(`/admin/olympiads/${olympiad.id}`, {
                method: 'PATCH',
                token,
                body: {
                    title: trimmedTitle,
                    description: olympiadForm.description.trim(),
                    registration_open: olympiadForm.registration_open,
                    is_active: olympiadForm.is_active,
                    stage1_question_count: parsedQuestionCount,
                    stage1_duration_minutes: parsedDurationMinutes,
                    stage1_pass_percent: parsedPassPercent,
                    stage1_starts_at: olympiadForm.stage1_starts_at || null,
                    stage1_ends_at: olympiadForm.stage1_ends_at || null,
                    stage2_starts_at: olympiadForm.stage2_starts_at || null,
                    stage2_ends_at: olympiadForm.stage2_ends_at || null,
                },
            });

            setDashboard(data);
            setError('');
            showNotification({ type: 'success', message: text.olympiadSaved });
        } catch (error) {
            setError(error.message);
        }
    };

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

            loadDashboard();
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

    const exportResultsCsv = () => {
        downloadCsv(`results-olympiad-${olympiadId}.csv`, [
            [text.participantName, text.status, ...subjects.flatMap((subject) => [`${subject.display_name ?? subject.name} ${text.stageOne}`, `${subject.display_name ?? subject.name} ${text.stageTwo}`, `${subject.display_name ?? subject.name} ${text.total}`]), text.overallScore],
            ...filteredParticipants.map((participant) => {
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
            <div className={ui.card}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-xl font-bold">{text.testingAdmin}</h2>
                        <p className="mt-1 text-sm text-slate-600">{olympiad.title}</p>
                    </div>
                    <Link className={ui.secondaryButton} to="/admin">
                        {text.backToOlympiads}
                    </Link>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <SummaryCard label={text.statsParticipants} value={summary?.participants_total ?? 0} />
                    <SummaryCard label={text.statsSubjects} value={summary?.subjects_total ?? 0} />
                    <SummaryCard label={text.statsReadySubjects} value={summary?.ready_subjects_total ?? 0} />
                    <SummaryCard label={text.statsEliminated} value={summary?.eliminated_total ?? 0} />
                    <SummaryCard label={text.statsStageTwo} value={summary?.stage2_total ?? 0} />
                    <SummaryCard label={text.statsCompleted} value={summary?.completed_total ?? 0} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                    {sectionLinks.map((section) => (
                        <Link key={section.key} className={activeSection === section.key ? ui.primaryButton : ui.secondaryButton} data-testid={`section-${section.key}`} to={section.to}>
                            {section.label}
                        </Link>
                    ))}
                </div>

                {activeSection === 'overview' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {['participants', 'results', 'stageTwo'].map((tab) => (
                            <button key={tab} className={activeTab === tab ? ui.primaryButton : ui.secondaryButton} onClick={() => setActiveTab(tab)}>
                                {text[tab]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {activeSection === 'settings' && (
                <AdminOlympiadSettings
                    text={text}
                    locale={locale}
                    t={t}
                    olympiad={olympiad}
                    olympiadForm={olympiadForm}
                    setOlympiadForm={setOlympiadForm}
                    saveOlympiadSettings={saveOlympiadSettings}
                />
            )}

            {activeSection === 'subjects' && (
                <AdminOlympiadSubjects
                    text={text}
                    subjectName={subjectName}
                    setSubjectName={setSubjectName}
                    subjectLanguage={subjectLanguage}
                    setSubjectLanguage={setSubjectLanguage}
                    subjectQuestionCount={subjectQuestionCount}
                    setSubjectQuestionCount={setSubjectQuestionCount}
                    createSubject={createSubject}
                    subjects={subjects}
                    subjectLanguages={subjectLanguages}
                    setSubjectLanguages={setSubjectLanguages}
                    subjectLanguageOptions={subjectLanguageOptions}
                    subjectQuestionCounts={subjectQuestionCounts}
                    setSubjectQuestionCounts={setSubjectQuestionCounts}
                    assignedUsers={assignedUsers}
                    setAssignedUsers={setAssignedUsers}
                    curators={curators}
                    saveSubject={saveSubject}
                    archiveSubject={archiveSubject}
                />
            )}

            {activeSection === 'overview' && activeTab === 'participants' && (
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

            {activeSection === 'overview' && activeTab === 'results' && (
                <AdminResultsTab text={text} subjects={subjects} filteredParticipants={filteredParticipants} exportResultsCsv={exportResultsCsv} statusLabel={statusLabel} />
            )}

            {activeSection === 'overview' && activeTab === 'stageTwo' && (
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
        </section>
    );
}
