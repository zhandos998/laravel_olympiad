import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const TOKEN_KEY = 'olympiad_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function bootstrap() {
            if (!token) {
                if (!cancelled) {
                    setUser(null);
                    setLoading(false);
                }
                return;
            }

            try {
                const authUser = await api('/auth/me', { token });
                if (!cancelled) {
                    setUser(authUser);
                }
            } catch {
                if (!cancelled) {
                    localStorage.removeItem(TOKEN_KEY);
                    setToken('');
                    setUser(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        bootstrap();

        return () => {
            cancelled = true;
        };
    }, [token]);

    const signIn = (authToken, authUser) => {
        localStorage.setItem(TOKEN_KEY, authToken);
        setToken(authToken);
        setUser(authUser);
        setError('');
    };

    const signOut = async () => {
        try {
            if (token) {
                await api('/auth/logout', { method: 'POST', token });
            }
        } catch {
            // ignore network/logout errors
        }

        localStorage.removeItem(TOKEN_KEY);
        setToken('');
        setUser(null);
        setError('');
    };

    const value = useMemo(
        () => ({
            token,
            user,
            loading,
            error,
            setError,
            signIn,
            signOut,
        }),
        [token, user, loading, error],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider');
    }

    return context;
}
