import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { defaultHomePath } from '../../lib/navigation';

export function ProtectedRoute({ allow, children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                Loading...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!allow.includes(user.role)) {
        return <Navigate to={defaultHomePath(user)} replace />;
    }

    return children;
}
