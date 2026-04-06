import React from 'react';
import { BrandLogoSlot } from './BrandLogoSlot';
import { MenuLink } from '../navigation/MenuLink';
import { feedbackCopy } from '../../constants/feedbackCopy';
import { ui } from '../../constants/ui';
import { useLocale } from '../../context/LocaleContext';

export function AppHeader({ user, onLogout }) {
    const { locale, locales, setLocale, t } = useLocale();
    const feedbackLabel = feedbackCopy[locale]?.title ?? feedbackCopy.rus.title;

    return (
        <header className="border-b border-[#d7e3fb] bg-white/95 backdrop-blur">
            <div className="container mx-auto max-w-7xl px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <BrandLogoSlot variant="header" />
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#355da8]">{t('header.badge')}</p>
                            <h1 className="text-xl font-extrabold text-[#27498c] md:text-2xl">{t('header.title')}</h1>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        {user ? (
                            <span className="rounded-full border border-[#d7e3fb] bg-[#f7f9ff] px-3 py-1 text-xs font-semibold text-[#355da8]">
                                {user.name} | {t(`header.role.${user.role}`)}
                            </span>
                        ) : (
                            <span className="rounded-full border border-[#bfd0f4] bg-[#f7f9ff] px-3 py-1 text-xs font-semibold text-[#355da8]">
                                {t('common.guest')}
                            </span>
                        )}

                        <nav className="flex flex-wrap items-center gap-2">
                            {!user && <MenuLink to="/login">{t('header.login')}</MenuLink>}
                            {user?.role === 'student' && <MenuLink to="/student">{t('header.student')}</MenuLink>}
                            {user?.role === 'admin' && <MenuLink to="/admin">{t('header.admin')}</MenuLink>}
                            {(user?.role === 'curator' || user?.role === 'admin') && <MenuLink to="/curator">{t('header.curator')}</MenuLink>}
                            {user && <MenuLink to="/feedback">{feedbackLabel}</MenuLink>}
                        </nav>

                        {user ? (
                            <button className={ui.secondaryButton} onClick={onLogout}>
                                {t('common.logout')}
                            </button>
                        ) : null}

                        <div className="flex items-center gap-1 rounded-full border border-[#d7e3fb] bg-white p-1">
                            {locales.map((item) => (
                                <button
                                    key={item}
                                    className={[
                                        'rounded-full px-3 py-1 text-xs font-bold transition',
                                        locale === item ? 'bg-[#355da8] text-white' : 'text-[#355da8] hover:bg-[#eef3ff]',
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
