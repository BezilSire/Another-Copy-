
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { formatTimeAgo } from '../utils';
import { UbtTransaction, GlobalEconomy, PublicUserProfile } from '../types';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';

type ExplorerView = 'ledger' | 'account' | 'transaction';

export const LedgerPage: React.FC<{ initialTarget?: { type: 'tx' | 'address', value: string } }> = ({ initialTarget }) => {
    const [view, setView] = useState<ExplorerView>(initialTarget?.type === 'address' ? 'account' : initialTarget?.type === 'tx' ? 'transaction' : 'ledger');
    const [targetValue, setTargetValue] = useState<string>(initialTarget?.value || '');
    const [accountData, setAccountData] = useState<PublicUserProfile | null>(null);
    
    const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    // Load Live Protocol Stream
    useEffect(() => {
        let isMounted = true;
        const unsubLedger = api.listenForPublicLedger((txs) => {
            if (isMounted) {
                setTransactions(txs);
                setIsLoading(false);
            }
        }, 1000);

        const unsubEcon = api.listenForGlobalEconomy((econ) => {
            if (isMounted) setEconomy(econ);
        });

        return () => { isMounted = false; unsubLedger(); unsubEcon(); };
    }, []);

    // Account Resolution Logic
    useEffect(() => {
        if (view === 'account' && targetValue) {
            setIsLoading(true);
            api.resolveNodeIdentity(targetValue).then(node => {
                setAccountData(node);
                setIsLoading(false);
            });
        }
    }, [view, targetValue]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const val = searchQuery.trim();
        if (!val) return;
        
        if (val.startsWith('UBT-') || val.length < 20) {
            setTargetValue(val);
            setView('account');
        } else {
            setTargetValue(val);
            setView('transaction');
        }
        setSearchQuery('');
    };

    const navigateAccount = (address: string) => {
        setTargetValue(address);
        setView('account');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const filteredTransactions = useMemo(() => {
        if (view === 'ledger') return transactions;
        if (view === 'account') {
            return transactions.filter(tx => 
                tx.senderId === targetValue || 
                tx.receiverId === targetValue || 
                tx.senderPublicKey === targetValue || 
                tx.receiverPublicKey === targetValue ||
                (accountData && (tx.senderId === accountData.id || tx.receiverId === accountData.id))
            );
        }
        return transactions;
    }, [transactions, view, targetValue, accountData]);

    const ubtToUsd = (amt: number) => {
        const price = economy?.ubt_to_usd_rate || 0.001;
        return (amt * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const resolveDisplayAddress = (id: string, pk?: string) => {
        // PRIORITY: Always show public key if it starts with UBT-
        if (pk && pk.startsWith('UBT-')) return pk;
        
        const sysAddrs: Record<string, string> = { 
            'GENESIS': 'UBT-GENESIS-ROOT', 
            'FLOAT': 'UBT-LIQUIDITY-POOL', 
            'SYSTEM': 'UBT-PROTOCOL-ORACLE',
            'SUSTENANCE': 'UBT-SUSTENANCE-VAULT',
            'DISTRESS': 'UBT-EMERGENCY-VAULT',
            'VENTURE': 'UBT-LAUNCHPAD-VAULT'
        };
        return sysAddrs[id] || id;
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
            {/* SOLSCAN-STYLE NAV - WHITE THEME */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-8">
                    <button onClick={() => { setView('ledger'); setAccountData(null); setTargetValue(''); }} className="flex items-center gap-3 group">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-sm group-hover:bg-blue-700 transition-colors">
                            <GlobeIcon className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-slate-900">Ubuntium<span className="text-blue-600">Scan</span></span>
                    </button>

                    <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <SearchIcon className="h-4 w-4 text-slate-400" />
                        </div>
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by Address (UBT-...) / Tx Hash..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all !p-3"
                        />
                    </form>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
                
                {/* ACCOUNT VIEW HEADER */}
                {view === 'account' && (
                    <div className="space-y-6 animate-fade-in">
                        <button onClick={() => setView('ledger')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">
                            <ArrowLeftIcon className="h-4 w-4" /> Back to Ledger
                        </button>

                        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                            <div className="flex flex-col lg:flex-row justify-between gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Account Node</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500 font-mono text-sm">{targetValue}</span>
                                            <button onClick={() => handleCopy(targetValue)} className="text-slate-400 hover:text-slate-600">
                                                {isCopied ? <ClipboardCheckIcon className="h-4 w-4 text-green-500"/> : <ClipboardIcon className="h-4 w-4"/>}
                                            </button>
                                        </div>
                                    </div>
                                    <h2 className="text-3xl font-bold text-slate-900">{accountData?.name || 'Resolving Node...'}</h2>
                                    <p className="text-slate-500 text-sm uppercase font-bold tracking-widest">{accountData?.role || 'Citizen'} | {accountData?.circle || 'Global'} Circle</p>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-center min-w-[240px]">
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Balance</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-slate-900">
                                            {isLoading ? '...' : (accountData?.ubtBalance?.toLocaleString() || '0.00')}
                                        </span>
                                        <span className="text-slate-500 font-bold">UBT</span>
                                    </div>
                                    <p className="text-emerald-600 font-bold text-sm mt-1">≈ ${ubtToUsd(accountData?.ubtBalance || 0)} USD</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TRANSACTION LIST */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 uppercase tracking-tighter">
                            {view === 'account' ? 'Node Event History' : 'Verifiable Protocol Stream'}
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">{filteredTransactions.length} blocks indexed</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-6 py-4">Block Sig</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Temporal</th>
                                    <th className="px-6 py-4">Origin Node</th>
                                    <th className="px-6 py-4">Target Node</th>
                                    <th className="px-6 py-4 text-right">Volume</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <LoaderIcon className="h-8 w-8 animate-spin text-blue-600 mx-auto opacity-20" />
                                        </td>
                                    </tr>
                                ) : filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors text-sm">
                                        <td className="px-6 py-4">
                                            <button onClick={() => { setTargetValue(tx.id); setView('transaction'); }} className="text-blue-600 hover:text-blue-800 font-medium truncate max-w-[120px] block">
                                                {tx.id}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                                                <ShieldCheckIcon className="h-3 w-3" /> Signed
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            {formatTimeAgo(tx.timestamp)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => navigateAccount(tx.senderPublicKey || tx.senderId)}
                                                className="text-blue-600 hover:text-blue-800 font-mono text-xs truncate max-w-[160px] block"
                                            >
                                                {resolveDisplayAddress(tx.senderId, tx.senderPublicKey)}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => navigateAccount(tx.receiverPublicKey || tx.receiverId)}
                                                className="text-blue-600 hover:text-blue-800 font-mono text-xs truncate max-w-[160px] block"
                                            >
                                                {resolveDisplayAddress(tx.receiverId, tx.receiverPublicKey)}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-slate-900">{tx.amount.toLocaleString()} UBT</span>
                                                <span className="text-xs text-slate-500 font-medium">≈ ${ubtToUsd(tx.amount)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {!isLoading && filteredTransactions.length === 0 && (
                            <div className="py-20 text-center space-y-3">
                                <GlobeIcon className="h-12 w-12 text-slate-200 mx-auto" />
                                <p className="text-slate-400 font-medium">No state changes found on current spectrum</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
