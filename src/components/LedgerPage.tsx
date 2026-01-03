import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { formatTimeAgo } from '../utils';
import { TreasuryVault, UbtTransaction, GlobalEconomy, PublicUserProfile } from '../types';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';

type ExplorerView = 'ledger' | 'account' | 'transaction';

export const LedgerPage: React.FC<{ initialTarget?: { type: 'tx' | 'address', value: string } }> = ({ initialTarget }) => {
    const [view, setView] = useState<ExplorerView>(initialTarget?.type === 'address' ? 'account' : initialTarget?.type === 'tx' ? 'transaction' : 'ledger');
    const [targetValue, setTargetValue] = useState<string>(initialTarget?.value || '');
    const [accountData, setAccountData] = useState<PublicUserProfile | null>(null);
    const [selectedTx, setSelectedTx] = useState<UbtTransaction | null>(null);
    
    const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [namesMap, setNamesMap] = useState<Record<string, string>>({});

    const isExplorerSite = process.env.SITE_MODE === 'EXPLORER';

    const isCleanProtocol = (tx: UbtTransaction): boolean => {
        return tx.type !== 'SIMULATION_MINT' && !tx.id.startsWith('sim-');
    };

    // Load Live Data Stream
    useEffect(() => {
        let isMounted = true;
        const unsubLedger = api.listenForPublicLedger((txs) => {
            if (isMounted) {
                const cleanTxs = txs.filter(isCleanProtocol);
                setTransactions(cleanTxs);
                setIsLoading(false);
                
                // Fetch missing names
                const uniqueIds = Array.from(new Set(cleanTxs.flatMap(t => [t.senderId, t.receiverId])));
                uniqueIds.forEach(id => {
                    if (!namesMap[id] && id.length > 10) {
                        api.resolveNodeIdentity(id).then(res => {
                            if (res && isMounted) setNamesMap(prev => ({ ...prev, [id]: res.name }));
                        });
                    }
                });
            }
        }, 500);

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
            const found = transactions.find(t => t.id === targetValue);
            setSelectedTx(found || null);
        }
    }, [view, targetValue, transactions]);

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
        if (view === 'ledger') return transactions;
        if (view === 'account') {
            return transactions.filter(tx => 
                tx.senderId === targetValue || 
                tx.receiverId === targetValue || 
                tx.senderPublicKey === targetValue ||
                (accountData && (tx.senderId === accountData.id || tx.receiverId === accountData.id))
            );
        }
        return transactions;
    }, [transactions, view, targetValue, accountData]);

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
                    <button onClick={() => { setView('ledger'); setAccountData(null); }} className="flex items-center gap-6 group text-left">
                        <div className="p-4 bg-brand-gold rounded-[1.5rem] text-slate-950 shadow-glow-gold group-hover:scale-105 transition-all">
                            <GlobeIcon className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter uppercase gold-text leading-none">Ubuntium Scan</h1>
                            <p className="label-caps !text-[10px] !text-gray-500 !tracking-[0.4em] mt-3">Live Mainnet Explorer v5.2</p>
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
                            placeholder="Enter Transaction Hash / Node Anchor..."
                            className="w-full bg-slate-950 border border-white/10 rounded-3xl py-6 pl-16 pr-6 text-sm font-black text-white focus:ring-1 focus:ring-brand-gold/30 transition-all placeholder-gray-800 uppercase data-mono"
                        />
                    </form>
                    
                    {isExplorerSite && (
                        <button onClick={() => window.location.href = 'https://global-commons.app'} className="px-10 py-5 bg-white text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-[0.4em] hover:bg-brand-gold transition-all shadow-xl active:scale-95">
                            Enter Portal
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-12 space-y-12">
                
                {view === 'ledger' && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                        <HudMetric label="Mainnet Value" value={`$${(economy?.ubt_to_usd_rate || 0.001).toFixed(4)}`} color="text-brand-gold" />
                        <HudMetric label="Ledger Height" value={`#${transactions.length}`} color="text-white" />
                        <HudMetric label="Protocol Pulse" value="Active" color="text-emerald-500" />
                        <HudMetric label="Supply Anchor" value="15.0M" color="text-blue-400" />
                    </div>
                )}

                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-glow-matrix"></div>
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">
                            {view === 'ledger' ? 'Immutable Event Stream' : view === 'account' ? 'Node State' : 'Block Data'}
                        </h3>
                    </div>

                    {isLoading ? (
                        <div className="py-40 text-center">
                            <LoaderIcon className="h-12 w-12 animate-spin text-brand-gold mx-auto opacity-30" />
                            <p className="text-[10px] font-black text-gray-500 mt-8 uppercase tracking-[0.6em]">Indexing_Distributed_Ledger...</p>
                        </div>
                    ) : view === 'transaction' && selectedTx ? (
                        <div className="module-frame glass-module p-10 rounded-[3rem] border-white/5 space-y-10 animate-fade-in">
                             <div className="flex justify-between items-start border-b border-white/5 pb-8">
                                <div>
                                    <p className="label-caps !text-[10px] text-brand-gold mb-3">Handshake ID</p>
                                    <p className="text-2xl font-black text-white font-mono break-all">{selectedTx.id}</p>
                                </div>
                                <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest">Confirmed</span>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div><p className="label-caps !text-[8px] text-gray-500 mb-2">Timestamp</p><p className="font-bold">{new Date(selectedTx.timestamp).toLocaleString()}</p></div>
                                <div><p className="label-caps !text-[8px] text-gray-500 mb-2">Quantum Volume</p><p className="text-xl font-black font-mono">{selectedTx.amount} UBT</p></div>
                                <div><p className="label-caps !text-[8px] text-gray-500 mb-2">Oracle Value</p><p className="text-xl font-black font-mono text-emerald-500">${ubtToUsd(selectedTx.amount, selectedTx.priceAtSync)}</p></div>
                             </div>
                             <div className="bg-black/40 p-8 rounded-3xl border border-white/5 shadow-inner">
                                <p className="label-caps !text-[8px] text-gray-500 mb-4">State Signature (Ed25519)</p>
                                <p className="text-[11px] text-gray-400 font-mono break-all leading-relaxed">{selectedTx.signature}</p>
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
        </div>
    );
};

function ExplorerTable({ txs, onTx, onAccount, ubtToUsd, resolveName }: any) {
    return (
        <div className="bg-slate-900/60 rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)] backdrop-blur-3xl">
            <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] border-b border-white/5">
                            <th className="px-10 py-6">Block Sig</th>
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
                                        {tx.id.substring(0, 12)}
                                    </button>
                                </td>
                                <td className="px-10 py-6">
                                    <button onClick={() => onAccount(tx.senderId)} className="text-gray-400 hover:text-brand-gold text-[10px] truncate max-w-[150px] block font-sans font-bold">
                                        {resolveName(tx.senderId)}
                                    </button>
                                </td>
                                <td className="px-10 py-6">
                                    <button onClick={() => onAccount(tx.receiverId)} className="text-gray-400 hover:text-brand-gold text-[10px] truncate max-w-[150px] block font-sans font-bold">
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
            </div>
        </div>
    );
}

const HudMetric = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="module-frame bg-slate-950 p-6 rounded-[1.8rem] border border-white/5 shadow-inner">
        <p className="label-caps !text-[8px] text-gray-600 mb-2">{label}</p>
        <p className={`text-2xl font-black font-mono tracking-tighter ${color}`}>{value}</p>
    </div>
);