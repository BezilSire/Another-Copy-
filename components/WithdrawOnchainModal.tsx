import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { XCircleIcon } from './icons/XCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';

interface WithdrawOnchainModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onTransactionComplete: () => void;
}

export const WithdrawOnchainModal: React.FC<WithdrawOnchainModalProps> = ({ isOpen, onClose, currentUser, onTransactionComplete }) => {
  const [amount, setAmount] = useState('');
  const [solanaAddress, setSolanaAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { addToast } = useToast();
  
  const totalBalance = currentUser.ubtBalance || 0;
  const withdrawAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0) {
      addToast('Please enter a valid amount to withdraw.', 'error');
      return;
    }
    if (withdrawAmount > totalBalance) {
      addToast('Amount exceeds your available balance.', 'error');
      return;
    }
    if (!solanaAddress.trim()) {
        addToast('Please provide your Solana wallet address.', 'error');
        return;
    }
    // Basic Solana address validation (length)
    if (solanaAddress.trim().length < 32 || solanaAddress.trim().length > 44) {
        addToast('Please enter a valid Solana address.', 'error');
        return;
    }
    
    setIsProcessing(true);
    try {
      await api.requestOnchainWithdrawal(currentUser, withdrawAmount, solanaAddress.trim());
      addToast(`Withdrawal is pending and will be processed within 24 hours. Check the status in your wallet.`, 'success');
      onTransactionComplete();
      onClose();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Withdrawal request failed.', 'error');
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
          <form onSubmit={handleSubmit}>
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-white">Withdraw $UBT On-chain</h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
              </div>
              <div className="mt-4 space-y-4">
                 <div className="p-3 bg-slate-900/50 rounded-lg text-sm space-y-1">
                    <div className="flex justify-between font-bold"><span>Available to Withdraw:</span> <span className="font-mono text-green-400">{totalBalance.toFixed(2)} $UBT</span></div>
                </div>
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-300">Amount to Withdraw</label>
                    <div className="relative mt-1">
                      <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} className="block w-full rounded-md border-slate-600 bg-slate-700 pl-4 pr-16 py-2 text-white" placeholder="0.00" min="0.01" max={totalBalance} step="0.01" required autoFocus />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"><span className="text-gray-400 sm:text-sm font-bold">$UBT</span></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <button type="button" onClick={() => setAmount(String(totalBalance))} className="text-green-400 hover:underline">Withdraw Max</button>
                    </div>
                </div>
                 <div className="pt-4 border-t border-slate-700">
                    <label htmlFor="solanaAddress" className="block text-sm font-medium text-gray-300">Your Solana Wallet Address</label>
                    <input type="text" id="solanaAddress" value={solanaAddress} onChange={e => setSolanaAddress(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" placeholder="Enter your public Solana address" />
                </div>
                 <p className="text-xs text-yellow-400 p-2 bg-yellow-900/50 rounded-md">
                   <strong>Warning:</strong> Ensure your Solana address is correct before proceeding. On-chain transactions are irreversible and cannot be recovered if sent to the wrong address.
                 </p>
              </div>
            </div>
            <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button type="submit" disabled={isProcessing} className="w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-600">
                {isProcessing ? <LoaderIcon className="h-5 w-5 animate-spin"/> : 'Submit Withdrawal Request'}
              </button>
              <button type="button" onClick={onClose} className="mt-3 sm:mt-0 sm:mr-3 w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-slate-700 text-gray-300 hover:bg-slate-600">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
