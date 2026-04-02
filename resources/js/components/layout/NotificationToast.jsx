import React from 'react';
import { useNotification } from '../../context/NotificationContext';

const toneClasses = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    info: 'border-sky-200 bg-sky-50 text-sky-900',
};

export function NotificationToast() {
    const { notification, clearNotification } = useNotification();

    if (!notification) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed right-4 top-4 z-50 w-full max-w-sm">
            <div
                className={[
                    'pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg backdrop-blur',
                    toneClasses[notification.type] ?? toneClasses.info,
                ].join(' ')}
                role="status"
                aria-live="polite"
            >
                <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold">{notification.message}</p>
                    <button
                        className="rounded-full px-2 py-1 text-xs font-bold opacity-70 transition hover:opacity-100"
                        onClick={clearNotification}
                        aria-label="Close notification"
                    >
                        x
                    </button>
                </div>
            </div>
        </div>
    );
}
