import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthForm } from '../components/auth/AuthForm';
import { BrandLogoSlot } from '../components/layout/BrandLogoSlot';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { defaultHomePath } from '../lib/navigation';

export function LoginPage() {
    const navigate = useNavigate();
    const { user, signIn, setError } = useAuth();
    const { t } = useLocale();

    if (user) {
        return <Navigate to={defaultHomePath(user)} replace />;
    }

    const handleAuthSuccess = (token, authUser) => {
        signIn(token, authUser);
        navigate(defaultHomePath(authUser), { replace: true });
    };

    return (
        <div className="mx-auto grid min-h-full w-full max-w-6xl gap-5 py-4 md:py-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
            <section className="rounded-[2rem] border border-[#d7e3fb] bg-[linear-gradient(180deg,_#ffffff_0%,_#f4f8ff_100%)] p-6 shadow-[0_24px_60px_-36px_rgba(53,93,168,0.35)]">
                <BrandLogoSlot variant="hero" />
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-[#355da8]">{t('header.badge')}</p>
                <h2 className="mt-2 text-2xl font-extrabold text-[#27498c]">{t('header.title')}</h2>
                <p className="mt-3 text-sm leading-6 text-[#5471ad]">{t('footer.subtitle')}</p>
            </section>

            <div className="grid place-items-center">
                <AuthForm onAuthSuccess={handleAuthSuccess} onError={setError} />
            </div>
        </div>
    );
}
