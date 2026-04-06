import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ui } from '../constants/ui';
import { useLocale } from './LocaleContext';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const { locale } = useLocale();
    const [dialog, setDialog] = useState(null);

    useEffect(() => {
        if (!dialog) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                dialog.resolve(false);
                setDialog(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dialog]);

    const confirm = (options) =>
        new Promise((resolve) => {
            setDialog((current) => {
                current?.resolve(false);

                return {
                    ...options,
                    resolve,
                };
            });
        });

    const closeDialog = (result) => {
        if (!dialog) {
            return;
        }

        dialog.resolve(result);
        setDialog(null);
    };

    const value = useMemo(
        () => ({
            confirm,
        }),
        [],
    );

    const cancelText = dialog?.cancelText ?? (locale === 'kaz' ? '\u0411\u0430\u0441 \u0442\u0430\u0440\u0442\u0443' : '\u041e\u0442\u043c\u0435\u043d\u0430');
    const confirmText = dialog?.confirmText ?? (locale === 'kaz' ? '\u0420\u0430\u0441\u0442\u0430\u0443' : '\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c');
    const titleText = dialog?.title ?? (locale === 'kaz' ? '\u0420\u0430\u0441\u0442\u0430\u0443' : '\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435');
    const confirmButtonClass =
        dialog?.tone === 'danger'
            ? 'inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#27498c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f3c75]'
            : `${ui.primaryButton} inline-flex min-h-11 items-center justify-center`;

    return (
        <ConfirmContext.Provider value={value}>
            {children}

            {dialog ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
                    onClick={() => closeDialog(false)}
                >
                    <div
                        aria-modal="true"
                        className="w-full max-w-md rounded-[1.75rem] border border-[#d7e3fb] bg-white p-5 shadow-[0_30px_80px_-35px_rgba(53,93,168,0.35)] md:p-6"
                        role="dialog"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7e91ba]">{titleText}</p>
                        <p className="mt-3 text-base font-semibold leading-7 text-[#27498c]">{dialog.message}</p>

                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button className={`${ui.secondaryButton} min-h-11`} onClick={() => closeDialog(false)} type="button">
                                {cancelText}
                            </button>
                            <button className={confirmButtonClass} onClick={() => closeDialog(true)} type="button">
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);

    if (!context) {
        throw new Error('useConfirm must be used inside ConfirmProvider');
    }

    return context;
}
