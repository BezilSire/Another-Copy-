import React from 'react';
import { useToast } from '../contexts/ToastContext';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { UserCircleIcon } from './icons/UserCircleIcon'; // For info

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  const icons = {
    success: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
    error: <XCircleIcon className="h-6 w-6 text-red-500" />,
    info: <UserCircleIcon className="h-6 w-6 text-blue-500" />,
  };
  
  const colors = {
    success: 'bg-white dark:bg-slate-800 border-green-500 dark:border-green-700',
    error: 'bg-white dark:bg-slate-800 border-red-500 dark:border-red-700',
    info: 'bg-white dark:bg-slate-800 border-blue-500 dark:border-blue-700'
  };

  return (
    <div className="fixed top-5 right-5 z-50 space-y-3 w-full max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            w-full p-4 rounded-lg shadow-2xl flex items-center
            animate-fade-in
            ${colors[toast.type]}
            border
          `}
        >
          <div className="flex-shrink-0">
            {icons[toast.type]}
          </div>
          <div className="ml-3 text-sm font-medium text-slate-800 dark:text-gray-200">
            {toast.message}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-auto -mx-1.5 -my-1.5 bg-transparent rounded-lg focus:ring-2 focus:ring-gray-400 p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 inline-flex h-8 w-8 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
            aria-label="Close"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          </button>
        </div>
      ))}
    </div>
  );
};