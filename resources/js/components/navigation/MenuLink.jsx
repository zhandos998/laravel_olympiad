import React from 'react';
import { NavLink } from 'react-router-dom';

export function MenuLink({ to, children }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                [
                    'rounded-full border px-3 py-1 text-sm font-semibold transition',
                    isActive
                        ? 'border-[#355da8] bg-[#355da8] text-white'
                        : 'border-[#d7e3fb] bg-[#f7f9ff] text-[#355da8] hover:border-[#bfd0f4] hover:bg-[#eef3ff]',
                ].join(' ')
            }
        >
            {children}
        </NavLink>
    );
}
