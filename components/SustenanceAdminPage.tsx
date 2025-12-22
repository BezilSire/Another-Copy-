
import React, { useState, useEffect, useCallback } from 'react';
import { User, SustenanceCycle, SustenanceVoucher } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { HeartIcon } from './icons/HeartIcon';
import { formatTimeAgo } from '../utils';
import { ConfirmationDialog } from './ConfirmationDialog';

export const SustenanceAdminPage: React.FC<{ user: User }> = ({ user }) => {
    const [cycle, setCycle] = useState<SustenanceCycle | null>(null);
    const [vouchers, setVouchers] = useState<SustenanceVoucher[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showLotteryConfirm, setShowLotteryConfirm] = useState(false);
    const { addToast } = useToast();
    const [initData, setInitData] = useState({ balance: '', cost: '' });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [cycleData, voucherData] = await Promise.all([
                api.getSustenanceFund(),
                api.getAllSustenanceVouchers()
            ]);
            setCycle(cycleData);
            setVouchers(voucherData);
        } catch (error) {
            addToast("Failed to load sustenance data.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInitialize = async (e: React.FormEvent) => {
        e.preventDefault();
        const balance = parseFloat(initData.balance);
        const cost = parseFloat(initData.cost);
        if (isNaN(balance) || isNaN(cost) || balance < 0 || cost <= 0) {
            addToast('Please enter valid, positive numbers.', 'error');
            return;
        }
        setIsProcessing(true);
        try {
            await api.initializeSustenanceFund(user, balance, cost);
            addToast('Sustenance Fund initialized successfully!', 'success');
            await fetchData();
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Failed to initialize fund.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleRunLottery = async () => {
        setIsProcessing(true);
        try {
            const result = await api.runSustenanceLottery(user);
            addToast(`Successfully distributed ${result.winners_count} food hampers!`, 'success');
            await fetchData();
            setShowLotteryConfirm(false);
        } catch (error) {
            addToast(error instanceof Error ? error.message : "Failed to run lottery.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><LoaderIcon className="h-8 w-8 animate-spin" /></div>;
    }

    if (!cycle) {
        return (
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">Initialize Sustenance Fund</h2>
                <p className="text-gray-400 mb-4">The Sustenance & Logistics Fund has not been set up yet. Please provide the initial values to get started.</p>
                <form onSubmit={handleInitialize} className="space-y-4">
                    <div>
                        <label htmlFor="balance" className="block text-sm font-medium text-gray-300">Initial Fund Balance (USD)</label>
                        <input type="number" name="balance" id="balance" value={initData.balance} onChange={e => setInitData(p => ({...p, balance: e.target.value}))} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" required min="0" step="0.01" />
                    </div>
                    <div>
                        <label htmlFor="cost" className="block text-sm font-medium text-gray-300">Cost Per Hamper (USD)</label>
                        <input type="number" name="cost" id="cost" value={initData.cost} onChange={e => setInitData(p => ({...p, cost: e.target.value}))} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" required min="0.01" step="0.01" />
                    </div>
                    <div className="text-right">
                        <button type="submit" disabled={isProcessing} className="inline-flex justify-center py-2 px-6 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-500">
                            {isProcessing ? 'Initializing...' : 'Initialize Fund'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold text-white mb-4">Sustenance & Logistics Fund</h2>
                    <div className="text-center">
                        <p className="text-sm text-gray-400">Current Fund Balance</p>
                        <p className="text-5xl font-bold text-green-400">${cycle.slf_balance.toFixed(2)}</p>
                        <p className="text-sm text-gray-400 mt-2">Available for the next Dividend Drop</p>
                    </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-lg shadow-lg flex flex-col justify-center items-center">
                    <h3 className="text-lg font-semibold text-white mb-3">Run Next Dividend Drop</h3>
                    <button 
                        onClick={() => setShowLotteryConfirm(true)}
                        disabled={isProcessing}
                        className="w-full inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-lg disabled:bg-slate-600"
                    >
                        {isProcessing ? <LoaderIcon className="h-6 w-6 animate-spin" /> : 'Distribute Hampers'}
                    </button>
                    <p className="text-xs text-gray-500 mt-2">This will select ~{Math.floor(cycle.slf_balance / cycle.hamper_cost)} winners based on contribution.</p>
                </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">Voucher History</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead>
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-0">Status</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Winner</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Voucher ID</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Value</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Issued</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Redeemed By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                           {vouchers.map(v => (
                               <tr key={v.id}>
                                   <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-0">
                                       <span className={`px-2 py-1 rounded-full text-xs font-semibold ${v.status === 'active' ? 'bg-blue-800 text-blue-300' : v.status === 'redeemed' ? 'bg-green-800 text-green-300' : 'bg-slate-700 text-slate-300'}`}>
                                           {v.status}
                                       </span>
                                   </td>
                                   <td className="whitespace-nowrap px-3 py-4 text-sm text-white">{v.userName}</td>
                                   <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400 font-mono">{v.id}</td>
                                   <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400 font-mono">${v.value.toFixed(2)}</td>
                                   <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{formatTimeAgo(v.issuedAt.toDate().toISOString())}</td>
                                   <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{v.redeemedBy || 'N/A'}</td>
                               </tr>
                           ))}
                        </tbody>
                    </table>
                     {vouchers.length === 0 && <p className="text-center py-8 text-gray-500">No vouchers have been distributed yet.</p>}
                </div>
            </div>

            <ConfirmationDialog 
                isOpen={showLotteryConfirm}
                onClose={() => setShowLotteryConfirm(false)}
                onConfirm={handleRunLottery}
                title="Run Sustenance Lottery"
                message="Are you sure you want to run the Sustenance Dividend lottery? This will distribute new vouchers to winning members based on contribution algorithm and cannot be undone."
                confirmButtonText="Distribute Vouchers"
            />
        </div>
    );
};
