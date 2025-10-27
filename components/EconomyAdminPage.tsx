import React, { useState, useEffect, useMemo } from 'react';
import { User, CommunityValuePool, VentureEquityHolding } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';

const StatCard: React.FC<{ title: string; value: string | number; description: string }> = ({ title, value, description }) => (
    <div className="bg-slate-900/50 p-6 rounded-lg">
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
);

const VEQHolderList: React.FC<{ users: User[] }> = ({ users }) => {
    const veqHolders = useMemo(() => {
        return users.filter(u => u.ventureEquity && u.ventureEquity.length > 0);
    }, [users]);

    if (veqHolders.length === 0) {
        return <p className="text-center text-gray-500 py-8">No members currently hold Venture Equity.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
                <thead>
                    <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-0">Holder</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Venture</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Shares (VEQ)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {veqHolders.flatMap(user => 
                        user.ventureEquity?.map((holding: VentureEquityHolding) => (
                            <tr key={`${user.id}-${holding.ventureId}`}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">{user.name}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{holding.ventureName}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400 font-mono">{holding.shares.toLocaleString()}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

interface EconomyAdminPageProps {
    user: User;
    cvp: CommunityValuePool | null;
    users: User[];
}

export const EconomyAdminPage: React.FC<EconomyAdminPageProps> = ({ user, cvp, users }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [addAmount, setAddAmount] = useState('');
    const { addToast } = useToast();

    const handleAddFunds = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(addAmount);
        if (isNaN(amount) || amount <= 0) {
            addToast("Please enter a valid amount.", "error");
            return;
        }
        setIsProcessing(true);
        try {
            await api.addFundsToCVP(user, amount);
            addToast(`$${amount.toFixed(2)} added to the CVP successfully.`, 'success');
            setAddAmount('');
            // Data will refresh via the listener in the parent component
        } catch (error) {
            addToast(error instanceof Error ? error.message : "Failed to add funds.", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!cvp) {
        return (
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">Manage CVP Funds</h2>
                <div className="text-center text-gray-400 py-4">
                    <p>Community Value Pool data is not available.</p>
                    <p className="text-sm text-gray-500 mt-1">Please add funds to initialize the CVP.</p>
                </div>
                 <form onSubmit={handleAddFunds} className="flex flex-col sm:flex-row items-end gap-4 mt-4">
                    <div className="w-full sm:flex-1">
                        <label htmlFor="addAmount" className="block text-sm font-medium text-gray-300">Add External Funds (USD)</label>
                        <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-400 sm:text-sm">$</span></div>
                            <input type="number" id="addAmount" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="0.00" className="block w-full rounded-md border-slate-600 bg-slate-700 pl-7 pr-4 py-2 text-white"/>
                        </div>
                    </div>
                    <button type="submit" disabled={isProcessing} className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-slate-600">
                        {isProcessing ? <LoaderIcon className="h-5 w-5 animate-spin"/> : 'Add to Pool'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Community Value Pool" value={`$${cvp.total_usd_value.toFixed(2)}`} description="Total external funds available for CCAP redemption." />
                <StatCard title="Circulating CCAP" value={cvp.total_circulating_ccap.toLocaleString()} description="Total CCAP earned by all members across the commons." />
                <StatCard title="CCAP Value" value={`$${cvp.ccap_to_usd_rate.toFixed(5)}`} description="Current redemption value of 1 CCAP." />
            </div>

            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">Manage CVP Funds</h2>
                <form onSubmit={handleAddFunds} className="flex flex-col sm:flex-row items-end gap-4">
                    <div className="w-full sm:flex-1">
                        <label htmlFor="addAmount" className="block text-sm font-medium text-gray-300">Add External Funds (USD)</label>
                        <div className="relative mt-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-400 sm:text-sm">$</span></div>
                            <input type="number" id="addAmount" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="0.00" className="block w-full rounded-md border-slate-600 bg-slate-700 pl-7 pr-4 py-2 text-white"/>
                        </div>
                    </div>
                    <button type="submit" disabled={isProcessing} className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-slate-600">
                        {isProcessing ? <LoaderIcon className="h-5 w-5 animate-spin"/> : 'Add to Pool'}
                    </button>
                </form>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">Venture Equity Holders</h2>
                <VEQHolderList users={users} />
            </div>
        </div>
    );
};
