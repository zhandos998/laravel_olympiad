import React, { useEffect, useState } from 'react';
import { AdminOlympiadPageFrame } from '../components/admin/AdminOlympiadPageFrame';
import { AdminOlympiadSubjects } from '../components/admin/AdminOlympiadSubjects';
import { parsePositiveInteger } from '../components/admin/adminOlympiadUtils';
import { useAdminOlympiadDashboard } from '../hooks/useAdminOlympiadDashboard';
import { api } from '../lib/api';

export function AdminOlympiadSubjectsPage() {
    const {
        confirm,
        curators,
        dashboard,
        loaded,
        olympiad,
        olympiadId,
        refreshDashboard,
        setError,
        showNotification,
        subjectLanguageOptions,
        subjects,
        summary,
        text,
        token,
    } = useAdminOlympiadDashboard({ includeCurators: true });
    const [subjectName, setSubjectName] = useState('');
    const [subjectLanguage, setSubjectLanguage] = useState('');
    const [subjectQuestionCount, setSubjectQuestionCount] = useState('25');
    const [assignedUsers, setAssignedUsers] = useState({});
    const [subjectLanguages, setSubjectLanguages] = useState({});
    const [subjectQuestionCounts, setSubjectQuestionCounts] = useState({});

    useEffect(() => {
        if (!dashboard?.olympiad) {
            setAssignedUsers({});
            setSubjectLanguages({});
            setSubjectQuestionCounts({});
            setSubjectName('');
            setSubjectLanguage('');
            setSubjectQuestionCount('25');
            return;
        }

        setAssignedUsers(Object.fromEntries(subjects.map((subject) => [subject.id, String(subject.assigned_curator?.id ?? '')])));
        setSubjectLanguages(Object.fromEntries(subjects.map((subject) => [subject.id, subject.language ?? ''])));
        setSubjectQuestionCounts(
            Object.fromEntries(subjects.map((subject) => [subject.id, String(subject.stage1_question_count ?? olympiad.stage1_question_count ?? 25)])),
        );
        setSubjectLanguage('');
        setSubjectQuestionCount(String(olympiad.stage1_question_count ?? 25));
    }, [dashboard]);

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
            await refreshDashboard();
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

            await refreshDashboard();
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

            await refreshDashboard();
            setError('');
            showNotification({ type: 'success', message: text.subjectArchived });
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <AdminOlympiadPageFrame currentSection="subjects" loaded={loaded} olympiad={olympiad} olympiadId={olympiadId} summary={summary} text={text}>
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
        </AdminOlympiadPageFrame>
    );
}
