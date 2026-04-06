import React, { useEffect, useState } from 'react';
import { AdminOlympiadPageFrame } from '../components/admin/AdminOlympiadPageFrame';
import { AdminOlympiadSettings } from '../components/admin/AdminOlympiadSettings';
import { parsePositiveInteger, toDateTimeInputValue } from '../components/admin/adminOlympiadUtils';
import { useAdminOlympiadDashboard } from '../hooks/useAdminOlympiadDashboard';
import { api } from '../lib/api';

function createDefaultOlympiadForm() {
    return {
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
    };
}

export function AdminOlympiadSettingsPage() {
    const { dashboard, loaded, locale, olympiad, olympiadId, setDashboard, setError, showNotification, summary, t, text, token } = useAdminOlympiadDashboard();
    const [olympiadForm, setOlympiadForm] = useState(createDefaultOlympiadForm);

    useEffect(() => {
        if (!dashboard?.olympiad) {
            setOlympiadForm(createDefaultOlympiadForm());
            return;
        }

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
    }, [dashboard]);

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

    return (
        <AdminOlympiadPageFrame currentSection="settings" loaded={loaded} olympiad={olympiad} olympiadId={olympiadId} summary={summary} text={text}>
            <AdminOlympiadSettings
                text={text}
                locale={locale}
                t={t}
                olympiad={olympiad}
                olympiadForm={olympiadForm}
                setOlympiadForm={setOlympiadForm}
                saveOlympiadSettings={saveOlympiadSettings}
            />
        </AdminOlympiadPageFrame>
    );
}
