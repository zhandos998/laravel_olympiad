import React, { createContext, useContext, useMemo, useRef, useState } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
    const [notification, setNotification] = useState(null);
    const timeoutRef = useRef(null);

    const clearNotification = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        setNotification(null);
    };

    const showNotification = ({ type = 'success', message, duration = 3500 }) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setNotification({
            id: Date.now(),
            type,
            message,
        });

        timeoutRef.current = setTimeout(() => {
            setNotification(null);
            timeoutRef.current = null;
        }, duration);
    };

    const value = useMemo(
        () => ({
            notification,
            showNotification,
            clearNotification,
        }),
        [notification],
    );

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotification() {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error('useNotification must be used inside NotificationProvider');
    }

    return context;
}
