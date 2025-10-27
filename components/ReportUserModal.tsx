import React, { useState } from 'react';
import { User } from '../types';
import { XCircleIcon } from './icons/XCircleIcon';

interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUser: User;
  onReportSubmit: (reason: string, details: string) => Promise<void>;
}

export const ReportUserModal: React.FC<ReportUserModalProps> = ({ isOpen, onClose, reportedUser, onReportSubmit }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!reason) return;
    setIsSubmitting(true);
    await onReportSubmit(reason, details);
    setIsSubmitting(false);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black bg-opacity-75" onClick={onClose}></div>
        <div className="bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full z-10">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Report {reportedUser.name}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">Reason for reporting</label>
                    <select value={reason} onChange={e => setReason(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 rounded-md text-white">
                        <option value="">Select a reason...</option>
                        <option value="spam">Spam or unwanted messages</option>
                        <option value="harassment">Harassment or hate speech</option>
                        <option value="impersonation">Impersonation</option>
                        <option value="scam">Scam or fraud</option>
                        <option value="inappropriate_profile">Inappropriate profile information</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Additional details (optional)</label>
                    <textarea value={details} onChange={e => setDetails(e.target.value)} rows={4} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                </div>
                 <div className="text-xs text-gray-400 p-2 bg-slate-700/50 rounded-md">
                  <p>Falsely reporting users may negatively impact your credibility score.</p>
                </div>
            </div>
          </div>
          <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse">
            <button onClick={handleSubmit} disabled={!reason || isSubmitting} className="w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:bg-red-800">
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
            <button onClick={onClose} className="mt-3 sm:mt-0 sm:mr-3 w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-slate-700 text-gray-300 hover:bg-slate-600">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};