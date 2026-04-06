import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminOlympiadCopy } from '../components/admin/adminOlympiadCopy';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useLocale } from '../context/LocaleContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../lib/api';

function fetchDashboard(olympiadId, token) {
    return api(`/admin/olympiads/${olympiadId}`, { token });
}

function fetchCurators(token) {
    return api('/admin/users?role=curator', { token });
}

export function useAdminOlympiadDashboard({ includeCurators = false } = {}) {
    const { olympiadId } = useParams();
    const { token, setError } = useAuth();
    const { locale, t } = useLocale();
    const { showNotification } = useNotification();
    const { confirm } = useConfirm();
    const [dashboard, setDashboard] = useState(null);
    const [curators, setCurators] = useState([]);
    const [loaded, setLoaded] = useState(false);

    const text = adminOlympiadCopy[locale] ?? adminOlympiadCopy.rus;
    const olympiad = dashboard?.olympiad ?? null;
    const participants = dashboard?.participants ?? [];
    const subjects = dashboard?.subjects ?? [];
    const summary = dashboard?.summary ?? null;
    const subjectLanguageOptions = useMemo(
        () => [
            { value: '', label: locale === 'kaz' ? 'Тілсіз' : 'Без языка' },
            { value: 'kaz', label: locale === 'kaz' ? 'Қазақша' : 'Казахский' },
            { value: 'rus', label: locale === 'kaz' ? 'Орысша' : 'Русский' },
        ],
        [locale],
    );
    const proctoringText = useMemo(
        () =>
            locale === 'kaz'
                ? {
                      title: 'Прокторинг',
                      open: 'Жазбалар',
                      emptyShort: 'Жоқ',
                  }
                : {
                      title: 'Прокторинг',
                      open: 'Записи',
                      emptyShort: 'Нет',
                  },
        [locale],
    );

    useEffect(() => {
        let cancelled = false;

        setLoaded(false);
        setDashboard(null);

        if (includeCurators) {
            setCurators([]);
        }

        fetchDashboard(olympiadId, token)
            .then((data) => {
                if (cancelled) {
                    return;
                }

                setDashboard(data);
                setLoaded(true);
            })
            .catch((error) => {
                if (cancelled) {
                    return;
                }

                setLoaded(true);
                setError(error.message);
            });

        if (includeCurators) {
            fetchCurators(token)
                .then((data) => {
                    if (!cancelled) {
                        setCurators(data);
                    }
                })
                .catch((error) => {
                    if (!cancelled) {
                        setError(error.message);
                    }
                });
        }

        return () => {
            cancelled = true;
        };
    }, [includeCurators, olympiadId, token, setError]);

    const refreshDashboard = () =>
        fetchDashboard(olympiadId, token)
            .then((data) => {
                setDashboard(data);
                setLoaded(true);
                return data;
            })
            .catch((error) => {
                setLoaded(true);
                setError(error.message);
                throw error;
            });

    return {
        confirm,
        curators,
        dashboard,
        loaded,
        locale,
        olympiad,
        olympiadId,
        participants,
        proctoringText,
        refreshDashboard,
        setDashboard,
        setError,
        showNotification,
        subjectLanguageOptions,
        subjects,
        summary,
        t,
        text,
        token,
    };
}
