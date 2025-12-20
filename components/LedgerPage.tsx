
import React, { useState, useEffect } from 'react';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { formatTimeAgo } from '../utils';

export const LedgerPage: React.FC = () => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [richList, setRichList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fixed Supply Constants
    const MAX_SUPPLY = 15000000;
    // In a real app, fetch this from a global singleton that tracks minted supply
    const circulatingSupply = transactions.reduce((acc, tx) => acc + (tx.amount || 0), 0); 

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [txs, topHolders] = await Promise.all([
                    api.getPublicLedger(50),
                    api.getRichList(10)
                ]);
                setTransactions(txs);
                setRichList(topHolders);
            } catch (error) {
                console.error("Failed to load ledger", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const truncateKey = (key: string) => {
        if (!key) return 'Unknown';
        if (key.length < 16) return key;
        return `${key.substring(0, 8)}...${key.substring(key.length - 8)}`;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Header Stats */}
            <div className="bg-slate-800 p-8 rounded-xl shadow-lg text-center border border-green-900/30">
                <div className="flex justify-center mb-4">
                    <GlobeIcon className="h-16 w-16 text-green-500 animate-pulse" />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Global Public Ledger</h1>
                <p className="text-gray-400 mt-2">Transparent. Immutable. Cryptographically Verified.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <p className="text-sm text-gray-400 uppercase tracking-wider">Max Supply</p>
                        <p className="text-2xl font-mono font-bold text-yellow-400">{MAX_SUPPLY.toLocaleString()} UBT</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <p className="text-sm text-gray-400 uppercase tracking-wider">Circulating Supply</p>
                        {/* Placeholder logic for circulation */}
                        <p className="text-2xl font-mono font-bold text-green-400">{(MAX_SUPPLY * 0.12).toLocaleString()} UBT</p> 
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <p className="text-sm text-gray-400 uppercase tracking-wider">24h Transactions</p>
                        <p className="text-2xl font-mono font-bold text-blue-400">{transactions.length}</p>
                    </div>
                </div>
            </div>

            {/* Two Columns: Recent Txs & Rich List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Transactions Feed */}
                <div className="lg:col-span-2 bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <DatabaseIcon className="h-5 w-5 text-green-400" />
                            Recent Transactions
                        </h2>
                        {isLoading && <LoaderIcon className="h-5 w-5 animate-spin text-green-500" />}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-slate-900/50 text-xs uppercase font-medium text-gray-300">
                                <tr>
                                    <th className="px-4 py-3">Hash / ID</th>
                                    <th className="px-4 py-3">From</th>
                                    <th className="px-4 py-3">To</th>
                                    <th className="px-4 py-3 text-right">Amount ($UBT)</th>
                                    <th className="px-4 py-3 text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors font-mono text-xs sm:text-sm">
                                        <td className="px-4 py-3 text-green-400 truncate max-w-[100px]" title={tx.hash}>{tx.id.substring(0, 8)}...</td>
                                        <td className="px-4 py-3 text-blue-300 truncate max-w-[120px]">{truncateKey(tx.senderId)}</td>
                                        <td className="px-4 py-3 text-blue-300 truncate max-w-[120px]">{truncateKey(tx.receiverId)}</td>
                                        <td className="px-4 py-3 text-right text-white font-bold">{tx.amount.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right">{formatTimeAgo(tx.timestamp?.toDate ? tx.timestamp.toDate().toISOString() : new Date().toISOString())}</td>
                                    </tr>
                                ))}
                                {!isLoading && transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No recent transactions recorded.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Holders */}
                <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <UserCircleIcon className="h-5 w-5 text-yellow-400" />
                            Top Holders
                        </h2>
                    </div>
                    <div className="p-4 space-y-4">
                        {richList.map((holder, index) => (
                            <div key={holder.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold w-6 text-center ${index < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>#{index + 1}</span>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{holder.name}</p>
                                        <p className="text-xs text-gray-500 font-mono">{truncateKey(holder.publicKey || holder.id)}</p>
                                    </div>
                                </div>
                                <p className="font-mono text-green-400 font-bold">{(holder.ubtBalance || 0).toLocaleString()}</p>
                            </div>
                        ))}
                        {!isLoading && richList.length === 0 && (
                            <p className="text-center text-gray-500 py-4">No holders data available.</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
