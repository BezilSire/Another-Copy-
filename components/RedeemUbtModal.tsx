import React, { useState } from 'react';
import { User, GlobalEconomy } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { XCircleIcon } from './icons/XCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';

interface RedeemUbtModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  economy: GlobalEconomy | null;
  onTransactionComplete: () => void;
}

export const RedeemUbtModal: React.FC<RedeemUbtModalProps> = ({ isOpen, onClose, currentUser, economy, onTransactionComplete }) => {
  const [amount, setAmount] = useState('');
  const [payoutDetails, setPayoutDetails] = useState({ ecocashName: '', ecocashNumber: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const { addToast } = useToast();
  
  const ubtPrice = economy?.ubt_to_usd_rate || 0;
  const initialStake = currentUser.initialUbtStake || 0;
  const redeemableUbt = Math.max(0, (currentUser.ubtBalance || 0) - initialStake);

  const redeemAmount = parseFloat(amount) || 0;
  const usdValue = redeemAmount * ubtPrice;

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (redeemAmount <= 0) {
      addToast('Please enter a valid amount to redeem.', 'error');
      return;
    }
    if (redeemAmount > redeemableUbt) {
      addToast('Amount exceeds your redeemable balance.', 'error');
      return;
    }
    if (!payoutDetails.ecocashName.trim() || !payoutDetails.ecocashNumber.trim()) {
        addToast('Please provide your Ecocash details.', 'error');
        return;
    }
    
    setIsProcessing(true);
    try {
      await api.requestUbtRedemption(currentUser, redeemAmount, usdValue, payoutDetails.ecocashName, payoutDetails.ecocashNumber);
      addToast(`Redemption request for ${redeemAmount} $UBT submitted.`, 'success');
      onTransactionComplete();
      onClose();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Redemption request failed.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black bg-opacity-75" onClick={onClose}></div>
        <div className="bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full z-10">
          <form onSubmit={handleRedeem}>
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-white">Redeem $UBT</h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
              </div>
              <div className="mt-4 space-y-4">
                 <div className="p-3 bg-slate-900/50 rounded-lg text-sm space-y-1">
                    <div className="flex justify-between"><span>Total Balance:</span> <span className="font-mono">{(currentUser.ubtBalance || 0).toFixed(2)} $UBT</span></div>
                    <div className="flex justify-between"><span>Initial Stake (locked):</span> <span className="font-mono text-yellow-400">-{initialStake.toFixed(2)} $UBT</span></div>
                    <div className="flex justify-between font-bold border-t border-slate-700 pt-1 mt-1"><span>Redeemable Balance:</span> <span className="font-mono text-green-400">{redeemableUbt.toFixed(2)} $UBT</span></div>
                </div>
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-300">Amount to Redeem</label>
                    <div className="relative mt-1">
                      <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} className="block w-full rounded-md border-slate-600 bg-slate-700 pl-4 pr-16 py-2 text-white" placeholder="0.00" min="0.01" max={redeemableUbt} step="0.01" required autoFocus />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"><span className="text-gray-400 sm:text-sm font-bold">$UBT</span></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <button type="button" onClick={() => setAmount(String(redeemableUbt))} className="text-green-400 hover:underline">Redeem Max</button>
                        <span>≈ ${usdValue.toFixed(2)} USD</span>
                    </div>
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
                 <p className="text-xs text-gray-400 p-2 bg-slate-700/50 rounded-md">Admins will review your request and process the payout to your Ecocash. The $UBT amount will be deducted from your wallet upon submission.</p>
              </div>
            </div>
            <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button type="submit" disabled={isProcessing} className="w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-600">
                {isProcessing ? <LoaderIcon className="h-5 w-5 animate-spin"/> : 'Submit Redemption Request'}
              </button>
              <button type="button" onClick={onClose} className="mt-3 sm:mt-0 sm:mr-3 w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-slate-700 text-gray-300 hover:bg-slate-600">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};