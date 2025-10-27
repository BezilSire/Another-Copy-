import React, { useState } from 'react';

interface DistressCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (content: string) => void;
  isLoading: boolean;
}

export const DistressCallDialog: React.FC<DistressCallDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading
}) => {
  const [content, setContent] = useState('');
  
  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm(content);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-80 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border-2 border-red-500">
          <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900 bg-opacity-50 sm:mx-0 sm:h-10 sm:w-10">
                <svg className="h-6 w-6 text-red-400 animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-bold text-red-400" id="modal-title">
                  Send Distress Post
                </h3>
                <div className="mt-4">
                  <label htmlFor="distress_content" className="block text-sm font-medium text-gray-300">Describe your situation (required)</label>
                  <textarea
                    id="distress_content"
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    placeholder="Example: I need immediate medical assistance at..."
                  />
                  <div className="text-xs text-gray-400 mt-4 space-y-1 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                      <p className="font-semibold text-yellow-400">What is a Distress Call?</p>
                      <p>A Distress Call is an urgent, anonymous alert for emergencies needing immediate community assistance (e.g., medical, security).</p>
                      <p>It creates a post visible to your Circle and alerts administrators. This action is confidential and consumes one of your monthly calls. Misuse may affect your credibility score.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              disabled={isLoading || !content.trim()}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-red-800 disabled:cursor-not-allowed"
              onClick={handleConfirm}
            >
              {isLoading ? 'Sending...' : 'Send Distress Post'}
            </button>
            <button
              type="button"
              disabled={isLoading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-700 text-base font-medium text-gray-300 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
