import React, { useState } from 'react';
import { User, VentureEquityHolding } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { XCircleIcon } from './icons/XCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';

interface VeqRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: VentureEquityHolding;
  user: User;
}

export const VeqRedemptionModal: React.FC<VeqRedemptionModalProps> = ({ isOpen, onClose, holding, user }) => {
  const [shares, setShares] = useState(0);
  const [payoutDetails, setPayoutDetails] = useState({ ecocashName: '', ecocashNumber: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (shares <= 0 || shares > holding.shares) {
      addToast('Please enter a valid number of shares to redeem.', 'error');
      return;
    }
    if (!payoutDetails.ecocashName.trim() || !payoutDetails.ecocashNumber.trim()) {
        addToast('Please provide your Ecocash details.', 'error');
        return;
    }
    setIsSubmitting(true);
    try {
        await api.requestVeqPayout(user, holding, shares, payoutDetails.ecocashName, payoutDetails.ecocashNumber);
        addToast('Redemption request submitted successfully.', 'success');
        onClose();
    } catch (error) {
        addToast(error instanceof Error ? error.message : 'Failed to submit request.', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black bg-opacity-75" onClick={onClose}></div>
        <div className="bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full z-10">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Redeem VEQ for {holding.ventureName}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
            </div>
            <div className="space-y-4">
                <p className="text-sm text-gray-300">Enter the number of shares you wish to redeem. An admin will review your request and calculate the current cash value for payout to your Ecocash.</p>
                <div>
                    <label className="block text-sm font-medium text-gray-300 flex justify-between">
                        <span>Shares to Redeem</span>
                        <span>Your holdings: {holding.shares.toLocaleString()}</span>
                    </label>
                    <input 
                        type="number" 
                        value={shares}
                        onChange={e => setShares(Math.max(0, Math.min(holding.shares, Number(e.target.value))))}
                        max={holding.shares}
                        min="0"
                        className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" 
                    />
                    <input
                        type="range"
                        value={shares}
                        onChange={e => setShares(Number(e.target.value))}
                        max={holding.shares}
                        min="0"
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-2"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                    <div>
                        <label htmlFor="ecocashName" className="block text-sm font-medium text-gray-300">Ecocash Full Name</label>
                        <input type="text" id="ecocashName" value={payoutDetails.ecocashName} onChange={e => setPayoutDetails(p => ({...p, ecocashName: e.target.value}))} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                    </div>
                    <div>
                        <label htmlFor="ecocashNumber" className="block text-sm font-medium text-gray-300">Ecocash Phone Number</label>
                        <input type="tel" id="ecocashNumber" value={payoutDetails.ecocashNumber} onChange={e => setPayoutDetails(p => ({...p, ecocashNumber: e.target.value}))} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                    </div>
                </div>
            </div>
          </div>
          <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse">
            <button onClick={handleSubmit} disabled={isSubmitting || shares <= 0} className="w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-600">
              {isSubmitting ? 'Submitting...' : 'Submit Redemption Request'}
            </button>
            <button onClick={onClose} className="mt-3 sm:mt-0 sm:mr-3 w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-slate-700 text-gray-300 hover:bg-slate-600">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};