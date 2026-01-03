
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
        <div className="space-y-8 animate-fade-in text-slate-800">
             <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                            <ShieldCheckIcon className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Handshake Confirmed</h2>
                    </div>
                    <p className="text-4xl font-black text-slate-900 font-mono tracking-tighter">{tx.amount.toLocaleString()} UBT</p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Protocol Finality Established</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <DetailCard label="Timestamp" value={new Date(tx.timestamp).toLocaleString()} />
                 <DetailCard label="Network Mode" value={tx.protocol_mode} />
                 <DetailCard label="Block Signature" value={tx.id} mono />
                 <DetailCard label="State Hash" value={tx.hash} mono />
                 <div className="md:col-span-2 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Cryptographic Signature (Ed25519)</p>
                     <p className="text-[11px] text-slate-600 font-mono break-all leading-relaxed">{tx.signature}</p>
                 </div>
             </div>
             
             {tx.ledger_url && (
                 <div className="text-center pt-4">
                    <a href={tx.ledger_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-all shadow-md">
                        View Immutable Block on GitHub
                    </a>
                 </div>
             )}
        </div>
    );

    const DetailCard = ({ label, value, mono }: { label: string, value: string, mono?: boolean }) => (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-slate-900 font-bold truncate ${mono ? 'font-mono text-[11px]' : 'text-sm'}`}>{value}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32">
            {/* HEADER NAVIGATION */}
            <div className="bg-white border-b border-slate-200 px-6 sm:px-10 lg:px-20 py-8 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setView('ledger'); setAccountData(null); setSelectedTx(null); }}>
                        <div className="p-3 bg-brand-gold rounded-xl text-white">
                            <GlobeIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Ubuntium Scan</h1>
                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Network Explorer</p>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="flex-1 max-w-2xl w-full relative">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by Address / Transaction Hash..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400 uppercase"
                        />
                    </form>

                    {isExplorerSite && (
                         <button onClick={() => window.location.href = 'https://global-commons.app'} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md">
                            Login to Protocol
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-10">
                
                {/* METRICS DASHBOARD */}
                {view === 'ledger' && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 animate-fade-in">
                        <MetricBox label="UBT Value" value={`$${(economy?.ubt_to_usd_rate || 0.001).toFixed(4)}`} color="text-emerald-600" />
                        <MetricBox label="Circ. Supply" value="15,000,000" color="text-slate-900" />
                        <MetricBox label="Total Transacted" value={transactions.length.toLocaleString()} color="text-slate-900" />
                        <MetricBox label="Network Pulse" value="Live" color="text-blue-600" />
                    </div>
                )}

                {/* CONTENT AREA */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">
                            {view === 'ledger' ? 'Latest Transactions' : view === 'account' ? 'Node State' : 'Block Details'}
                        </h3>
                        {view !== 'ledger' && (
                            <button onClick={() => setView('ledger')} className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest">
                                Return to Stream
                            </button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="py-40 text-center">
                            <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold mx-auto opacity-30" />
                            <p className="text-[10px] font-bold text-slate-400 mt-6 uppercase tracking-widest">Indexing Blockchain...</p>
                        </div>
                    ) : view === 'transaction' && selectedTx ? (
                        <TransactionDetail tx={selectedTx} />
                    ) : view === 'account' && accountData ? (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6">
                                <div className="w-16 h-16 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center">
                                    <UserCircleIcon className="h-10 w-10 text-slate-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{accountData.name}</h2>
                                    <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">{accountData.circle} &bull; {accountData.role}</p>
                                </div>
                            </div>
                            <ExplorerTable txs={filteredTransactions} navigateTx={navigateTx} navigateAccount={navigateAccount} ubtToUsd={ubtToUsd} />
                        </div>
                    ) : (
                        <ExplorerTable txs={filteredTransactions} navigateTx={navigateTx} navigateAccount={navigateAccount} ubtToUsd={ubtToUsd} />
                    )}
                </div>
            </div>
        </div>
    );
};

function ExplorerTable({ txs, navigateTx, navigateAccount, ubtToUsd }: { txs: UbtTransaction[], navigateTx: any, navigateAccount: any, ubtToUsd: any }) {
    return (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                            <th className="px-8 py-4">Signature</th>
                            <th className="px-8 py-4">Time</th>
                            <th className="px-8 py-4">Sender</th>
                            <th className="px-8 py-4">Recipient</th>
                            <th className="px-8 py-4">Amount</th>
                            <th className="px-8 py-4">Type</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                        {txs.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-8 py-4">
                                    <button onClick={() => navigateTx(tx.id)} className="text-blue-600 hover:text-blue-800 text-[12px] font-mono font-bold transition-all">
                                        {tx.id.substring(0, 10).toUpperCase()}...
                                    </button>
                                </td>
                                <td className="px-8 py-4 text-[11px] text-slate-500 font-medium whitespace-nowrap">
                                    {formatTimeAgo(tx.timestamp)}
                                </td>
                                <td className="px-8 py-4">
                                    <button onClick={() => navigateAccount(tx.senderId)} className="text-slate-600 hover:text-blue-600 text-[11px] font-mono truncate max-w-[120px] block">
                                        {tx.senderId.substring(0, 12)}...
                                    </button>
                                </td>
                                <td className="px-8 py-4">
                                    <button onClick={() => navigateAccount(tx.receiverId)} className="text-slate-600 hover:text-blue-600 text-[11px] font-mono truncate max-w-[120px] block">
                                        {tx.receiverId.substring(0, 12)}...
                                    </button>
                                </td>
                                <td className="px-8 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-900">{tx.amount.toLocaleString()} UBT</span>
                                        <span className="text-[10px] text-slate-400 font-medium">≈ ${ubtToUsd(tx.amount, (tx as any).priceAtSync)}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tx.type || 'P2P'}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const MetricBox = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        <p className={`text-2xl font-black font-mono tracking-tighter ${color}`}>{value}</p>
    </div>
);
