import React, { useState, useEffect } from 'react';
import { sovereignService } from '../services/sovereignService';
import { LoaderIcon } from './icons/LoaderIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { formatTimeAgo } from '../utils';
import { UbtTransaction } from '../types';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

type ExplorerView = 'ledger' | 'transaction';

export const LedgerPage: React.FC<{ initialTarget?: { type: 'tx' | 'address', value: string } }> = ({ initialTarget }) => {
    const [view, setView] = useState<ExplorerView>(initialTarget?.type === 'tx' ? 'transaction' : 'ledger');
    const [targetValue, setTargetValue] = useState<string>(initialTarget?.value || '');
    const [selectedTx, setSelectedTx] = useState<UbtTransaction | null>(null);
    
    const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // DISCOVERY PROTOCOL: Fetch from GitHub Repo
    const syncWithGitHub = async () => {
        setIsLoading(true);
        try {
            const data = await sovereignService.fetchPublicLedger(50);
            setTransactions(data);
        } catch (e) {
            console.error("Sync Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        syncWithGitHub();
        // Poll GitHub every 60 seconds for new blocks
        const interval = setInterval(syncWithGitHub, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (view === 'transaction' && targetValue) {
            const found = transactions.find(t => t.id === targetValue);
            if (found) setSelectedTx(found);
        }
    }, [view, targetValue, transactions]);

    const navigateTx = (txid: string) => {
        setTargetValue(txid);
        setView('transaction');
        setSearchQuery('');
        window.scrollTo(0, 0);
    };

    const formatAddress = (id: string, pubKey?: string) => {
        const address = pubKey || id;
        if (!address) return "NODE_NULL";
        if (address.length < 15) return address.toUpperCase();
        return address.substring(0, 8) + '...' + address.substring(address.length - 4);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans pb-40">
            {/* SOLSCAN HEADER */}
            <header className="bg-[#111827] text-white py-4 px-6 sticky top-0 z-[100] shadow-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <button onClick={() => { setView('ledger'); setSelectedTx(null); }} className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl">
                            <GlobeIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tighter">UBUNTIUM <span className="text-blue-400">SCAN</span></h1>
                    </button>
                    
                    <div className="flex-1 max-w-2xl w-full relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-500" />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && navigateTx(searchQuery)}
                            placeholder="Search Txn Hash / Block ID"
                            className="w-full bg-[#1F2937] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-500 outline-none text-white font-mono"
                        />
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button onClick={syncWithGitHub} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <LoaderIcon className={`h-4 w-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">GitHub Ledger Live</span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
                
                {/* NETWORK STATS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatBox label="SOURCE OF TRUTH" value="GITHUB REPO" color="text-blue-600" />
                    <StatBox label="SYNC STATUS" value={isLoading ? "SYNCING..." : "UP TO DATE"} color="text-green-600" />
                    <StatBox label="TOTAL BLOCKS" value={transactions.length.toLocaleString()} />
                    <StatBox label="PROTOCOL" value="V5.2.1-MAIN" />
                </div>

                {/* MAIN DATA TABLE */}
                <div className="bg-white rounded-[2rem] border border-[#E2E8F0] shadow-sm overflow-hidden animate-fade-in">
                    <div className="bg-[#F8FAFD] px-8 py-5 border-b border-[#E2E8F0] flex justify-between items-center">
                        <h3 className="text-xs font-black text-[#64748B] uppercase tracking-[0.2em]">
                            {view === 'ledger' ? 'Latest Global Dispatches' : 'Block Verification'}
                        </h3>
                        {view !== 'ledger' && (
                             <button onClick={() => setView('ledger')} className="text-xs text-blue-600 font-bold hover:underline">Stream View</button>
                        )}
                    </div>

                    {isLoading && transactions.length === 0 ? (
                        <div className="py-32 text-center">
                            <LoaderIcon className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
                            <p className="text-xs font-bold text-gray-400 mt-6 uppercase tracking-widest">Discovering GitHub Blocks...</p>
                        </div>
                    ) : view === 'transaction' && selectedTx ? (
                        <div className="p-10 space-y-8 max-w-4xl mx-auto animate-fade-in">
                            <DetailRow label="Block Signature" value={selectedTx.id} isMono />
                            <DetailRow label="Consensus" value="GitHub Verified" isBadge />
                            <DetailRow label="Temporal Marker" value={new Date(selectedTx.timestamp).toLocaleString()} />
                            <DetailRow label="Quantum Volume" value={`${selectedTx.amount} UBT`} isStrong />
                            <DetailRow label="Origin Node" value={selectedTx.senderPublicKey || selectedTx.senderId} isMono />
                            <DetailRow label="Target Node" value={selectedTx.receiverId} isMono />
                            <DetailRow label="Proof Hash" value={selectedTx.hash} isMono isSmall />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black text-[#94A3B8] uppercase border-b border-[#E2E8F0]">
                                        <th className="px-10 py-6">Txn Block</th>
                                        <th className="px-10 py-6">Origin</th>
                                        <th className="px-10 py-6">Target</th>
                                        <th className="px-10 py-6">Volume</th>
                                        <th className="px-10 py-6">Age</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0] font-mono">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-[#F8FAFC] transition-colors text-sm group">
                                            <td className="px-10 py-6">
                                                <button onClick={() => navigateTx(tx.id)} className="text-blue-600 hover:text-blue-800 font-bold">
                                                    {tx.id.substring(0, 10)}...
                                                </button>
                                            </td>
                                            <td className="px-10 py-6 text-gray-500 text-xs">
                                                {formatAddress(tx.senderId, tx.senderPublicKey)}
                                            </td>
                                            <td className="px-10 py-6 text-gray-500 text-xs">
                                                {formatAddress(tx.receiverId)}
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="font-bold text-[#0F172A]">{tx.amount.toLocaleString()} UBT</span>
                                            </td>
                                            <td className="px-10 py-6 text-[#94A3B8] text-xs">
                                                {formatTimeAgo(tx.timestamp)}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-32 text-center text-gray-400 font-sans italic">Zero blocks found on GitHub repository.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                
                <p className="text-center text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    This data is served directly from the Ubuntium Ledger GitHub Repository.
                </p>
            </main>
        </div>
    );
};

const StatBox = ({ label, value, color }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <p className="text-[10px] font-black text-[#94A3B8] mb-2 tracking-widest">{label}</p>
        <span className={`text-xl font-black ${color || 'text-[#0F172A]'}`}>{value}</span>
    </div>
);

const DetailRow = ({ label, value, isMono, isBadge, isStrong, isSmall }: any) => (
    <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-100 pb-5 last:border-0">
        <span className="w-full sm:w-1/3 text-[11px] font-black text-[#64748B] uppercase tracking-widest">{label}</span>
        <div className="w-full sm:w-2/3 mt-2 sm:mt-0">
            {isBadge ? (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase border border-emerald-200 flex items-center gap-2 w-fit">
                    <ShieldCheckIcon className="h-3.5 w-3.5" />
                    Verified GitHub Block
                </span>
            ) : (
                <span className={`
                    ${isMono ? 'font-mono' : 'font-medium'} 
                    ${isStrong ? 'text-lg font-black text-[#0F172A]' : 'text-sm text-[#334155]'}
                    ${isSmall ? 'text-[10px] opacity-60 leading-relaxed' : ''}
                    break-all
                `}>
                    {value}
                </span>
            )}
        </div>
    </div>
);