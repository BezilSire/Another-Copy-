import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { formatTimeAgo } from '../utils';
import { UbtTransaction, GlobalEconomy } from '../types';

type ExplorerView = 'ledger' | 'transaction';

export const LedgerPage: React.FC<{ initialTarget?: { type: 'tx' | 'address', value: string } }> = ({ initialTarget }) => {
    const [view, setView] = useState<ExplorerView>(initialTarget?.type === 'tx' ? 'transaction' : 'ledger');
    const [targetValue, setTargetValue] = useState<string>(initialTarget?.value || '');
    const [selectedTx, setSelectedTx] = useState<UbtTransaction | null>(null);
    
    const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Aggressive Data Load
    useEffect(() => {
        let isMounted = true;
        const forceDataLoad = async () => {
            try {
                const initialTxs = await api.getPublicLedger(100);
                if (isMounted) {
                    setTransactions(initialTxs);
                    setIsLoading(false);
                }
            } catch (e) {
                console.error("Ledger Sync Error:", e);
                if (isMounted) setIsLoading(false);
            }
        };
        forceDataLoad();

        const unsubLedger = api.listenForPublicLedger((txs) => {
            if (isMounted) {
                setTransactions(txs);
                setIsLoading(false);
            }
        }, 100);

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
        if (!address) return "UNKNOWN_NODE";
        if (address.length < 15) return address.toUpperCase();
        return address.substring(0, 14) + '...';
    };

    return (
        <div className="min-h-screen bg-[#F4F7F9] text-[#2D3A4A] font-sans pb-32 selection:bg-blue-100">
            {/* SOLSCAN HEADER */}
            <header className="bg-[#111A2E] text-white py-4 px-6 sm:px-10 lg:px-20 sticky top-0 z-50 border-b border-white/10 shadow-lg">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <button onClick={() => { setView('ledger'); setSelectedTx(null); }} className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                            <GlobeIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Ubuntium <span className="text-blue-400">Scan</span></h1>
                    </button>
                    
                    <form onSubmit={(e) => { e.preventDefault(); if(searchQuery) navigateTx(searchQuery); }} className="flex-1 max-w-2xl w-full relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search Txn Signature / Block Hash"
                            className="w-full bg-[#1A253A] border border-white/10 rounded-lg py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-gray-500 outline-none text-white"
                        />
                    </form>
                    
                    <button onClick={() => window.location.reload()} className="text-xs font-semibold text-gray-400 hover:text-white transition-colors">Force Sync</button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-8 space-y-8">
                
                {/* MARKET STATS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MarketStat label="PROTOCOL PRICE" value={`$${(economy?.ubt_to_usd_rate || 0.001).toFixed(4)}`} change="+0.00%" />
                    <MarketStat label="CVP BACKING" value={`$${(economy?.cvp_usd_backing || 0).toLocaleString()}`} />
                    <MarketStat label="TOTAL BLOCKS" value={transactions.length.toLocaleString()} />
                    <MarketStat label="NETWORK STATE" value="Active" />
                </div>

                {/* MAIN TABLE AREA */}
                <div className="bg-white rounded-xl border border-[#E7EAF3] shadow-sm overflow-hidden animate-fade-in">
                    <div className="bg-[#F8FAFD] px-6 py-4 border-b border-[#E7EAF3] flex justify-between items-center">
                        <h3 className="text-sm font-bold text-[#4A5568] uppercase tracking-wider">
                            {view === 'ledger' ? 'Sovereign Transaction Stream' : 'Transaction Verification'}
                        </h3>
                        {view !== 'ledger' && (
                             <button onClick={() => setView('ledger')} className="text-xs text-blue-500 font-bold hover:underline">Return to stream</button>
                        )}
                    </div>

                    {isLoading && transactions.length === 0 ? (
                        <div className="py-20 text-center">
                            <LoaderIcon className="h-10 w-10 animate-spin text-blue-500 mx-auto" />
                            <p className="text-sm text-gray-400 mt-4">Establishing ledger sync...</p>
                        </div>
                    ) : view === 'transaction' && selectedTx ? (
                        <div className="p-8 space-y-6">
                            <TxDetailRow label="Temporal Signature" value={selectedTx.id} isHash />
                            <TxDetailRow label="State Consensus" value="Finalized" isBadge />
                            <TxDetailRow label="Creation Epoch" value={new Date(selectedTx.timestamp).toLocaleString()} />
                            <TxDetailRow label="Quantum Volume" value={`${selectedTx.amount} UBT ($${ubtToUsd(selectedTx.amount, selectedTx.priceAtSync)})`} />
                            <TxDetailRow label="Sender Node" value={selectedTx.senderPublicKey || selectedTx.senderId} isHash />
                            <TxDetailRow label="Recipient Node" value={selectedTx.receiverId} isHash />
                            <TxDetailRow label="Protocol Seal" value={selectedTx.signature} isHash />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[11px] font-bold text-[#77838F] uppercase border-b border-[#E7EAF3]">
                                        <th className="px-6 py-4">Txn Signature</th>
                                        <th className="px-6 py-4">Sender Node</th>
                                        <th className="px-6 py-4">Recipient Node</th>
                                        <th className="px-6 py-4">Value (UBT)</th>
                                        <th className="px-6 py-4">Age</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E7EAF3] font-mono">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-[#F8FAFD] transition-colors text-sm">
                                            <td className="px-6 py-4">
                                                <button onClick={() => navigateTx(tx.id)} className="text-blue-500 hover:text-blue-700 font-bold">
                                                    {tx.id.substring(0, 10)}...
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {formatAddress(tx.senderId, tx.senderPublicKey)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {formatAddress(tx.receiverId)}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-[#1E2022]">
                                                {tx.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-[#77838F] text-xs">
                                                {formatTimeAgo(tx.timestamp)}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center text-gray-400 font-sans">No ledger events indexed on this node.</td>
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

const MarketStat = ({ label, value, change }: { label: string, value: string, change?: string }) => (
    <div className="bg-white p-5 rounded-xl border border-[#E7EAF3] shadow-sm">
        <p className="text-[10px] font-bold text-[#77838F] mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-[#1E2022] font-mono">{value}</span>
            {change && <span className="text-[10px] text-green-500 font-bold">{change}</span>}
        </div>
    </div>
);

const TxDetailRow = ({ label, value, isHash, isBadge }: any) => (
    <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-100 pb-4">
        <span className="w-full sm:w-1/3 text-sm text-gray-500">{label}:</span>
        <div className="w-full sm:w-2/3 mt-1 sm:mt-0">
            {isBadge ? (
                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase">Finalized</span>
            ) : (
                <span className={`text-sm ${isHash ? 'font-mono text-gray-700 break-all leading-relaxed' : 'font-bold text-gray-900'}`}>{value}</span>
            )}
        </div>
    </div>
);