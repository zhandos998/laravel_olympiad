import React from 'react';
import { MenuLink } from '../navigation/MenuLink';
import { ui } from '../../constants/ui';
import { useLocale } from '../../context/LocaleContext';

export function AppHeader({ user, onLogout }) {
    const { locale, locales, setLocale, t } = useLocale();

    return (
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="container mx-auto max-w-7xl px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">{t('header.badge')}</p>
                        <h1 className="text-xl font-extrabold text-slate-900 md:text-2xl">{t('header.title')}</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        {user ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {user.name} | {t(`header.role.${user.role}`)}
                            </span>
                        ) : (
                            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                                {t('common.guest')}
                            </span>
                        )}

                        <nav className="flex flex-wrap items-center gap-2">
                            {!user && <MenuLink to="/login">{t('header.login')}</MenuLink>}
                            {user?.role === 'student' && <MenuLink to="/student">{t('header.student')}</MenuLink>}
                            {user?.role === 'admin' && <MenuLink to="/admin">{t('header.admin')}</MenuLink>}
                            {(user?.role === 'curator' || user?.role === 'admin') && <MenuLink to="/curator">{t('header.curator')}</MenuLink>}
                        </nav>

                        {user ? (
                            <button className={ui.secondaryButton} onClick={onLogout}>
                                {t('common.logout')}
                            </button>
                        ) : null}

                        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                            {locales.map((item) => (
                                <button
                                    key={item}
                                    className={[
                                        'rounded-full px-3 py-1 text-xs font-bold transition',
                                        locale === item ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-200',
                                    ].join(' ')}
                                    onClick={() => setLocale(item)}
                                >
                                    {t(`languages.${item}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
