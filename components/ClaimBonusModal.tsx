import React, { useState } from 'react';
import { PayoutRequest } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { XCircleIcon } from './icons/XCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';

interface ClaimBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
  payoutRequest: PayoutRequest;
}

export const ClaimBonusModal: React.FC<ClaimBonusModalProps> = ({ isOpen, onClose, payoutRequest }) => {
  const [ecocashName, setEcocashName] = useState('');
  const [ecocashNumber, setEcocashNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ecocashName.trim() || !ecocashNumber.trim()) {
      addToast('Please fill in both fields.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.claimBonusPayout(payoutRequest.id, ecocashName, ecocashNumber);
      addToast('Bonus details submitted! An admin will process your payout.', 'success');
      onClose();
    } catch (error) {
      addToast('Failed to submit details. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black bg-opacity-75" onClick={onClose}></div>
        <div className="bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full z-10">
          <form onSubmit={handleSubmit}>
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-white" id="modal-title">Claim Your ${payoutRequest.amount.toFixed(2)} Bonus</h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
              </div>
              <div className="mt-4 space-y-4">
                <p className="text-sm text-gray-300">To receive your signup bonus, please provide your Ecocash details below. An admin will process the payment shortly.</p>
                <div>
                  <label htmlFor="ecocashName" className="block text-sm font-medium text-gray-300">Ecocash Full Name</label>
                  <input
                    type="text"
                    id="ecocashName"
                    value={ecocashName}
                    onChange={e => setEcocashName(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                  />
                </div>
                <div>
                  <label htmlFor="ecocashNumber" className="block text-sm font-medium text-gray-300">Ecocash Phone Number</label>
                  <input
                    type="tel"
                    id="ecocashNumber"
                    value={ecocashNumber}
                    onChange={e => setEcocashNumber(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                  />
                </div>
              </div>
            </div>
            <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-600"
              >
                {isSubmitting ? (
                    <LoaderIcon className="h-5 w-5 animate-spin"/>
                ) : 'Submit Claim'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 sm:mt-0 sm:mr-3 w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-slate-700 text-gray-300 hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};