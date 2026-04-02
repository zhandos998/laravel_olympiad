import React from 'react';
import { useLocale } from '../../context/LocaleContext';

export function AppFooter() {
    const { t } = useLocale();

    return (
        <footer className="border-t border-slate-200 bg-white">
            <div className="container mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
                <p>{t('footer.title')}</p>
                <p>{t('footer.subtitle')}</p>
            </div>
        </footer>
    );
}
