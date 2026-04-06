import React, { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppFooter } from './components/layout/AppFooter';
import { AppHeader } from './components/layout/AppHeader';
import { NotificationToast } from './components/layout/NotificationToast';
import { ProtectedRoute } from './components/routes/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { useLocale } from './context/LocaleContext';
import { defaultHomePath } from './lib/navigation';
import { AdminPage } from './pages/AdminPage';
import { AdminOlympiadPage } from './pages/AdminOlympiadPage';
import { AdminOlympiadSettingsPage } from './pages/AdminOlympiadSettingsPage';
import { AdminOlympiadSubjectsPage } from './pages/AdminOlympiadSubjectsPage';
import { CuratorPage } from './pages/CuratorPage';
import { CuratorSubjectQuestionsPage } from './pages/CuratorSubjectQuestionsPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { LoginPage } from './pages/LoginPage';
import { StudentPage } from './pages/StudentPage';
import { StudentOlympiadPage } from './pages/StudentOlympiadPage';
import { StudentOlympiadTestingPage } from './pages/StudentOlympiadTestingPage';

const LazyCuratorQuestionFormPage = lazy(() =>
    import('./pages/CuratorQuestionFormPage').then((module) => ({ default: module.CuratorQuestionFormPage })),
);

export default function MainApp() {
    const { user, signOut, error } = useAuth();
    const { t } = useLocale();

    useEffect(() => {
        document.title = `${t('header.badge')} | ${t('header.title')}`;
    }, [t]);

    return (
        <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_#eef4ff,_#ffffff_45%,_#f5f8ff_100%)] text-[#355da8]">
            <NotificationToast />
            <AppHeader user={user} onLogout={signOut} />

            <main className="grid w-full flex-1 gap-5 px-4 py-6 md:px-6 md:py-8">
                {error && (
                    <p className="rounded-xl border border-[#bfd0f4] bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#355da8]">
                        {error}
                    </p>
                )}

                <Suspense
                    fallback={
                        <div className="rounded-xl border border-[#d7e3fb] bg-white px-4 py-3 text-sm text-[#355da8]">
                            {t('common.loading')}
                        </div>
                    }
                >
                    <Routes>
                        <Route path="/" element={<Navigate to={defaultHomePath(user)} replace />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route
                            path="/student"
                            element={
                                <ProtectedRoute allow={['student']}>
                                    <StudentPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/student/olympiads/:olympiadId"
                            element={
                                <ProtectedRoute allow={['student']}>
                                    <StudentOlympiadPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/student/olympiads/:olympiadId/test"
                            element={
                                <ProtectedRoute allow={['student']}>
                                    <StudentOlympiadTestingPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/feedback"
                            element={
                                <ProtectedRoute allow={['student', 'curator', 'admin']}>
                                    <FeedbackPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute allow={['admin']}>
                                    <AdminPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/olympiads/:olympiadId/settings"
                            element={
                                <ProtectedRoute allow={['admin']}>
                                    <AdminOlympiadSettingsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/olympiads/:olympiadId/subjects"
                            element={
                                <ProtectedRoute allow={['admin']}>
                                    <AdminOlympiadSubjectsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/olympiads/:olympiadId"
                            element={
                                <ProtectedRoute allow={['admin']}>
                                    <AdminOlympiadPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/curator"
                            element={
                                <ProtectedRoute allow={['curator', 'admin']}>
                                    <CuratorPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/curator/subjects/:subjectId/questions"
                            element={
                                <ProtectedRoute allow={['curator', 'admin']}>
                                    <CuratorSubjectQuestionsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/curator/subjects/:subjectId/questions/new"
                            element={
                                <ProtectedRoute allow={['curator', 'admin']}>
                                    <LazyCuratorQuestionFormPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/curator/subjects/:subjectId/questions/:questionId/edit"
                            element={
                                <ProtectedRoute allow={['curator', 'admin']}>
                                    <LazyCuratorQuestionFormPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="*" element={<Navigate to={defaultHomePath(user)} replace />} />
                    </Routes>
                </Suspense>
            </main>

            <AppFooter />
        </div>
    );
}
