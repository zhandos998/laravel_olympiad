import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthForm } from '../components/auth/AuthForm';
import { useAuth } from '../context/AuthContext';
import { defaultHomePath } from '../lib/navigation';

export function LoginPage() {
    const navigate = useNavigate();
    const { user, signIn, setError } = useAuth();

    if (user) {
        return <Navigate to={defaultHomePath(user)} replace />;
    }

    const handleAuthSuccess = (token, authUser) => {
        signIn(token, authUser);
        navigate(defaultHomePath(authUser), { replace: true });
    };

    return <AuthForm onAuthSuccess={handleAuthSuccess} onError={setError} />;
}
