
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/apiService';
import { sovereignService } from '../services/sovereignService';
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
    const [view, setView] = useState<ExplorerView>('ledger');
    const [targetValue, setTargetValue] = useState<string>('');
    const [accountData, setAccountData] = useState<PublicUserProfile | null>(null);
    const [selectedTx, setSelectedTx] = useState<UbtTransaction | null>(null);
    
    const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [namesMap, setNamesMap] = useState<Record<string, string>>({});
    const [isCopied, setIsCopied] = useState(false);

    const isExplorerSite = process.env.SITE_MODE === 'EXPLORER';

    // Deep Linking Protocol
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const txHash = params.get('tx');
        const addr = params.get('address');

        if (txHash) {
            setTargetValue(txHash);
            setView('transaction');
        } else if (addr) {
            setTargetValue(addr);
            setView('account');
        } else if (initialTarget) {
            setTargetValue(initialTarget.value);
            setView(initialTarget.type === 'address' ? 'account' : 'transaction');
        }
    }, [initialTarget]);

    useEffect(() => {
        let isMounted = true;
        
        const unsubLedger = api.listenForPublicLedger((txs) => {
            if (isMounted) {
                setTransactions(txs);
                setIsLoading(false);
                
                const uniqueIds = Array.from(new Set(txs.flatMap(t => [t.senderId, t.receiverId])));
                uniqueIds.forEach(id => {
                    if (!namesMap[id] && id.length > 10) {
                        api.resolveNodeIdentity(id).then(res => {
                            if (res && isMounted) setNamesMap(prev => ({ ...prev, [id]: res.name }));
                        });
                    }
                });
            }
        }, 100);

        const unsubEcon = api.listenForGlobalEconomy((econ) => {
            if (isMounted) setEconomy(econ);
        });

        return () => { isMounted = false; unsubLedger(); unsubEcon(); };
    }, []);

    useEffect(() => {
        if (view === 'account' && targetValue) {
            api.resolveNodeIdentity(targetValue).then(setAccountData);
        }
        if (view === 'transaction' && targetValue) {
            // Find in local pool first, if not, wait for full chain sync
            const found = transactions.find(t => t.id === targetValue || t.hash === targetValue);
            if (found) setSelectedTx(found);
        }
    }, [view, targetValue, transactions]);

    const navigateAccount = (address: string) => {
        setTargetValue(address);
        setView('account');
        setSearchQuery('');
        const url = new URL(window.location.href);
        url.searchParams.set('address', address);
        url.searchParams.delete('tx');
        window.history.pushState({}, '', url);
        window.scrollTo(0, 0);
    };

    const navigateTx = (txid: string) => {
        setTargetValue(txid);
        setView('transaction');
        setSearchQuery('');
        const url = new URL(window.location.href);
        url.searchParams.set('tx', txid);
        url.searchParams.delete('address');
        window.history.pushState({}, '', url);
        window.scrollTo(0, 0);
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

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const ubtToUsd = (amt: number, txPrice?: number) => {
        const price = txPrice || economy?.ubt_to_usd_rate || 0.001;
        return (amt * price).toFixed(4);
    };

    const resolveName = (id: string) => {
        const systemNodes: Record<string, string> = {
            'GENESIS': 'GENESIS_ROOT',
            'FLOAT': 'LIQUIDITY_FLOAT',
            'SYSTEM': 'PROTOCOL_ORACLE',
            'SUSTENANCE': 'SUSTENANCE_RESERVE',
            'DISTRESS': 'EMERGENCY_FUND',
            'VENTURE': 'LAUNCHPAD_TREASURY'
        };
        return systemNodes[id] || namesMap[id] || id.substring(0, 12).toUpperCase();
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans pb-32">
            <div className="bg-slate-950 border-b border-white/5 py-10 px-6 sm:px-10 lg:px-20 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 relative z-10">
                    <button onClick={() => { setView('ledger'); setAccountData(null); window.history.pushState({}, '', window.location.pathname); }} className="flex items-center gap-6 group text-left">
                        <div className="p-4 bg-brand-gold rounded-[1.5rem] text-slate-950 shadow-glow-gold group-hover:scale-105 transition-all">
                            <GlobeIcon className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter uppercase gold-text leading-none">Ubuntium Scan</h1>
                            <p className="label-caps !text-[10px] !text-gray-500 !tracking-[0.4em] mt-3">Live Network State v5.2</p>
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
                            placeholder="Enter TX Hash / Node Address..."
                            className="w-full bg-slate-950 border border-white/10 rounded-3xl py-6 pl-16 pr-6 text-sm font-black text-white focus:ring-1 focus:ring-brand-gold/30 transition-all placeholder-gray-800 uppercase data-mono"
                        />
                    </form>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-12 space-y-12">
                {isLoading ? (
                    <div className="py-40 text-center">
                        <LoaderIcon className="h-12 w-12 animate-spin text-brand-gold mx-auto opacity-30" />
                        <p className="text-[10px] font-black text-gray-500 mt-8 uppercase tracking-[0.6em]">Syncing_Physical_Ledger...</p>
                    </div>
                ) : view === 'transaction' && selectedTx ? (
                    <div className="max-w-3xl mx-auto animate-fade-in space-y-8">
                         <button onClick={() => setView('ledger')} className="inline-flex items-center text-[10px] font-black text-brand-gold uppercase tracking-[0.4em] hover:text-white transition-colors">
                            <ArrowLeftIcon className="h-4 w-4 mr-2" /> Global Stream
                        </button>

                        <div className="module-frame glass-module p-10 rounded-[3.5rem] border-emerald-500/20 shadow-glow-matrix relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <ShieldCheckIcon className="h-24 w-24 text-emerald-500" />
                            </div>
                            
                            <div className="mb-12 flex justify-between items-start">
                                <div>
                                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest">Sovereign Evidence Protocol</span>
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mt-4 leading-none">Immutable Receipt</h2>
                                </div>
                                <button onClick={() => handleCopy(window.location.href)} className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white border border-white/10 transition-all flex items-center gap-2">
                                    {isCopied ? <ClipboardCheckIcon className="h-4 w-4 text-emerald-500"/> : <ClipboardIcon className="h-4 w-4"/>}
                                    <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Share Proof</span>
                                </button>
                            </div>

                            <div className="space-y-8 data-mono">
                                <ReceiptRow label="TXID_SIGNATURE" value={selectedTx.id} />
                                <ReceiptRow label="CRYPTOGRAPHIC_HASH" value={selectedTx.hash} />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                                    <ReceiptCol label="TEMPORAL_MARKER" value={new Date(selectedTx.timestamp).toLocaleString()} />
                                    <ReceiptCol label="ACTION_TYPE" value={selectedTx.type || 'P2P_DISPATCH'} />
                                    <ReceiptCol label="VOLUME" value={`${selectedTx.amount} UBT`} isGold />
                                    <ReceiptCol label="EST_VALUATION" value={`$${ubtToUsd(selectedTx.amount, selectedTx.priceAtSync)}`} isEmerald />
                                </div>
                                
                                <div className="pt-8 border-t border-white/5 space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Origin Node</p>
                                        <button onClick={() => navigateAccount(selectedTx.senderPublicKey || selectedTx.senderId)} className="text-left text-xs font-bold text-brand-gold hover:text-white break-all">
                                            {selectedTx.senderPublicKey || selectedTx.senderId}
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Destination Node</p>
                                        <button onClick={() => navigateAccount(selectedTx.receiverPublicKey || selectedTx.receiverId)} className="text-left text-xs font-bold text-brand-gold hover:text-white break-all">
                                            {selectedTx.receiverPublicKey || selectedTx.receiverId}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-black/60 p-6 rounded-2xl border border-white/5 shadow-inner mt-8">
                                    <p className="text-[8px] text-gray-500 font-black uppercase tracking-[0.4em] mb-4">Integrity Seal (ED25519)</p>
                                    <p className="text-[10px] text-gray-400 break-all leading-relaxed lowercase">{selectedTx.signature}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : view === 'account' && accountData ? (
                    <div className="space-y-10 animate-fade-in">
                         <div className="module-frame glass-module p-10 rounded-[3rem] border-white/5 flex items-center gap-8 shadow-2xl">
                            <div className="w-20 h-20 bg-slate-900 rounded-3xl border border-white/10 flex items-center justify-center">
                                <ShieldCheckIcon className="h-10 w-10 text-gray-600" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{accountData.name}</h2>
                                <p className="label-caps !text-[9px] text-emerald-500 mt-3 font-black tracking-[0.4em]">{accountData.role} Node &bull; {accountData.circle} Circle</p>
                            </div>
                         </div>
                         <ExplorerTable txs={filteredTransactions} onTx={navigateTx} onAccount={navigateAccount} ubtToUsd={ubtToUsd} resolveName={resolveName} />
                    </div>
                ) : (
                    <ExplorerTable txs={filteredTransactions} onTx={navigateTx} onAccount={navigateAccount} ubtToUsd={ubtToUsd} resolveName={resolveName} />
                )}
            </div>
        </div>
    );
};

const ReceiptRow = ({ label, value }: { label: string, value: string }) => (
    <div className="space-y-2">
        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-black text-white break-all lowercase opacity-80">{value}</p>
    </div>
);

const ReceiptCol = ({ label, value, isGold, isEmerald }: { label: string, value: string, isGold?: boolean, isEmerald?: boolean }) => (
    <div className="space-y-1">
        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{label}</p>
        <p className={`text-lg font-black tracking-tight ${isGold ? 'text-brand-gold' : isEmerald ? 'text-emerald-500' : 'text-white'}`}>{value}</p>
    </div>
);

function ExplorerTable({ txs, onTx, onAccount, ubtToUsd, resolveName }: any) {
    return (
        <div className="bg-slate-900/60 rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)] backdrop-blur-3xl">
            <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] border-b border-white/5">
                            <th className="px-10 py-6">Block Signature</th>
                            <th className="px-10 py-6">Origin</th>
                            <th className="px-10 py-6">Target</th>
                            <th className="px-10 py-6">Volume</th>
                            <th className="px-10 py-6">Temporal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                        {txs.map((tx: any) => (
                            <tr key={tx.id} className="hover:bg-brand-gold/[0.02] transition-colors group">
                                <td className="px-10 py-6">
                                    <button onClick={() => onTx(tx.id)} className="text-brand-gold hover:text-white text-[11px] font-black transition-all uppercase">
                                        {tx.id.substring(0, 14)}...
                                    </button>
                                </td>
                                <td className="px-10 py-6">
                                    <button onClick={() => onAccount(tx.senderPublicKey || tx.senderId)} className="text-gray-400 hover:text-brand-gold text-[10px] truncate max-w-[150px] block font-sans font-bold">
                                        {resolveName(tx.senderId)}
                                    </button>
                                </td>
                                <td className="px-10 py-6">
                                    <button onClick={() => onAccount(tx.receiverPublicKey || tx.receiverId)} className="text-gray-400 hover:text-brand-gold text-[10px] truncate max-w-[150px] block font-sans font-bold">
                                        {resolveName(tx.receiverId)}
                                    </button>
                                </td>
                                <td className="px-10 py-6">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-white">{tx.amount.toLocaleString()} <span className="text-[9px] text-gray-700">UBT</span></span>
                                        <span className="text-[9px] text-emerald-500 font-black">≈ ${ubtToUsd(tx.amount, tx.priceAtSync)}</span>
                                    </div>
                                </td>
                                <td className="px-10 py-6">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">
                                        {formatTimeAgo(tx.timestamp)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {txs.length === 0 && (
                    <div className="py-40 text-center opacity-30">
                        <p className="label-caps !text-[12px] !tracking-[0.6em]">No Ledger Events Indexed</p>
                    </div>
                )}
            </div>
        </div>
    );
}
