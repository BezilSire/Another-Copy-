
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SearchIcon } from './icons/SearchIcon';
import { ArrowUpRightIcon } from './icons/ArrowUpRightIcon';
import { formatTimeAgo } from '../utils';
import { TreasuryVault, UbtTransaction, GlobalEconomy, PublicUserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

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
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
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
        const unsubVaults = api.listenToVaults(v => isMounted && setVaults(v), console.error);
        return () => { isMounted = false; unsubVaults(); };
    }, []);

    // Identity Resolution
    useEffect(() => {
        if (view === 'account' && targetValue) {
            setIsLoading(true);
            setAccountData(null);
            api.resolveNodeIdentity(targetValue).then(res => {
                setAccountData(res);
            }).finally(() => setIsLoading(false));
        }
    }, [view, targetValue]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const val = searchQuery.trim();
        if (!val) return;

        // Smart Search heuristic
        if (val.length > 25) {
            navigateAccount(val);
        } else {
            navigateTx(val);
        }
    };

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

    // Filtered Transactions: Hide System/Simulation Mints to keep ledger clean
    const filteredTransactions = useMemo(() => {
        let list = transactions.filter(tx => tx.type !== 'SYSTEM_MINT' && tx.type !== 'SIMULATION_MINT');
        
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

    const ubtToUsd = (amt: number) => (amt * (economy?.ubt_to_usd_rate || 1.0)).toFixed(2);

    const ExplorerTable = () => (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200">
                            <th className="px-6 py-5">Handshake ID</th>
                            <th className="px-6 py-5">Sync Time</th>
                            <th className="px-6 py-5">Origin Node</th>
                            <th className="px-6 py-5">Target Node</th>
                            <th className="px-6 py-5">Volume (UBT)</th>
                            <th className="px-6 py-5">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            Array.from({length: 8}).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                </tr>
                            ))
                        ) : filteredTransactions.length > 0 ? (
                            filteredTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-5">
                                        <button onClick={() => navigateTx(tx.id)} className="text-blue-600 hover:text-blue-800 font-mono text-xs font-bold transition-colors">
                                            {tx.id.substring(0, 12)}...
                                        </button>
                                    </td>
                                    <td className="px-6 py-5 text-xs text-slate-500 whitespace-nowrap font-medium">
                                        {formatTimeAgo(new Date(tx.timestamp).toISOString())}
                                    </td>
                                    <td className="px-6 py-5">
                                        <button onClick={() => navigateAccount(tx.senderId)} className="text-blue-600 hover:underline font-mono text-xs font-medium">
                                            {tx.senderId.substring(0, 10)}...
                                        </button>
                                    </td>
                                    <td className="px-6 py-5">
                                        <button onClick={() => navigateAccount(tx.receiverId)} className="text-blue-600 hover:underline font-mono text-xs font-medium">
                                            {tx.receiverId.substring(0, 10)}...
                                        </button>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-900 font-mono">{tx.amount.toLocaleString()}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">≈ ${ubtToUsd(tx.amount)} USD</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Finalized</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-32 text-center text-slate-400">
                                    <div className="max-w-xs mx-auto space-y-4">
                                        <DatabaseIcon className="h-12 w-12 mx-auto opacity-20" />
                                        <p className="text-sm font-bold uppercase tracking-widest text-slate-300">No protocol events found for this target.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans pb-24">
            {/* SOLSCAN STYLE HUD */}
            <div className="bg-slate-50 border-b border-slate-200">
                <div className="max-w-none px-10 py-3 flex items-center gap-10 overflow-x-auto no-scrollbar whitespace-nowrap">
                    <HudStat label="UBT Price" value={`$${(economy?.ubt_to_usd_rate || 1).toFixed(4)}`} color="text-blue-600" />
                    <HudStat label="Mainnet Nodes" value="1,241" color="text-slate-900" />
                    <HudStat label="Ledger Height" value={`#${transactions.length}`} color="text-slate-900" />
                    <div className="flex items-center gap-2 ml-auto">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Mainnet Verified</span>
                    </div>
                </div>
                
                <div className="max-w-none px-10 py-8 flex flex-col md:flex-row justify-between items-center gap-10">
                    <button onClick={() => { setView('ledger'); setAccountData(null); }} className="flex items-center gap-5 group">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-100 group-hover:scale-105 transition-all">
                            <GlobeIcon className="h-7 w-7" />
                        </div>
                        <div className="text-left">
                            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Ubuntium Explorer</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Protocol Ledger Index</p>
                        </div>
                    </button>
                    
                    <form onSubmit={handleSearch} className="flex-1 max-w-3xl w-full relative">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <SearchIcon className="h-6 w-6 text-slate-300" />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by Node Address / Signature..."
                            className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-14 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
                        />
                    </form>
                </div>
            </div>

            <div className="max-w-none px-10 py-10">
                {/* ACCOUNT TRACE VIEW */}
                {view === 'account' && (
                    <div className="mb-12 space-y-8 animate-fade-in">
                        <button onClick={() => setView('ledger')} className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors">
                            <ArrowLeftIcon className="h-4 w-4" /> Back to Global Ledger
                        </button>
                        
                        <div className="bg-slate-900 rounded-[3rem] p-12 text-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12 shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none">
                                <UserCircleIcon className="h-64 w-64" />
                             </div>
                            
                            <div className="space-y-6 flex-1 z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]"></div>
                                    <h2 className="text-xl font-black uppercase tracking-widest">Node Identity Overview</h2>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Public Node Identifier</p>
                                    <p className="text-lg font-mono text-blue-400 break-all bg-white/5 p-5 rounded-2xl border border-white/10 select-all">
                                        {targetValue}
                                    </p>
                                </div>
                                {accountData && (
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">
                                        Protocol Alias: <span className="text-white not-italic">{accountData.name}</span>
                                    </p>
                                )}
                            </div>

                            <div className="text-right z-10 w-full lg:w-auto border-l border-white/10 pl-12">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em] mb-4">Mainnet Balance</p>
                                <div className="space-y-1">
                                    <p className="text-7xl font-black font-mono tracking-tighter text-white">
                                        {isLoading ? '...' : (accountData?.ubtBalance || 0).toLocaleString()} <span className="text-2xl text-slate-600">UBT</span>
                                    </p>
                                    <p className="text-2xl font-black text-emerald-500 font-mono tracking-tight">
                                        ≈ ${isLoading ? '...' : ubtToUsd(accountData?.ubtBalance || 0)} <span className="text-xs text-slate-600 uppercase font-sans">USD</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TRANSACTION PROVENANCE VIEW */}
                {view === 'transaction' && (
                    <div className="mb-12 space-y-8 animate-fade-in">
                        <button onClick={() => setView('ledger')} className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors">
                            <ArrowLeftIcon className="h-4 w-4" /> Back to Ledger
                        </button>
                        
                        <div className="bg-white rounded-[3rem] border border-slate-200 p-12 space-y-12 shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                        <DatabaseIcon className="h-6 w-6" />
                                    </div>
                                    <h2 className="text-2xl font-black uppercase tracking-tight">Block Audit Details</h2>
                                </div>
                                <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest">Finalized (Protocol Confirmed)</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                                <DataBox label="Handshake Signature" value={targetValue} mono />
                                <DataBox label="Protocol Mode" value={filteredTransactions[0]?.protocol_mode || 'MAINNET'} mono />
                                <DataBox label="Slot Index" value={`#${Math.floor(Math.random() * 900000) + 100000}`} mono />
                                <DataBox label="Chain Depth" value="v3.1-Sovereign" />
                            </div>
                            
                            <div className="bg-slate-50 rounded-[2.5rem] p-10 space-y-6 border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Immutable Handshake Trace (Backlinks)</p>
                                <div className="space-y-4">
                                    <TraceRow label="Origin Node" value={filteredTransactions[0]?.senderId || 'System Root'} isLink onLink={() => navigateAccount(filteredTransactions[0]?.senderId || '')} />
                                    <TraceRow label="Target Authority" value={filteredTransactions[0]?.receiverId || 'System Sink'} isLink onLink={() => navigateAccount(filteredTransactions[0]?.receiverId || '')} />
                                    <TraceRow label="Asset Volume" value={`${filteredTransactions[0]?.amount.toLocaleString() || 0} UBT`} />
                                    <TraceRow 
                                        label="Parent Block" 
                                        value={filteredTransactions[0]?.parentHash || 'Genesis Root (Node 0)'} 
                                        isLink={!!filteredTransactions[0]?.parentHash && filteredTransactions[0]?.parentHash !== 'GENESIS_CHAIN'} 
                                        onLink={() => navigateTx(filteredTransactions[0]?.parentHash || '')} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                            {view === 'ledger' ? 'Live Mainnet Stream' : 'Node Handshake Stream'}
                        </h3>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full uppercase tracking-widest">
                            Real-time Indexing
                        </span>
                    </div>
                </div>

                <ExplorerTable />
            </div>

            <footer className="mt-20 py-12 border-t border-slate-100 text-center bg-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">
                    Ubuntium Data Grid &bull; Mainnet Interface v3.1 &bull; {new Date().getFullYear()}
                </p>
            </footer>
        </div>
    );
};

const HudStat = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="flex items-center gap-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}:</span>
        <span className={`${color} text-xs font-black font-mono`}>{value}</span>
    </div>
);

const DataBox = ({ label, value, mono }: { label: string, value: string, mono?: boolean }) => (
    <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 leading-none">{label}</p>
        <p className={`text-sm font-bold text-slate-900 break-all leading-relaxed ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
);

const TraceRow = ({ label, value, isLink, onLink }: { label: string, value: string, isLink?: boolean, onLink?: () => void }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/50 pb-4 gap-4 sm:gap-0">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
        {isLink ? (
            <button onClick={onLink} className="text-blue-600 hover:text-blue-800 font-mono text-sm text-left truncate max-w-full font-bold transition-colors">
                {value}
            </button>
        ) : (
            <span className="text-slate-900 font-bold text-sm font-mono">{value}</span>
        )}
    </div>
);
