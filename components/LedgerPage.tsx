import React, { useState, useEffect, useMemo } from 'react';
import { sovereignService } from '../services/sovereignService';
import { LoaderIcon } from './icons/LoaderIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { formatTimeAgo } from '../utils';
import { UbtTransaction } from '../types';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

type ExplorerView = 'ledger' | 'account' | 'transaction';

export const LedgerPage: React.FC<{ initialTarget?: { type: 'tx' | 'address', value: string } }> = ({ initialTarget }) => {
    const [view, setView] = useState<ExplorerView>(initialTarget?.type === 'address' ? 'account' : initialTarget?.type === 'tx' ? 'transaction' : 'ledger');
    const [targetValue, setTargetValue] = useState<string>(initialTarget?.value || '');
    const [selectedTx, setSelectedTx] = useState<UbtTransaction | null>(null);
    
    const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const syncWithGitHub = async () => {
        setIsLoading(true);
        try {
            // Fetch more for balance calculation accuracy in public view
            const data = await sovereignService.fetchPublicLedger(100);
            setTransactions(data);
        } catch (e) {
            console.error("Sync Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        syncWithGitHub();
        const interval = setInterval(syncWithGitHub, 60000);
        return () => clearInterval(interval);
    }, []);

    // Account Detail Logic
    const accountViewData = useMemo(() => {
        if (view !== 'account' || !targetValue) return null;
        
        const history = transactions.filter(t => 
            t.senderId === targetValue || 
            t.receiverId === targetValue ||
            t.senderPublicKey === targetValue ||
            t.receiverPublicKey === targetValue
        );

        // Calculate balance from history (Total In - Total Out)
        const balance = history.reduce((acc, t) => {
            const isReceiver = t.receiverId === targetValue || t.receiverPublicKey === targetValue;
            return isReceiver ? acc + t.amount : acc - t.amount;
        }, 0);

        return { balance, history };
    }, [view, targetValue, transactions]);

    const navigateAccount = (address: string) => {
        setTargetValue(address);
        setView('account');
        setSearchQuery('');
        window.scrollTo(0, 0);
    };

    const navigateTx = (txid: string) => {
        const found = transactions.find(t => t.id === txid);
        if (found) {
            setSelectedTx(found);
            setView('transaction');
            setSearchQuery('');
            window.scrollTo(0, 0);
        }
    };

    const resolveDisplayName = (id: string, pubKey?: string) => {
        const systemNodes: Record<string, string> = {
            'GENESIS': 'GENESIS_ROOT',
            'FLOAT': 'LIQUIDITY_FLOAT',
            'SUSTENANCE': 'RESERVE_NODE',
            'DISTRESS': 'EMERGENCY_VAULT',
            'SYSTEM': 'PROTOCOL_ORACLE'
        };
        if (systemNodes[id]) return systemNodes[id];
        
        // PRIORITIZE PUBLIC KEY
        const address = pubKey || id;
        if (address.length < 15) return address.toUpperCase();
        return address.substring(0, 8) + '...' + address.substring(address.length - 4);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans pb-40">
            {/* SOLSCAN HEADER */}
            <header className="bg-[#111827] text-white py-4 px-6 sticky top-0 z-[100] shadow-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <button onClick={() => { setView('ledger'); setSelectedTx(null); }} className="flex items-center gap-3 group">
                        <div className="p-2 bg-blue-600 rounded-xl group-hover:scale-110 transition-transform">
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
                            onKeyDown={e => e.key === 'Enter' && (searchQuery.startsWith('UBT-') ? navigateAccount(searchQuery) : navigateTx(searchQuery))}
                            placeholder="Search Node Address / Txn Block"
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
                    <StatBox label="BLOCK HEIGHT" value={transactions.length > 0 ? `#${transactions.length}` : "SYNCING..."} color="text-blue-600" />
                    <StatBox label="TOTAL SUPPLY" value="15,000,000 UBT" color="text-[#0F172A]" />
                    <StatBox label="SYNC STATUS" value={isLoading ? "UPDATING..." : "LIVE"} color="text-green-600" />
                    <StatBox label="PROTOCOL" value="V5.2.1-MAIN" />
                </div>

                {/* MAIN CONTENT AREA */}
                {view === 'account' && accountViewData ? (
                    <div className="animate-fade-in space-y-8">
                         <button onClick={() => setView('ledger')} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors">
                            <ArrowLeftIcon className="h-4 w-4" /> Back to Global Stream
                        </button>
                        
                        <div className="bg-white rounded-[2rem] border border-[#E2E8F0] p-10 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
                            <div className="flex items-center gap-6">
                                <div className="p-5 bg-blue-50 rounded-[1.5rem] border border-blue-100">
                                    <UserCircleIcon className="h-12 w-12 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Node Identity</h2>
                                    <p className="text-2xl font-black font-mono break-all">{targetValue}</p>
                                </div>
                            </div>
                            <div className="text-center md:text-right">
                                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Calculated Balance</h2>
                                <p className="text-4xl font-black text-blue-600 font-mono">{accountViewData.balance.toLocaleString()} <span className="text-xl">UBT</span></p>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-[#E2E8F0] shadow-sm overflow-hidden">
                            <div className="bg-[#F8FAFD] px-8 py-5 border-b border-[#E2E8F0]">
                                <h3 className="text-xs font-black text-[#64748B] uppercase tracking-[0.2em]">Temporal Node History</h3>
                            </div>
                            <TxTable txs={accountViewData.history} navigateAccount={navigateAccount} navigateTx={navigateTx} resolveDisplayName={resolveDisplayName} />
                        </div>
                    </div>
                ) : view === 'transaction' && selectedTx ? (
                    <div className="p-10 bg-white rounded-[2rem] border border-[#E2E8F0] space-y-8 max-w-4xl mx-auto animate-fade-in shadow-sm">
                        <button onClick={() => setView('ledger')} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors">
                            <ArrowLeftIcon className="h-4 w-4" /> Back to Global Stream
                        </button>
                        <DetailRow label="Block Signature" value={selectedTx.id} isMono />
                        <DetailRow label="Consensus" value="GitHub Verified" isBadge />
                        <DetailRow label="Temporal Marker" value={new Date(selectedTx.timestamp).toLocaleString()} />
                        <DetailRow label="Quantum Volume" value={`${selectedTx.amount} UBT`} isStrong />
                        <DetailRow label="Origin Node" value={selectedTx.senderPublicKey || selectedTx.senderId} isMono isLink onClick={() => navigateAccount(selectedTx.senderPublicKey || selectedTx.senderId)} />
                        <DetailRow label="Target Node" value={selectedTx.receiverPublicKey || selectedTx.receiverId} isMono isLink onClick={() => navigateAccount(selectedTx.receiverPublicKey || selectedTx.receiverId)} />
                        <DetailRow label="Proof Hash" value={selectedTx.hash} isMono isSmall />
                    </div>
                ) : (
                    <div className="bg-white rounded-[2rem] border border-[#E2E8F0] shadow-sm overflow-hidden animate-fade-in">
                        <div className="bg-[#F8FAFD] px-8 py-5 border-b border-[#E2E8F0]">
                            <h3 className="text-xs font-black text-[#64748B] uppercase tracking-[0.2em]">Latest Global Dispatches</h3>
                        </div>
                        <TxTable txs={transactions} navigateAccount={navigateAccount} navigateTx={navigateTx} resolveDisplayName={resolveDisplayName} />
                    </div>
                )}
                
                <p className="text-center text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    The Ubuntium Mycelium Layer is a trustless, account-based view of the physical GitHub Ledger.
                </p>
            </main>
        </div>
    );
};

const TxTable = ({ txs, navigateAccount, navigateTx, resolveDisplayName }: any) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="text-[10px] font-black text-[#94A3B8] uppercase border-b border-[#E2E8F0]">
                    <th className="px-10 py-6">Block</th>
                    <th className="px-10 py-6">Origin Node</th>
                    <th className="px-10 py-6">Target Node</th>
                    <th className="px-10 py-6">Volume</th>
                    <th className="px-10 py-6">Age</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono">
                {txs.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-[#F8FAFC] transition-colors text-sm group">
                        <td className="px-10 py-6">
                            <button onClick={() => navigateTx(tx.id)} className="text-blue-600 hover:text-blue-800 font-bold">
                                {tx.id.substring(0, 10)}...
                            </button>
                        </td>
                        <td className="px-10 py-6">
                            <button onClick={() => navigateAccount(tx.senderPublicKey || tx.senderId)} className="text-gray-500 hover:text-blue-600 transition-colors font-bold">
                                {resolveDisplayName(tx.senderId, tx.senderPublicKey)}
                            </button>
                        </td>
                        <td className="px-10 py-6">
                            <button onClick={() => navigateAccount(tx.receiverPublicKey || tx.receiverId)} className="text-gray-500 hover:text-blue-600 transition-colors font-bold">
                                {resolveDisplayName(tx.receiverId, tx.receiverPublicKey)}
                            </button>
                        </td>
                        <td className="px-10 py-6">
                            <span className="font-bold text-[#0F172A]">{tx.amount.toLocaleString()} UBT</span>
                        </td>
                        <td className="px-10 py-6 text-[#94A3B8] text-xs">
                            {formatTimeAgo(tx.timestamp)}
                        </td>
                    </tr>
                ))}
                {txs.length === 0 && (
                    <tr>
                        <td colSpan={5} className="py-32 text-center text-gray-400 font-sans italic">Zero blocks indexed in this node state.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const StatBox = ({ label, value, color }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <p className="text-[10px] font-black text-[#94A3B8] mb-2 tracking-widest">{label}</p>
        <span className={`text-xl font-black ${color || 'text-[#0F172A]'}`}>{value}</span>
    </div>
);

const DetailRow = ({ label, value, isMono, isBadge, isStrong, isSmall, isLink, onClick }: any) => (
    <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-100 pb-5 last:border-0">
        <span className="w-full sm:w-1/3 text-[11px] font-black text-[#64748B] uppercase tracking-widest">{label}</span>
        <div className="w-full sm:w-2/3 mt-2 sm:mt-0">
            {isBadge ? (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase border border-emerald-200 flex items-center gap-2 w-fit">
                    <ShieldCheckIcon className="h-3.5 w-3.5" />
                    Verified GitHub Block
                </span>
            ) : isLink ? (
                <button onClick={onClick} className="text-blue-600 hover:underline font-mono text-sm font-bold text-left break-all">{value}</button>
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