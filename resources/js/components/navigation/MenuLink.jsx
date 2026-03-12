import React from 'react';
import { NavLink } from 'react-router-dom';

export function MenuLink({ to, children }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                [
                    'rounded-full px-3 py-1 text-sm font-semibold transition',
                    isActive ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                ].join(' ')
            }
        >
            {children}
        </NavLink>
    );
}
