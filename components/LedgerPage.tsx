
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
    const [selectedTx, setSelectedTx] = useState<UbtTransaction | null>(null);
    
    // Data State
    const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Rule: Public Explorer should show site mode branding if SITE_MODE is active
    const isExplorerSite = process.env.SITE_MODE === 'EXPLORER';

    // Security Filter: Only show finalized blocks
    const isCleanProtocol = (tx: UbtTransaction): boolean => {
        const isSim = tx.type === 'SIMULATION_MINT' || tx.id.startsWith('sim-');
        return !isSim;
    };

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
                    setTransactions(txs.filter(isCleanProtocol));
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

    // Identity & TX Resolution
    useEffect(() => {
        if (view === 'account' && targetValue) {
            setIsLoading(true);
            setAccountData(null);
            api.resolveNodeIdentity(targetValue).then(res => {
                setAccountData(res);
            }).finally(() => setIsLoading(false));
        }
        if (view === 'transaction' && targetValue) {
            const found = transactions.find(t => t.id === targetValue || t.hash === targetValue);
            setSelectedTx(found || null);
        }
    }, [view, targetValue, transactions]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const val = searchQuery.trim();
        if (!val) return;
        if (val.length > 30) navigateAccount(val);
        else navigateTx(val);
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
        return list;
    }, [transactions, view, targetValue, accountData]);

    const ubtToUsd = (amt: number, txPrice?: number) => {
        const price = txPrice || economy?.ubt_to_usd_rate || 0.001;
        return (amt * price).toFixed(2);
    };

    const TransactionDetail = ({ tx }: { tx: UbtTransaction }) => (
        <div className="space-y-10 animate-fade-in">
             <div className="module-frame bg-slate-900/60 p-10 rounded-[3rem] border border-brand-gold/30 shadow-glow-gold relative overflow-hidden">
                <div className="absolute inset-0 blueprint-grid opacity-[0.05] pointer-events-none"></div>
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-gold rounded-2xl text-slate-950">
                            <ShieldCheckIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-widest">Handshake Verified</h2>
                            <p className="label-caps !text-[8px] text-brand-gold mt-1">Transaction Anchor Established</p>
                        </div>
                    </div>
                    <p className="text-4xl font-black text-white font-mono tracking-tighter">{tx.amount.toLocaleString()} UBT</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <DetailCard label="Timestamp" value={new Date(tx.timestamp).toLocaleString()} />
                 <DetailCard label="Protocol Mode" value={tx.protocol_mode} />
                 <DetailCard label="Block ID" value={tx.id} mono />
                 <DetailCard label="Hash String" value={tx.hash} mono />
                 <div className="md:col-span-2 p-8 bg-black rounded-[2rem] border border-white/10">
                     <p className="label-caps !text-[9px] text-gray-500 mb-4">Cryptographic Signature (Ed25519)</p>
                     <p className="text-[10px] text-brand-gold font-mono break-all leading-loose opacity-60">{tx.signature}</p>
                 </div>
             </div>
             
             {tx.ledger_url && (
                 <div className="text-center pt-6">
                    <a href={tx.ledger_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white/10 transition-all">
                        View Immutable Block on GitHub
                    </a>
                 </div>
             )}
        </div>
    );

    const DetailCard = ({ label, value, mono }: { label: string, value: string, mono?: boolean }) => (
        <div className="p-6 bg-slate-950 rounded-[2rem] border border-white/5">
            <p className="label-caps !text-[8px] text-gray-600 mb-2">{label}</p>
            <p className={`text-white font-bold truncate ${mono ? 'font-mono text-[10px] tracking-tight' : 'text-sm'}`}>{value}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white font-sans pb-32">
            {/* EXPLORER NAVIGATION */}
            <div className="bg-slate-950 border-b border-white/5 px-6 sm:px-10 lg:px-20 py-10">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="flex items-center gap-6 cursor-pointer" onClick={() => { setView('ledger'); setAccountData(null); setSelectedTx(null); }}>
                        <div className="p-4 bg-brand-gold rounded-2xl text-slate-950 shadow-glow-gold">
                            <GlobeIcon className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter gold-text leading-none">Ubuntium Scan</h1>
                            <p className="label-caps !text-[9px] text-gray-500 mt-2 !tracking-[0.5em]">Global Common Ledger</p>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="flex-1 max-w-2xl w-full relative">
                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                            <SearchIcon className="h-6 w-6 text-gray-700" />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Address / Transaction Hash..."
                            className="w-full bg-black border border-white/10 rounded-3xl py-6 pl-16 pr-6 text-sm font-bold text-white focus:ring-1 focus:ring-brand-gold/30 transition-all placeholder-gray-800 uppercase data-mono"
                        />
                    </form>

                    {isExplorerSite && (
                         <button onClick={() => window.location.href = 'https://global-commons.app'} className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase text-[9px] tracking-widest hover:bg-white/10 transition-all">
                            Access Portal
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-12">
                
                {/* DASHBOARD METRICS */}
                {view === 'ledger' && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-16 animate-fade-in">
                        <MetricBox label="UBT Price" value={`$${(economy?.ubt_to_usd_rate || 0.001).toFixed(6)}`} color="text-brand-gold" />
                        <MetricBox label="Circulating Supply" value="15,000,000" color="text-white" />
                        <MetricBox label="Total Transacted" value={transactions.length.toLocaleString()} color="text-white" />
                        <MetricBox label="State Resonance" value="Optimal" color="text-emerald-500" />
                    </div>
                )}

                {/* VIEW RENDERER */}
                <div className="space-y-10">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">
                            {view === 'ledger' ? 'Live Handshake Stream' : view === 'account' ? 'Node Identity State' : 'Block Specification'}
                        </h3>
                        <div className="h-px flex-1 bg-white/10"></div>
                        {view !== 'ledger' && (
                            <button onClick={() => setView('ledger')} className="text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-all">
                                [ Exit View ]
                            </button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="py-40 text-center">
                            <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold mx-auto opacity-30" />
                            <p className="label-caps !text-[10px] mt-6 opacity-30 tracking-[0.4em]">Indexing_Mainnet_Blocks...</p>
                        </div>
                    ) : view === 'transaction' && selectedTx ? (
                        <TransactionDetail tx={selectedTx} />
                    ) : view === 'account' && accountData ? (
                        <div className="space-y-10">
                            <div className="module-frame glass-module p-10 rounded-[3rem] border-white/5 shadow-2xl flex items-center gap-8">
                                <div className="w-20 h-20 bg-slate-900 rounded-3xl border border-white/10 flex items-center justify-center">
                                    <UserCircleIcon className="h-12 w-12 text-gray-700" />
                                </div>
                                <div>
                                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{accountData.name}</h2>
                                    <p className="label-caps !text-[10px] text-emerald-500 mt-3">{accountData.circle} &bull; {accountData.role}</p>
                                </div>
                            </div>
                            <ExplorerTable txs={filteredTransactions} />
                        </div>
                    ) : (
                        <ExplorerTable txs={filteredTransactions} />
                    )}
                </div>
            </div>
        </div>
    );

    function ExplorerTable({ txs }: { txs: UbtTransaction[] }) {
        return (
            <div className="bg-slate-900/40 rounded-[3rem] border border-white/5 overflow-hidden shadow-premium">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] border-b border-white/5">
                                <th className="px-10 py-6">Block Signature</th>
                                <th className="px-10 py-6">Age</th>
                                <th className="px-10 py-6">Identity Origin</th>
                                <th className="px-10 py-6">Identity Target</th>
                                <th className="px-10 py-6">Quantum Volume</th>
                                <th className="px-10 py-6">Handshake</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                            {txs.map((tx) => (
                                <tr key={tx.id} className="hover:bg-brand-gold/[0.02] transition-colors group">
                                    <td className="px-10 py-6">
                                        <button onClick={() => navigateTx(tx.id)} className="text-brand-gold hover:text-white text-[11px] font-black transition-all">
                                            {tx.id.substring(0, 12).toUpperCase()}
                                        </button>
                                    </td>
                                    <td className="px-10 py-6 text-[10px] text-gray-600 uppercase font-black whitespace-nowrap">
                                        {formatTimeAgo(tx.timestamp)}
                                    </td>
                                    <td className="px-10 py-6">
                                        <button onClick={() => navigateAccount(tx.senderId)} className="text-white hover:text-brand-gold text-[10px] truncate max-w-[140px] block transition-all">
                                            {tx.senderId.substring(0, 16)}...
                                        </button>
                                    </td>
                                    <td className="px-10 py-6">
                                        <button onClick={() => navigateAccount(tx.receiverId)} className="text-white hover:text-brand-gold text-[10px] truncate max-w-[140px] block transition-all">
                                            {tx.receiverId.substring(0, 16)}...
                                        </button>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-white">{tx.amount.toLocaleString()} <span className="text-[10px] text-gray-700">UBT</span></span>
                                            <span className="text-[9px] text-emerald-500/80 font-black">≈ ${ubtToUsd(tx.amount, (tx as any).priceAtSync)} USD</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">{tx.type || 'P2P'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
};

const MetricBox = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="module-frame bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/10 shadow-xl">
        <p className="label-caps !text-[9px] text-gray-600 mb-3">{label}</p>
        <p className={`text-2xl font-black font-mono tracking-tighter ${color}`}>{value}</p>
    </div>
);
