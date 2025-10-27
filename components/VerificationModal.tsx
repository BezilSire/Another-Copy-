import React, { useState } from 'react';
import { Member } from '../types';
import { XCircleIcon } from './icons/XCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  onApprove: (member: Member) => Promise<void>;
  onReject: (member: Member) => Promise<void>;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onClose, member, onApprove, onReject }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove(member);
    } catch (e) {
      // If there's an error, re-enable the buttons
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject(member);
    } catch(e) {
      // If there's an error, re-enable the buttons
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start">
                 <h3 className="text-lg leading-6 font-medium text-white" id="modal-title">
                  Verify New Member
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white" disabled={isProcessing}>
                    <XCircleIcon className="h-6 w-6" />
                </button>
            </div>
            {member.is_duplicate_email && (
                <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-700 rounded-md flex items-start space-x-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-200">
                        <p className="font-bold">Duplicate Email Detected</p>
                        <p className="mt-1">An account with the email address "{member.email}" already exists. Approving this member will create a second account with the same email.</p>
                    </div>
                </div>
            )}
            <div className="mt-4">
                {/* Member Details */}
                <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-200 border-b border-slate-700 pb-2">Submitted Details</h4>
                    <DetailItem label="Full Name" value={member.full_name} />
                    <DetailItem label="Email" value={member.email} />
                    <DetailItem label="Phone" value={member.phone} />
                    <DetailItem label="Circle" value={member.circle} />
                    <DetailItem label="Address" value={member.address ?? 'Not provided'} />
                    <DetailItem label="National ID" value={member.national_id ?? 'Not provided'} />
                    <DetailItem label="Date Submitted" value={new Date(member.date_registered).toLocaleString()} />
                </div>
            </div>
          </div>
          <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              disabled={isProcessing}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-slate-500"
              onClick={handleApprove}
            >
              {isProcessing ? 'Processing...' : 'Approve Member'}
            </button>
            <button
              type="button"
              disabled={isProcessing}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-red-600 shadow-sm px-4 py-2 bg-red-800 text-base font-medium text-red-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-slate-500"
              onClick={handleReject}
            >
               {isProcessing ? 'Processing...' : 'Reject Member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailItem: React.FC<{label: string, value: string}> = ({label, value}) => (
    <div>
        <dt className="text-sm font-medium text-gray-400">{label}</dt>
        <dd className="mt-1 text-sm text-white">{value}</dd>
    </div>
);