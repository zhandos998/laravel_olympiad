import React from 'react';
import { BrandLogoSlot } from './BrandLogoSlot';
import { useLocale } from '../../context/LocaleContext';

export function AppFooter() {
    const { t } = useLocale();

    return (
        <footer className="border-t border-[#d7e3fb] bg-white">
            <div className="container mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-xs text-[#5471ad] md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <BrandLogoSlot variant="footer" />
                    <p>{t('footer.title')}</p>
                </div>
                <p>{t('footer.subtitle')}</p>
            </div>
        </footer>
    );
}
