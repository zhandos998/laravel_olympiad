import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { LocaleProvider } from './context/LocaleContext';
import { NotificationProvider } from './context/NotificationContext';
import MainApp from './MainApp';

createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <LocaleProvider>
            <ConfirmProvider>
                <NotificationProvider>
                    <AuthProvider>
                        <MainApp />
                    </AuthProvider>
                </NotificationProvider>
            </ConfirmProvider>
        </LocaleProvider>
    </BrowserRouter>,
);
