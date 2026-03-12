import React from 'react';
import { MenuLink } from '../navigation/MenuLink';
import { ui } from '../../constants/ui';

export function AppHeader({ user, onLogout }) {
    return (
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="container mx-auto max-w-7xl px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">University Olympiad</p>
                        <h1 className="text-xl font-extrabold text-slate-900 md:text-2xl">Testing Platform</h1>
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                        <nav className="flex flex-wrap items-center gap-2">
                            {!user && <MenuLink to="/login">Login</MenuLink>}
                            {user?.role === 'student' && <MenuLink to="/student">Student</MenuLink>}
                            {user?.role === 'admin' && <MenuLink to="/admin">Admin</MenuLink>}
                            {(user?.role === 'curator' || user?.role === 'admin') && <MenuLink to="/curator">Curator</MenuLink>}
                        </nav>

                        <div className="flex items-center gap-2">
                            {user ? (
                                <>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                        {user.name} | {user.role}
                                    </span>
                                    <button className={ui.secondaryButton} onClick={onLogout}>
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">Guest</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
