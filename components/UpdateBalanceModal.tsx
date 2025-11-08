import React, { useState } from 'react';
import { User, Admin } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { XCircleIcon } from './icons/XCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';

interface UpdateBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToUpdate: User;
  adminUser: Admin;
}

export const UpdateBalanceModal: React.FC<UpdateBalanceModalProps> = ({ isOpen, onClose, userToUpdate, adminUser }) => {
  const [updateData, setUpdateData] = useState({ amount: '', reason: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(updateData.amount);
    if (isNaN(amount) || amount === 0) {
      addToast('Please enter a valid, non-zero amount.', 'error');
      return;
    }
    if (!updateData.reason.trim()) {
      addToast('A reason for the transaction is required.', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      await api.updateUserUbt(adminUser, userToUpdate.id, amount, updateData.reason);
      addToast(`${userToUpdate.name}'s balance updated successfully.`, 'success');
      setUpdateData({ amount: '', reason: '' });
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during the transaction.";
      addToast(`Update failed: ${errorMessage}`, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black bg-opacity-75" onClick={onClose}></div>
        <div className="bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full z-10">
          <form onSubmit={handleUpdate}>
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-white" id="modal-title">Update Wallet for {userToUpdate.name}</h3>
                  <p className="text-sm text-gray-400">Current Balance: {(userToUpdate.ubtBalance || 0).toFixed(2)} $UBT</p>
                </div>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-300">Amount to Credit/Debit (+/-)</label>
                  <input type="number" id="amount" step="any" value={updateData.amount} onChange={e => setUpdateData(p => ({ ...p, amount: e.target.value }))} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" placeholder="e.g., 100 or -50" autoFocus />
                </div>
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-300">Reason for Transaction</label>
                  <input type="text" id="reason" value={updateData.reason} onChange={e => setUpdateData(p => ({ ...p, reason: e.target.value }))} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" placeholder="e.g., New member bonus" />
                </div>
              </div>
            </div>
            <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button type="submit" disabled={isUpdating} className="w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-600">
                {isUpdating ? <LoaderIcon className="h-5 w-5 animate-spin"/> : 'Confirm Update'}
              </button>
              <button type="button" onClick={onClose} className="mt-3 sm:mt-0 sm:mr-3 w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-slate-700 text-gray-300 hover:bg-slate-600">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};