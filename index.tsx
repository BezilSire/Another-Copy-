import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LedgerPage } from './components/LedgerPage';
import { Buffer } from 'buffer';

// BIP39 and other crypto libs require a global Buffer object
if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/**
 * SOVEREIGN ROUTING PROTOCOL
 * Detects if we are on the public explorer domain or standard app domain.
 */
const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const isExplorer = 
    hostname.includes('scan') || 
    hostname.includes('ledger') || 
    hostname.includes('another-copy') || 
    process.env.SITE_MODE === 'EXPLORER';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <ThemeProvider>
          {isExplorer ? (
            <LedgerPage />
          ) : (
            <AuthProvider>
              <App />
            </AuthProvider>
          )}
        </ThemeProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);