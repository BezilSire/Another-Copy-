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
import { CheckCircleIcon } from './icons/CheckCircleIcon';

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
            const data = await sovereignService.fetchPublicLedger(200);
            
            // SECURITY FILTER: Remove simulation junk (10k blocks)
            const cleansedData = data.filter(tx => 
                tx.type !== 'SIMULATION_MINT' && 
                tx.amount !== 10000
            );

            setTransactions(cleansedData);
        } catch (e) {
            console.error("Ledger Sync Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        syncWithGitHub();
        const interval = setInterval(syncWithGitHub, 60000);
        return () => clearInterval(interval);
    }, []);

    // Account Detail Logic - Aggregates history from the buffered chain
    const accountViewData = useMemo(() => {
        if (view !== 'account' || !targetValue) return null;
        
        const history = transactions.filter(t => 
            t.senderId === targetValue || 
            t.receiverId === targetValue ||
            t.senderPublicKey === targetValue ||
            t.receiverPublicKey === targetValue
        );

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

    const resolveDisplayAddress = (id: string, pubKey?: string) => {
        const systemNodes: Record<string, string> = {
            'GENESIS': 'Genesis Root',
            'FLOAT': 'Liquidity Float',
            'SUSTENANCE': 'Reserve Node',
            'DISTRESS': 'Emergency Vault',
            'SYSTEM': 'Protocol Oracle'
        };
        
        if (systemNodes[id]) return systemNodes[id];
        if (pubKey && pubKey.startsWith('SYSTEM_NODE:')) return systemNodes[pubKey.split(':')[1]] || pubKey;
        
        const address = pubKey || id;
        if (address.length < 15) return address;
        
        // Return truncated UBT address
        return address.substring(0, 4) + '...' + address.substring(address.length - 4);
    };

    const getActionLabel = (type?: string) => {
        switch(type) {
            case 'VOUCH_ANCHOR': return 'Vouch Anchor';
            case 'FIAT_BRIDGE': return 'Bridge Ingress';
            case 'SYSTEM_MINT': return 'Genesis Mint';
            case 'VAULT_SYNC': return 'Vault Sync';
            default: return 'Asset Dispatch';
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans pb-40">
            {/* SOLSCAN HEADER - LIGHT THEME */}
            <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-[100] shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <button onClick={() => { setView('ledger'); setSelectedTx(null); }} className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <GlobeIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">UBUNTIUM<span className="text-blue-600">SCAN</span></h1>
                    </button>
                    
                    <div className="flex-1 max-w-2xl w-full relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <SearchIcon className="h-4 w-4 text-slate-400" />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (searchQuery.startsWith('UBT') ? navigateAccount(searchQuery) : navigateTx(searchQuery))}
                            placeholder="Search by Address / Tx Hash / Block"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-11 pr-4 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-slate-400 outline-none text-slate-900 font-mono !p-2.5 !border-slate-200"
                        />
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-100 rounded-full">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-green-700">Mainnet Beta</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                
                {/* NETWORK STATS GRID */}
                {view === 'ledger' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatBox label="LEDGER HEIGHT" value={transactions.length > 0 ? `#${transactions.length}` : "..."} />
                        <StatBox label="CIRCULATING SUPPLY" value="15,000,000 UBT" />
                        <StatBox label="AVG. BLOCK TIME" value="1.2s" />
                        <StatBox label="SYNC STATUS" value="CONSENSUS" isSuccess />
                    </div>
                )}

                {/* EXPLORER CONTENT */}
                {view === 'account' && accountViewData ? (
                    <div className="animate-fade-in space-y-6">
                         <button onClick={() => setView('ledger')} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                            <ArrowLeftIcon className="h-3 w-3" /> Back to Global Stream
                        </button>
                        
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                    <UserCircleIcon className="h-10 w-10 text-slate-400" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Account Address</h2>
                                    <p className="text-xl font-bold font-mono text-slate-900 break-all">{targetValue}</p>
                                </div>
                            </div>
                            <div className="text-center md:text-right">
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">On-Ledger Balance</h2>
                                <p className="text-3xl font-bold text-blue-600 font-mono">{accountViewData.balance.toLocaleString()} <span className="text-lg">UBT</span></p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Transaction History</h3>
                            </div>
                            <TxTable txs={accountViewData.history} navigateAccount={navigateAccount} navigateTx={navigateTx} resolveDisplayAddress={resolveDisplayAddress} getActionLabel={getActionLabel} />
                        </div>
                    </div>
                ) : view === 'transaction' && selectedTx ? (
                    <div className="p-8 bg-white rounded-2xl border border-slate-200 space-y-8 max-w-4xl mx-auto animate-fade-in shadow-sm">
                        <button onClick={() => setView('ledger')} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                            <ArrowLeftIcon className="h-3 w-3" /> Back
                        </button>
                        <h2 className="text-xl font-bold text-slate-900">Transaction Details</h2>
                        <div className="divide-y divide-slate-100">
                            <DetailRow label="Signature" value={selectedTx.id} isMono />
                            <DetailRow label="Result" value="Success" isStatus />
                            <DetailRow label="Temporal Marker" value={new Date(selectedTx.timestamp).toLocaleString()} />
                            <DetailRow label="Action" value={getActionLabel(selectedTx.type)} />
                            <DetailRow label="Value" value={`${selectedTx.amount} UBT`} isStrong />
                            <DetailRow label="From" value={selectedTx.senderPublicKey || selectedTx.senderId} isMono isLink onClick={() => navigateAccount(selectedTx.senderPublicKey || selectedTx.senderId)} />
                            <DetailRow label="To" value={selectedTx.receiverPublicKey || selectedTx.receiverId} isMono isLink onClick={() => navigateAccount(selectedTx.receiverPublicKey || selectedTx.receiverId)} />
                            <DetailRow label="Integrity Hash" value={selectedTx.hash} isMono isSmall />
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Recent Transactions</h3>
                            <span className="text-[10px] text-slate-400 font-medium italic">Auto-refresh active</span>
                        </div>
                        <TxTable txs={transactions} navigateAccount={navigateAccount} navigateTx={navigateTx} resolveDisplayAddress={resolveDisplayAddress} getActionLabel={getActionLabel} />
                    </div>
                )}
                
                <div className="text-center space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                        Ubuntium Sovereign DAG Ledger Explorer
                    </p>
                    <p className="text-[9px] text-slate-300 max-w-lg mx-auto leading-relaxed">
                        This interface provides direct transparency into the cryptographic anchors on GitHub. Internal database identifiers are automatically resolved to node public keys.
                    </p>
                </div>
            </main>
        </div>
    );
};

const TxTable = ({ txs, navigateAccount, navigateTx, resolveDisplayAddress, getActionLabel }: any) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4">Signature</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">From</th>
                    <th className="px-6 py-4">To</th>
                    <th className="px-6 py-4 text-right">Value</th>
                    <th className="px-6 py-4 text-right">Age</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-mono">
                {txs.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors text-xs group">
                        <td className="px-6 py-4">
                            <button onClick={() => navigateTx(tx.id)} className="text-blue-600 hover:underline font-bold">
                                {tx.id.substring(0, 8)}...
                            </button>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-sans font-medium">
                            {getActionLabel(tx.type)}
                        </td>
                        <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-600 font-sans font-bold text-[9px] uppercase border border-green-100">
                                <CheckCircleIcon className="h-2.5 w-2.5" /> Success
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <button onClick={() => navigateAccount(tx.senderPublicKey || tx.senderId)} className="text-blue-600 hover:underline font-bold">
                                {resolveDisplayAddress(tx.senderId, tx.senderPublicKey)}
                            </button>
                        </td>
                        <td className="px-6 py-4">
                            <button onClick={() => navigateAccount(tx.receiverPublicKey || tx.receiverId)} className="text-blue-600 hover:underline font-bold">
                                {resolveDisplayAddress(tx.receiverId, tx.receiverPublicKey)}
                            </button>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">
                            {tx.amount.toLocaleString()} UBT
                        </td>
                        <td className="px-6 py-4 text-right text-slate-400 font-sans">
                            {formatTimeAgo(tx.timestamp)}
                        </td>
                    </tr>
                ))}
                {txs.length === 0 && (
                    <tr>
                        <td colSpan={7} className="py-24 text-center text-slate-300 font-sans italic">Indexing Sovereign Blocks...</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const StatBox = ({ label, value, isSuccess }: any) => (
    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
        <p className="text-[10px] font-bold text-slate-400 mb-1 tracking-wider">{label}</p>
        <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${isSuccess ? 'text-green-600' : 'text-slate-900'}`}>{value}</span>
            {isSuccess && <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>}
        </div>
    </div>
);

const DetailRow = ({ label, value, isMono, isStatus, isStrong, isSmall, isLink, onClick }: any) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-4 first:pt-0">
        <span className="w-full sm:w-1/3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className="w-full sm:w-2/3 mt-1 sm:mt-0">
            {isStatus ? (
                <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded uppercase border border-green-100 flex items-center gap-1.5 w-fit">
                    <CheckCircleIcon className="h-3 w-3" />
                    Confirmed (Success)
                </span>
            ) : isLink ? (
                <button onClick={onClick} className="text-blue-600 hover:underline font-mono text-sm font-bold text-left break-all">{value}</button>
            ) : (
                <span className={`
                    ${isMono ? 'font-mono' : 'font-semibold'} 
                    ${isStrong ? 'text-lg font-bold text-slate-900' : 'text-sm text-slate-700'}
                    ${isSmall ? 'text-[10px] opacity-60' : ''}
                    break-all
                `}>
                    {value}
                </span>
            )}
        </div>
    </div>
);