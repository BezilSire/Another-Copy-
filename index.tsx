import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LedgerPage } from './components/LedgerPage';
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root not found");

/**
 * DIRECT INGRESS PROTOCOL
 * If we are on the public explorer domain, we kill the auth app and render the ledger only.
 */
const hostname = window.location.hostname;
const isExplorer = 
    hostname.includes('scan') || 
    hostname.includes('ledger') || 
    window.location.search.includes('mode=explorer') ||
    process.env.SITE_MODE === 'EXPLORER';

const root = ReactDOM.createRoot(rootElement);

// If explorer, we render the LedgerPage in a minimalist wrapper to avoid any App.tsx side-effects
if (isExplorer) {
    root.render(
        <React.StrictMode>
            <ErrorBoundary>
                <ToastProvider>
                    <LedgerPage />
                </ToastProvider>
            </ErrorBoundary>
        </React.StrictMode>
    );
} else {
    root.render(
        <React.StrictMode>
            <ErrorBoundary>
                <ToastProvider>
                    <ThemeProvider>
                        <AuthProvider>
                            <App />
                        </AuthProvider>
                    </ThemeProvider>
                </ToastProvider>
            </ErrorBoundary>
        </React.StrictMode>
    );
}