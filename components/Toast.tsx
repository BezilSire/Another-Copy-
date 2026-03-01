import React from 'react';
import { useToast } from '../contexts/ToastContext';
import { XCircleIcon } from './icons/XCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { InfoIcon } from './icons/InfoIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-premium animate-slide-up border ${
            toast.type === 'success' ? 'bg-green-900/90 border-green-500/30 text-green-100' :
            toast.type === 'error' ? 'bg-red-900/90 border-red-500/30 text-red-100' :
            toast.type === 'warning' ? 'bg-yellow-900/90 border-yellow-500/30 text-yellow-100' :
            'bg-slate-900/90 border-slate-500/30 text-slate-100'
          }`}
        >
          {toast.type === 'success' && <CheckCircleIcon className="h-5 w-5 text-green-400" />}
          {toast.type === 'error' && <AlertTriangleIcon className="h-5 w-5 text-red-400" />}
          {toast.type === 'info' && <InfoIcon className="h-5 w-5 text-blue-400" />}
          {toast.type === 'warning' && <AlertTriangleIcon className="h-5 w-5 text-yellow-400" />}
          
          <span className="text-sm font-medium">{toast.message}</span>
          
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 hover:opacity-70 transition-opacity"
          >
            <XCircleIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
