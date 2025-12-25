import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { formatTimeAgo } from '../utils';
import { TreasuryVault, UbtTransaction, GlobalEconomy, PublicUserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';

type ExplorerView = 'ledger' | 'account' | 'transaction';

export const LedgerPage: React.FC<{ initialTarget?: { type: 'tx' | 'address', value: string } }> = ({ initialTarget }) => {
    const { currentUser } = useAuth();
    
    // Explorer State
    const [view, setView] = useState<ExplorerView>(initialTarget?.type === 'address' ? 'account' : initialTarget?.type === 'tx' ? 'transaction' : 'ledger');
    const [targetValue, setTargetValue] = useState<string>(initialTarget?.value || '');
    const [accountData, setAccountData] = useState<PublicUserProfile | null>(null);
    
    // Data State
    const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Load Base Data
    useEffect(() => {
        let isMounted = true;
        const loadBaseData = async () => {
            setIsLoading(true);
            try {
                const [txs, econ] = await Promise.all([
                    api.getPublicLedger(500),
                    new Promise<GlobalEconomy | null>((resolve) => api.listenForGlobalEconomy(resolve, () => resolve(null)))
                ]);
                if (isMounted) {
                    setTransactions(txs);
                    setEconomy(econ as GlobalEconomy);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        loadBaseData();
        return () => { isMounted = false; };
    }, []);

    const navigateAccount = (address: string) => {
        setTargetValue(address);
        setView('account');
        setSearchQuery('');
        window.scrollTo(0, 0);
    };

    const navigateTx = (txid: string) => {
        setTargetValue(txid);
        setView('transaction');
        setSearchQuery('');
        window.scrollTo(0, 0);
    };

    const filteredTransactions = useMemo(() => {
        let list = transactions;
        if (view === 'ledger') return list;
        if (view === 'account') {
            return list.filter(tx => 
                tx.senderId === targetValue || 
                tx.receiverId === targetValue || 
                tx.senderPublicKey === targetValue ||
                (accountData && (tx.senderId === accountData.id || tx.receiverId === accountData.id))
            );
        }
        if (view === 'transaction') {
            return list.filter(tx => tx.id === targetValue || tx.hash === targetValue);
        }
        return list;
    }, [transactions, view, targetValue, accountData]);

    const ubtToUsd = (amt: number, txPrice?: number) => {
        const price = txPrice || economy?.ubt_to_usd_rate || 0.001;
        return (amt * price).toFixed(6);
    };

    const ExplorerTable = () => (
        <div className="bg-slate-900/60 rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl backdrop-blur-3xl">
            <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] border-b border-white/5">
                            <th className="px-8 py-6">Block Signature</th>
                            <th className="px-8 py-6">Identity Origin</th>
                            <th className="px-8 py-6">Identity Target</th>
                            <th className="px-8 py-6">Asset Volume</th>
                            <th className="px-8 py-6">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                        {isLoading ? (
                            <tr><td colSpan={5} className="py-20 text-center"><LoaderIcon className="h-8 w-8 animate-spin mx-auto text-brand-gold opacity-50"/></td></tr>
                        ) : filteredTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-brand-gold/[0.02] transition-colors group">
                                <td className="px-8 py-6">
                                    <button onClick={() => navigateTx(tx.id)} className="text-brand-gold hover:text-white text-[10px] font-black transition-all">
                                        {tx.id.substring(0, 12).toUpperCase()}
                                    </button>
                                </td>
                                <td className="px-8 py-6">
                                    <button onClick={() => navigateAccount(tx.senderId)} className="text-gray-300 hover:text-brand-gold text-[10px] truncate max-w-[120px] block">
                                        {tx.senderId}
                                    </button>
                                </td>
                                <td className="px-8 py-6">
                                    <button onClick={() => navigateAccount(tx.receiverId)} className="text-gray-300 hover:text-brand-gold text-[10px] truncate max-w-[120px] block">
                                        {tx.receiverId}
                                    </button>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-white">{tx.amount.toLocaleString()} <span className="text-[9px] text-gray-700">UBT</span></span>
                                        <span className="text-[9px] text-emerald-500/80 font-black">≈ ${ubtToUsd(tx.amount, tx.priceAtSync)} USD</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">Finalized</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white font-sans pb-32 px-4">
            <div className="max-w-7xl mx-auto space-y-12 py-12">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                    <button onClick={() => { setView('ledger'); setAccountData(null); }} className="flex items-center gap-6 group">
                        <div className="p-4 bg-brand-gold rounded-[1.5rem] text-slate-950 shadow-glow-gold group-hover:scale-105 transition-all">
                            <GlobeIcon className="h-8 w-8" />
                        </div>
                        <div className="text-left">
                            <h1 className="text-4xl font-black tracking-tighter uppercase gold-text leading-none">Global Explorer</h1>
                            <p className="label-caps !text-[10px] !text-gray-500 !tracking-[0.4em] mt-3">Immutable Common Ledger</p>
                        </div>
                    </button>
                    
                    <form onSubmit={(e) => { e.preventDefault(); navigateTx(searchQuery); }} className="flex-1 max-w-2xl w-full relative">
                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                            <SearchIcon className="h-6 w-6 text-gray-700" />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search Node Identifier / Handshake Signature..."
                            className="w-full bg-slate-950 border border-white/10 rounded-3xl py-6 pl-16 pr-6 text-sm font-bold text-white focus:ring-1 focus:ring-brand-gold/30 transition-all placeholder-gray-800 uppercase data-mono"
                        />
                    </form>
                </div>

                <div className="flex items-center gap-10 overflow-x-auto no-scrollbar whitespace-nowrap pt-4">
                    <HudStat label="Equilibrium Price" value={`$${(economy?.ubt_to_usd_rate || 0).toFixed(6)}`} color="text-brand-gold" />
                    <HudStat label="Sync Frequency" value="8s avg" color="text-gray-400" />
                    <HudStat label="Ledger Depth" value={`#${transactions.length}`} color="text-gray-400" />
                    <div className="flex items-center gap-2 ml-auto">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Protocol Synchronized</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 mb-10">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Mainnet Event Stream</h3>
                    <div className="h-px flex-1 bg-white/5"></div>
                </div>

                <ExplorerTable />
            </div>
        </div>
    );
};

const HudStat = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="flex items-center gap-3">
        <span className="label-caps !text-[8px] text-gray-600">{label}</span>
        <span className={`${color} text-sm font-black font-mono tracking-tighter`}>{value}</span>
    </div>
);
