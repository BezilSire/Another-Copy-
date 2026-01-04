import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { formatTimeAgo } from '../utils';
import { UbtTransaction, GlobalEconomy, PublicUserProfile } from '../types';

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
    const [namesMap, setNamesMap] = useState<Record<string, string>>({
        'GENESIS': 'Genesis Root',
        'FLOAT': 'Liquidity Float',
        'SYSTEM': 'Oracle Node',
        'SUSTENANCE': 'Sustenance Fund',
        'DISTRESS': 'Safety Reserve',
        'VENTURE': 'Launchpad',
        'REDEMPTION': 'Redemption Hub'
    });

    // Aggressive Data Load - Fixed the "Loop" by forcing setIsLoading(false)
    useEffect(() => {
        let isMounted = true;

        const forceDataLoad = async () => {
            try {
                // Fetch direct from DB first
                const initialTxs = await api.getPublicLedger(100);
                if (isMounted) {
                    setTransactions(initialTxs);
                    // Critical: Kill loader even if 0 txs found
                    setIsLoading(false);
                }
            } catch (e) {
                console.error("Ledger Ingress Error:", e);
                if (isMounted) setIsLoading(false);
            }
        };

        forceDataLoad();

        // Real-time update listener
        const unsubLedger = api.listenForPublicLedger((txs) => {
            if (isMounted) {
                setTransactions(txs);
                setIsLoading(false); // Kill loader on first snapshot
                
                // Index names for display
                const ids = Array.from(new Set(txs.flatMap(t => [t.senderId, t.receiverId])));
                ids.forEach(id => {
                    if (!namesMap[id] && id.length > 15) {
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
            const found = transactions.find(t => t.id === targetValue);
            if (found) setSelectedTx(found);
            else {
                // If not in current cache, we could fetch directly, but for now we look in tx list
            }
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
        return namesMap[id] || id.substring(0, 12);
    };

    return (
        <div className="min-h-screen bg-[#F4F7F9] text-[#2D3A4A] font-sans pb-32 selection:bg-blue-100">
            {/* SOLSCAN HEADER */}
            <header className="bg-[#111A2E] text-white py-4 px-6 sm:px-10 lg:px-20 sticky top-0 z-50 border-b border-white/10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <button onClick={() => { setView('ledger'); setAccountData(null); }} className="flex items-center gap-3">
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
                            placeholder="Search by Address / Txn Hash / Block"
                            className="w-full bg-[#1A253A] border border-white/10 rounded-lg py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-gray-500 outline-none text-white"
                        />
                    </form>
                    
                    <div className="flex gap-4">
                        <button onClick={() => window.location.reload()} className="text-xs font-semibold text-gray-400 hover:text-white transition-colors">Refresh</button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-8 space-y-8">
                
                {/* MARKET STATS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MarketStat label="UBT PRICE" value={`$${(economy?.ubt_to_usd_rate || 0.001).toFixed(4)}`} change="+0.02%" />
                    <MarketStat label="MARKET CAP" value={`$${((economy?.ubt_to_usd_rate || 0.001) * 15000000).toLocaleString()}`} />
                    <MarketStat label="TRANSACTIONS" value={transactions.length.toLocaleString()} />
                    <MarketStat label="NODES" value="Active" />
                </div>

                {/* MAIN TABLE AREA */}
                <div className="bg-white rounded-xl border border-[#E7EAF3] shadow-sm overflow-hidden">
                    <div className="bg-[#F8FAFD] px-6 py-4 border-b border-[#E7EAF3] flex justify-between items-center">
                        <h3 className="text-sm font-bold text-[#4A5568] uppercase tracking-wider">
                            {view === 'ledger' ? 'Latest Transactions' : view === 'account' ? 'Account History' : 'Transaction Details'}
                        </h3>
                        {view !== 'ledger' && (
                             <button onClick={() => setView('ledger')} className="text-xs text-blue-500 font-bold hover:underline">View All</button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="py-20 text-center">
                            <LoaderIcon className="h-10 w-10 animate-spin text-blue-500 mx-auto" />
                            <p className="text-sm text-gray-400 mt-4">Fetching ledger data...</p>
                        </div>
                    ) : view === 'transaction' && selectedTx ? (
                        <div className="p-8 space-y-6">
                            <TxDetailRow label="Transaction Signature" value={selectedTx.id} isHash />
                            <TxDetailRow label="Status" value="Success" isBadge />
                            <TxDetailRow label="Timestamp" value={new Date(selectedTx.timestamp).toLocaleString()} />
                            <TxDetailRow label="Value" value={`${selectedTx.amount} UBT ($${ubtToUsd(selectedTx.amount, selectedTx.priceAtSync)})`} />
                            <TxDetailRow label="From" value={selectedTx.senderId} isLink onLink={() => navigateAccount(selectedTx.senderId)} />
                            <TxDetailRow label="To" value={selectedTx.receiverId} isLink onLink={() => navigateAccount(selectedTx.receiverId)} />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[11px] font-bold text-[#77838F] uppercase border-b border-[#E7EAF3]">
                                        <th className="px-6 py-4">Signature</th>
                                        <th className="px-6 py-4">From</th>
                                        <th className="px-6 py-4">To</th>
                                        <th className="px-6 py-4">Value</th>
                                        <th className="px-6 py-4">Age</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E7EAF3]">
                                    {filteredTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-[#F8FAFD] transition-colors text-sm">
                                            <td className="px-6 py-4">
                                                <button onClick={() => navigateTx(tx.id)} className="text-blue-500 hover:text-blue-700 font-mono">
                                                    {tx.id.substring(0, 12)}...
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => navigateAccount(tx.senderId)} className="text-blue-500 hover:text-blue-700 truncate max-w-[120px] block">
                                                    {resolveName(tx.senderId)}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => navigateAccount(tx.receiverId)} className="text-blue-500 hover:text-blue-700 truncate max-w-[120px] block">
                                                    {resolveName(tx.receiverId)}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-[#1E2022]">
                                                {tx.amount.toLocaleString()} UBT
                                            </td>
                                            <td className="px-6 py-4 text-[#77838F]">
                                                {formatTimeAgo(tx.timestamp)}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center text-gray-400">No transactions indexed.</td>
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
            <span className="text-lg font-bold text-[#1E2022]">{value}</span>
            {change && <span className="text-[10px] text-green-500 font-bold">{change}</span>}
        </div>
    </div>
);

const TxDetailRow = ({ label, value, isHash, isBadge, isLink, onLink }: any) => (
    <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-100 pb-4">
        <span className="w-full sm:w-1/3 text-sm text-gray-500">{label}:</span>
        <div className="w-full sm:w-2/3 mt-1 sm:mt-0">
            {isBadge ? (
                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase">Success</span>
            ) : isLink ? (
                <button onClick={onLink} className="text-blue-500 hover:underline text-sm font-mono break-all text-left">{value}</button>
            ) : (
                <span className={`text-sm ${isHash ? 'font-mono text-gray-700 break-all' : 'font-bold text-gray-900'}`}>{value}</span>
            )}
        </div>
    </div>
);