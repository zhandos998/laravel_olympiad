import React from 'react';

const variants = {
    header: {
        frame: 'h-14 w-14 rounded-[1.25rem] p-2',
    },
    footer: {
        frame: 'h-12 w-12 rounded-[1rem] p-1.5',
    },
    hero: {
        frame: 'h-24 w-24 rounded-[1.75rem] p-3 md:h-28 md:w-28 md:p-3.5',
    },
};

export function BrandLogoSlot({ className = '', variant = 'header' }) {
    const styles = variants[variant] ?? variants.header;

    return (
        <div
            className={[
                'relative flex shrink-0 items-center justify-center overflow-hidden border border-[#d7e3fb] bg-white shadow-[0_18px_40px_-24px_rgba(53,93,168,0.45)]',
                styles.frame,
                className,
            ].join(' ')}
        >
            <img alt="Site logo" className="h-full w-full object-contain" src="/logo.png" />
        </div>
    );
}
