
import React, { useState, useEffect, useMemo } from 'react';
import { sovereignService } from '../services/sovereignService';
import { LoaderIcon } from './icons/LoaderIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { formatTimeAgo } from '../utils';
import { UbtTransaction } from '../types';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { RotateCwIcon } from './icons/RotateCwIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

type ExplorerView = 'ledger' | 'account' | 'transaction';

export const LedgerPage: React.FC<{ initialTarget?: { type: 'tx' | 'address', value: string } }> = ({ initialTarget }) => {
    const [view, setView] = useState<ExplorerView>('ledger');
    const [targetValue, setTargetValue] = useState<string>('');
    const [selectedTx, setSelectedTx] = useState<UbtTransaction | null>(null);
    
    const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    const syncFromSovereign = async () => {
        setIsLoading(true);
        try {
            // We fetch a significant buffer to calculate accurate tokenomics, but only display in slices
            const data = await sovereignService.fetchPublicLedger(1000);
            setTransactions(data);
        } catch (e) {
            console.error("Sovereign sync failure");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        syncFromSovereign();
        
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
        if (view === 'transaction' && targetValue) {
            const found = transactions.find(t => t.id === targetValue || t.hash === targetValue);
            if (found) setSelectedTx(found);
        }
    }, [view, targetValue, transactions]);

    const navigateAccount = (address: string) => {
        if (!address) return;
        setTargetValue(address);
        setView('account');
        setCurrentPage(1); // Reset to page 1 on new search
        setSearchQuery('');
        const url = new URL(window.location.href);
        url.searchParams.set('address', address);
        url.searchParams.delete('tx');
        window.history.pushState({}, '', url);
    };

    const navigateTx = (txid: string) => {
        if (!txid) return;
        setTargetValue(txid);
        setView('transaction');
        setSearchQuery('');
        const url = new URL(window.location.href);
        url.searchParams.set('tx', txid);
        url.searchParams.delete('address');
        window.history.pushState({}, '', url);
    };

    const handleBack = () => {
        setView('ledger');
        setTargetValue('');
        setCurrentPage(1);
        const url = new URL(window.location.href);
        url.searchParams.delete('tx');
        url.searchParams.delete('address');
        window.history.pushState({}, '', url);
    };

    // --- PROTOCOL TOKENOMICS ENGINE ---
    const tokenomics = useMemo(() => {
        const TOTAL_CAP = 15000000;
        const vaults: Record<string, number> = {
            GENESIS: TOTAL_CAP,
            FLOAT: 0,
            SUSTENANCE: 0,
            DISTRESS: 0,
            VENTURE: 0
        };

        // Replay history from the full set to calculate current balances
        [...transactions].reverse().forEach(tx => {
            const amt = Number(tx.amount || 0);
            if (tx.type === 'SYSTEM_MINT') return;
            if (vaults[tx.senderId] !== undefined) vaults[tx.senderId] -= amt;
            if (vaults[tx.receiverId] !== undefined) vaults[tx.receiverId] += amt;
        });

        const circulating = TOTAL_CAP - vaults.GENESIS;

        return {
            totalSupply: TOTAL_CAP,
            circulating,
            blockHeight: transactions.length,
            vaults
        };
    }, [transactions]);

    const allFilteredTransactions = useMemo(() => {
        if (view === 'ledger') return transactions;
        if (view === 'account') {
            return transactions.filter(tx => 
                tx.senderPublicKey === targetValue || 
                tx.receiverPublicKey === targetValue ||
                tx.senderId === targetValue || 
                tx.receiverId === targetValue
            );
        }
        return transactions;
    }, [transactions, view, targetValue]);

    // Paginated Slicing
    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return allFilteredTransactions.slice(start, start + ITEMS_PER_PAGE);
    }, [allFilteredTransactions, currentPage]);

    const totalPages = Math.ceil(allFilteredTransactions.length / ITEMS_PER_PAGE);

    const formatKey = (id: string, pk?: string) => {
        if (['GENESIS', 'FLOAT', 'SYSTEM', 'SUSTENANCE', 'DISTRESS', 'VENTURE'].includes(id)) {
            return `${id}_NODE`;
        }
        if (pk && pk.startsWith('UBT-')) return pk;
        return `NODE:${id.substring(0,8)}...`; 
    };

    return (
        <div className="min-h-screen bg-[#f9fafb] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm py-4">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                    <button onClick={handleBack} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#2563eb] rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-100">
                            <GlobeIcon className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Ubuntium<span className="text-[#2563eb]">Scan</span></h1>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Mainnet Protocol v5.2</p>
                        </div>
                    </button>
                    
                    <div className="flex-1 max-w-2xl w-full relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <SearchIcon className="h-4 w-4 text-slate-400" />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    if (searchQuery.startsWith('UBT-')) navigateAccount(searchQuery);
                                    else navigateTx(searchQuery);
                                }
                            }}
                            placeholder="Search Signature / Account / Node..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] outline-none transition-all placeholder-slate-400 uppercase"
                        />
                    </div>

                    <button 
                        onClick={syncFromSovereign} 
                        disabled={isLoading}
                        className="p-3 text-slate-400 hover:text-[#2563eb] transition-colors"
                    >
                        <RotateCwIcon className={`h-5 w-5 ${isLoading ? 'animate-spin text-[#2563eb]' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                
                {/* HUD */}
                {view === 'ledger' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                        <MetricCard label="Total Supply" value="15,000,000 UBT" sub="Immutable Protocol Cap" />
                        <MetricCard label="Circulating Supply" value={`${tokenomics.circulating.toLocaleString()} UBT`} sub={`${((tokenomics.circulating / tokenomics.totalSupply) * 100).toFixed(2)}% Distribution`} color="text-[#2563eb]" />
                        <MetricCard label="Block Height" value={`# ${tokenomics.blockHeight}`} sub="Verified Events" />
                        <MetricCard label="Oracle Equilibrium" value={`$${(transactions[0]?.priceAtSync || 0.001).toFixed(4)}`} sub="Last Sync Price" />
                    </div>
                )}

                {/* Reserves */}
                {view === 'ledger' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                            <DatabaseIcon className="h-40 w-40" />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 border-b border-slate-100 pb-4 flex items-center gap-2">
                             System Reserve Anchors
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
                            <WalletStat label="Genesis Root" value={tokenomics.vaults.GENESIS} color="text-slate-900" />
                            <WalletStat label="Liquidity Float" value={tokenomics.vaults.FLOAT} color="text-[#2563eb]" />
                            <WalletStat label="Sustenance" value={tokenomics.vaults.SUSTENANCE} color="text-emerald-600" />
                            <WalletStat label="Distress" value={tokenomics.vaults.DISTRESS} color="text-red-600" />
                            <WalletStat label="Venture" value={tokenomics.vaults.VENTURE} color="text-purple-600" />
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="py-40 text-center">
                        <LoaderIcon className="h-10 w-10 animate-spin text-[#2563eb] mx-auto" />
                        <p className="text-xs font-bold text-slate-400 mt-6 uppercase tracking-widest">Indexing Sovereign Stream...</p>
                    </div>
                ) : view === 'transaction' && selectedTx ? (
                    <div className="animate-fade-in max-w-4xl space-y-6 mx-auto">
                         <div className="flex items-center gap-2 text-slate-500 mb-2">
                            <button onClick={handleBack} className="hover:text-[#2563eb] font-bold text-xs uppercase tracking-widest transition-colors">Explorer</button>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-900 font-bold text-xs uppercase tracking-widest">Transaction Details</span>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Immutable Block Receipt</h2>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">Success</span>
                            </div>

                            <div className="p-0">
                                <DetailRow label="Signature" value={selectedTx.id} isMono isCopyable isBold />
                                <DetailRow label="Block Time" value={`${new Date(selectedTx.timestamp).toLocaleString()} (${formatTimeAgo(selectedTx.timestamp)})`} />
                                <DetailRow label="Status" value="Finalized (Max Confirmations)" color="text-emerald-600" />
                                <DetailRow 
                                    label="Sender" 
                                    value={formatKey(selectedTx.senderId, selectedTx.senderPublicKey)} 
                                    isLink 
                                    onClick={() => navigateAccount(selectedTx.senderPublicKey || selectedTx.senderId)} 
                                    isMono 
                                />
                                <DetailRow 
                                    label="Receiver" 
                                    value={formatKey(selectedTx.receiverId, selectedTx.receiverPublicKey)} 
                                    isLink 
                                    onClick={() => navigateAccount(selectedTx.receiverPublicKey || selectedTx.receiverId)} 
                                    isMono 
                                />
                                <DetailRow label="Volume" value={`${selectedTx.amount.toLocaleString()} UBT`} isBold />
                                <DetailRow label="Value (Fiat)" value={`$${(selectedTx.amount * (selectedTx.priceAtSync || 0.001)).toFixed(2)} USD`} />
                                <DetailRow label="Protocol Signature" value={selectedTx.signature} wrap isMono />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                                {view === 'account' ? 'Node Identity State' : 'Live Ledger Dispatches'}
                            </h3>
                            {view === 'account' && (
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">{targetValue}</span>
                                    <button onClick={handleBack} className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-black uppercase hover:bg-slate-200 transition-all">Clear</button>
                                </div>
                            )}
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 bg-slate-50/30">
                                        <th className="px-8 py-5">Signature</th>
                                        <th className="px-8 py-5">Origin</th>
                                        <th className="px-8 py-5">Destination</th>
                                        <th className="px-8 py-5">Volume</th>
                                        <th className="px-8 py-5">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paginatedTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-8 py-5">
                                                <button onClick={() => navigateTx(tx.id)} className="text-[#2563eb] font-mono text-xs font-bold hover:underline">
                                                    {tx.id.substring(0, 10)}...
                                                </button>
                                            </td>
                                            <td className="px-8 py-5">
                                                <button 
                                                    onClick={() => navigateAccount(tx.senderPublicKey || tx.senderId)} 
                                                    className="text-[#2563eb] font-mono text-xs hover:underline truncate max-w-[150px] block"
                                                >
                                                    {formatKey(tx.senderId, tx.senderPublicKey).substring(0, 12)}...
                                                </button>
                                            </td>
                                            <td className="px-8 py-5">
                                                <button 
                                                    onClick={() => navigateAccount(tx.receiverPublicKey || tx.receiverId)} 
                                                    className="text-[#2563eb] font-mono text-xs hover:underline truncate max-w-[150px] block"
                                                >
                                                    {formatKey(tx.receiverId, tx.receiverPublicKey).substring(0, 12)}...
                                                </button>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 text-xs">{tx.amount.toLocaleString()} UBT</span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">≈ ${ (tx.amount * (tx.priceAtSync || 0.001)).toFixed(2) }</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">
                                                    {formatTimeAgo(tx.timestamp)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {paginatedTransactions.length === 0 && (
                                <div className="py-24 text-center">
                                    <DatabaseIcon className="h-10 w-10 mx-auto text-slate-100 mb-4" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Registry stream empty</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination Footer */}
                        {totalPages > 1 && (
                            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    Showing <span className="text-slate-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, allFilteredTransactions.length)}</span> of <span className="text-slate-900">{allFilteredTransactions.length}</span> dispatches
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeftIcon className="h-4 w-4" />
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {[...Array(totalPages)].map((_, i) => {
                                            const page = i + 1;
                                            // Show only a few pages if too many
                                            if (totalPages > 7 && Math.abs(page - currentPage) > 2 && page !== 1 && page !== totalPages) {
                                                if (Math.abs(page - currentPage) === 3) return <span key={page} className="px-2 text-slate-400">...</span>;
                                                return null;
                                            }
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === page ? 'bg-[#2563eb] text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRightIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Footer */}
            <div className="max-w-7xl mx-auto px-4 py-12 border-t border-slate-200 mt-20">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">© 2025 UBUNTIUM_SOVEREIGN_NETWORK_STATE</p>
                    <div className="flex gap-10">
                        <span className="text-[10px] font-black uppercase tracking-widest">PROTOCOL: v5.2.1</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">MAINNET_BETA</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, sub, color }: { label: string, value: string, sub: string, color?: string }) => (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        <p className={`text-xl font-black ${color || 'text-slate-900'}`}>{value}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{sub}</p>
    </div>
);

const WalletStat = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="space-y-1.5">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className={`text-sm font-black font-mono ${color}`}>{value.toLocaleString()}</p>
        <p className="text-[8px] text-slate-300 font-bold uppercase tracking-tighter">UBT STAKE</p>
    </div>
);

const DetailRow = ({ label, value, isMono, isCopyable, isBold, isLink, onClick, color, wrap }: any) => (
    <div className="grid grid-cols-1 md:grid-cols-4 px-8 py-5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">{label}</div>
        <div className="md:col-span-3 flex items-center gap-3">
            {isLink ? (
                <button onClick={onClick} className={`text-sm text-[#2563eb] font-bold hover:underline transition-all text-left truncate max-w-full ${isMono ? 'font-mono' : ''}`}>
                    {value}
                </button>
            ) : (
                <p className={`text-sm ${color || 'text-slate-700'} ${isBold ? 'font-black' : 'font-medium'} ${wrap ? 'break-all' : 'truncate'} ${isMono ? 'font-mono' : ''}`}>
                    {value}
                </p>
            )}
            {isCopyable && (
                 <button onClick={() => navigator.clipboard.writeText(value)} className="p-1.5 text-slate-200 hover:text-[#2563eb] transition-all bg-slate-50 rounded-lg border border-slate-100">
                    <ClipboardIcon className="h-3 w-3" />
                 </button>
            )}
        </div>
    </div>
);
