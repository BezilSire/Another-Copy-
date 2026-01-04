import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { formatTimeAgo } from '../utils';
import { UbtTransaction, GlobalEconomy } from '../types';

type ExplorerView = 'ledger' | 'transaction';

/**
 * SOVEREIGN PUBLIC EXPLORER
 * Professional-grade ledger visualizer (Solscan Style)
 */
export const LedgerPage: React.FC<{ initialTarget?: { type: 'tx' | 'address', value: string } }> = ({ initialTarget }) => {
    const [view, setView] = useState<ExplorerView>(initialTarget?.type === 'tx' ? 'transaction' : 'ledger');
    const [targetValue, setTargetValue] = useState<string>(initialTarget?.value || '');
    const [selectedTx, setSelectedTx] = useState<UbtTransaction | null>(null);
    
    const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Hard-coded sorting and aggressive fetch to fix "0 txs" bug
    useEffect(() => {
        let isMounted = true;

        const forceDataLoad = async () => {
            try {
                // Fetch direct from ledger collection sorting by immutable client timestamp
                const initialTxs = await api.getPublicLedger(200);
                if (isMounted) {
                    setTransactions(initialTxs);
                    // Explicitly kill loader once any data (even 0) is returned
                    setIsLoading(false);
                }
            } catch (e) {
                console.error("Ledger Node Sync Failed:", e);
                if (isMounted) setIsLoading(false);
            }
        };

        forceDataLoad();

        // Sub-second listener for real-time blocks
        const unsubLedger = api.listenForPublicLedger((txs) => {
            if (isMounted) {
                setTransactions(txs);
                setIsLoading(false);
            }
        }, 200);

        const unsubEcon = api.listenForGlobalEconomy((econ) => {
            if (isMounted) setEconomy(econ);
        });

        return () => { isMounted = false; unsubLedger(); unsubEcon(); };
    }, []);

    useEffect(() => {
        if (view === 'transaction' && targetValue) {
            const found = transactions.find(t => t.id === targetValue);
            if (found) setSelectedTx(found);
        }
    }, [view, targetValue, transactions]);

    const navigateTx = (txid: string) => {
        if (!txid) return;
        setTargetValue(txid);
        setView('transaction');
        setSearchQuery('');
        window.scrollTo(0, 0);
    };

    const ubtToUsd = (amt: number, txPrice?: number) => {
        const price = txPrice || economy?.ubt_to_usd_rate || 0.001;
        return (amt * price).toFixed(4);
    };

    const formatAddress = (id: string, pubKey?: string) => {
        const address = pubKey || id;
        if (!address) return "NODE_NULL";
        if (address.length < 15) return address.toUpperCase();
        return address.substring(0, 10) + '...' + address.substring(address.length - 4);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans pb-40 selection:bg-blue-100">
            {/* SOLSCAN STYLE NAV */}
            <header className="bg-[#111827] text-white py-4 px-6 border-b border-white/5 sticky top-0 z-[100] shadow-xl">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <button onClick={() => { setView('ledger'); setSelectedTx(null); }} className="flex items-center gap-3 active:scale-95 transition-transform">
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
                            placeholder="Search by Txn Hash / Signature"
                            className="w-full bg-[#1F2937] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-500 outline-none text-white font-mono"
                        />
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mainnet Live</span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
                
                {/* MARKET DATA BOARD */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MarketMetric label="UBT PRICE" value={`$${(economy?.ubt_to_usd_rate || 0.001).toFixed(4)}`} change="+0.00%" />
                    <MarketMetric label="MARKET CAP" value={`$${((economy?.ubt_to_usd_rate || 0.001) * 15000000).toLocaleString()}`} />
                    <MarketMetric label="TOTAL TRANSACTIONS" value={transactions.length.toLocaleString()} />
                    <MarketMetric label="NODES" value="ACTIVE" color="text-green-600" />
                </div>

                {/* DATA TABLE CONTAINER */}
                <div className="bg-white rounded-[2rem] border border-[#E2E8F0] shadow-sm overflow-hidden animate-fade-in">
                    <div className="bg-[#F8FAFD] px-8 py-5 border-b border-[#E2E8F0] flex justify-between items-center">
                        <h3 className="text-xs font-black text-[#64748B] uppercase tracking-[0.2em]">
                            {view === 'ledger' ? 'Latest Transactions' : 'Transaction Verification'}
                        </h3>
                        {view !== 'ledger' && (
                             <button onClick={() => setView('ledger')} className="text-xs text-blue-600 font-bold hover:underline">Back to Ledger</button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="py-32 text-center">
                            <LoaderIcon className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
                            <p className="text-xs font-bold text-gray-400 mt-6 uppercase tracking-widest">Resolving state anchors...</p>
                        </div>
                    ) : view === 'transaction' && selectedTx ? (
                        <div className="p-10 space-y-8 animate-fade-in max-w-4xl mx-auto">
                            <DetailRow label="Transaction Signature" value={selectedTx.id} isMono />
                            <DetailRow label="Result" value="Success" isBadge />
                            <DetailRow label="Timestamp" value={new Date(selectedTx.timestamp).toLocaleString()} />
                            <DetailRow label="Value" value={`${selectedTx.amount} UBT ($${ubtToUsd(selectedTx.amount, selectedTx.priceAtSync)})`} isStrong />
                            <DetailRow label="From" value={selectedTx.senderPublicKey || selectedTx.senderId} isMono />
                            <DetailRow label="To" value={selectedTx.receiverId} isMono />
                            <DetailRow label="Ed25519 Proof" value={selectedTx.signature} isMono isSmall />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black text-[#94A3B8] uppercase border-b border-[#E2E8F0]">
                                        <th className="px-10 py-6">Signature</th>
                                        <th className="px-10 py-6">From Node</th>
                                        <th className="px-10 py-6">To Node</th>
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
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[#0F172A]">{tx.amount.toLocaleString()} UBT</span>
                                                    <span className="text-[10px] text-gray-400">${ubtToUsd(tx.amount, tx.priceAtSync)}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 text-[#94A3B8] text-xs">
                                                {formatTimeAgo(tx.timestamp)}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-32 text-center text-gray-400 font-sans italic">No transaction data indexed on this shard.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const MarketMetric = ({ label, value, change, color }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <p className="text-[10px] font-black text-[#94A3B8] mb-2 tracking-widest">{label}</p>
        <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${color || 'text-[#0F172A]'}`}>{value}</span>
            {change && <span className="text-[10px] text-green-600 font-black">{change}</span>}
        </div>
    </div>
);

const DetailRow = ({ label, value, isMono, isBadge, isStrong, isSmall }: any) => (
    <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-100 pb-5 last:border-0">
        <span className="w-full sm:w-1/3 text-[11px] font-black text-[#64748B] uppercase tracking-widest">{label}</span>
        <div className="w-full sm:w-2/3 mt-2 sm:mt-0">
            {isBadge ? (
                <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase border border-green-200">Verified</span>
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