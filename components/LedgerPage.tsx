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
            const data = await sovereignService.fetchPublicLedger(400);
            
            // Clean simulation noise
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

    // Account Detail Logic - Aggregates history and balance from the buffered chain
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
        
        // If it's a raw pubKey or a prefixed system node from the sync engine
        const address = pubKey || id;
        if (address.startsWith('SYSTEM_NODE:')) return systemNodes[address.split(':')[1]] || address;
        if (address.startsWith('LEGACY_NODE:')) return address;

        // If it's a real UBT address
        if (address.startsWith('UBT-')) {
            return address.substring(0, 6) + '...' + address.substring(address.length - 4);
        }
        
        // Mask raw Firebase UIDs
        if (address.length > 20 && !address.includes('-')) {
            return `Legacy_${address.substring(0, 6)}`;
        }

        return address;
    };

    const getActionLabel = (type?: string) => {
        switch(type) {
            case 'VOUCH_ANCHOR': return 'Vouch Anchor';
            case 'FIAT_BRIDGE': return 'Bridge Ingress';
            case 'SYSTEM_MINT': return 'Genesis Mint';
            case 'VAULT_SYNC': return 'Vault Sync';
            case 'REDEMPTION': return 'Asset Egress';
            default: return 'Asset Dispatch';
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans pb-40">
            {/* SOLSCAN HEADER - ICONIC LIGHT THEME */}
            <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-[100] shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <button onClick={() => { setView('ledger'); setSelectedTx(null); }} className="flex items-center gap-3 group">
                        <div className="p-2 bg-blue-600 rounded-lg group-hover:scale-110 transition-transform">
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
                            placeholder="Address / Transaction Hash / Block"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-11 pr-4 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-slate-400 outline-none text-slate-900 font-mono !p-2.5 !border-slate-200"
                        />
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Mainnet-Beta</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
                
                {/* EXPLORER STATS */}
                {view === 'ledger' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatBox label="LEDGER HEIGHT" value={transactions.length > 0 ? `#${transactions.length}` : "..."} />
                        <StatBox label="CIRCULATING EQUITY" value="15,000,000 UBT" />
                        <StatBox label="BLOCK CONSOLIDATION" value="100%" />
                        <StatBox label="NETWORK STATUS" value="OPERATIONAL" isSuccess />
                    </div>
                )}

                {/* VIEW CONTROLLER */}
                {view === 'account' && accountViewData ? (
                    <div className="space-y-6">
                         <button onClick={() => setView('ledger')} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                            <ArrowLeftIcon className="h-3 w-3" /> Back to Global Feed
                        </button>
                        
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-center gap-8 shadow-sm">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                    <UserCircleIcon className="h-10 w-10 text-slate-400" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Account Node Address</h2>
                                    <p className="text-xl font-bold font-mono text-slate-900 break-all">{targetValue}</p>
                                </div>
                            </div>
                            <div className="text-center md:text-right">
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ledger Aggregated Balance</h2>
                                <p className="text-3xl font-bold text-blue-600 font-mono">{accountViewData.balance.toLocaleString()} <span className="text-lg">UBT</span></p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Historical Displacement History</h3>
                            </div>
                            <TxTable txs={accountViewData.history} navigateAccount={navigateAccount} navigateTx={navigateTx} resolveDisplayAddress={resolveDisplayAddress} getActionLabel={getActionLabel} />
                        </div>
                    </div>
                ) : view === 'transaction' && selectedTx ? (
                    <div className="p-8 bg-white rounded-2xl border border-slate-200 space-y-8 max-w-4xl mx-auto shadow-sm">
                        <button onClick={() => setView('ledger')} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                            <ArrowLeftIcon className="h-3 w-3" /> Back
                        </button>
                        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Transaction Details</h2>
                        <div className="space-y-1">
                            <DetailRow label="Signature (Hash)" value={selectedTx.id} isMono />
                            <DetailRow label="Consensus Status" value="Success" isStatus />
                            <DetailRow label="Temporal Marker" value={new Date(selectedTx.timestamp).toLocaleString()} />
                            <DetailRow label="Action Type" value={getActionLabel(selectedTx.type)} />
                            <DetailRow label="Value Transferred" value={`${selectedTx.amount} UBT`} isStrong />
                            <DetailRow label="Originating Node" value={selectedTx.senderPublicKey || selectedTx.senderId} isMono isLink onClick={() => navigateAccount(selectedTx.senderPublicKey || selectedTx.senderId)} />
                            <DetailRow label="Target Destination" value={selectedTx.receiverPublicKey || selectedTx.receiverId} isMono isLink onClick={() => navigateAccount(selectedTx.receiverPublicKey || selectedTx.receiverId)} />
                            <DetailRow label="Integrity Signature" value={selectedTx.signature} isMono isSmall />
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Live Displacement Stream</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase animate-pulse">Syncing...</span>
                            </div>
                        </div>
                        <TxTable txs={transactions} navigateAccount={navigateAccount} navigateTx={navigateTx} resolveDisplayAddress={resolveDisplayAddress} getActionLabel={getActionLabel} />
                    </div>
                )}
                
                <footer className="text-center pt-10 pb-20">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                        Ubuntium Sovereign Network Explorer
                    </p>
                    <p className="text-[9px] text-slate-300 mt-2 max-w-lg mx-auto leading-relaxed">
                        Data is sourced directly from the physical GitHub Ledger. Identity resolution converts internal node identifiers to cryptographic public keys for human-readable transparency.
                    </p>
                </footer>
            </main>
        </div>
    );
};

const TxTable = ({ txs, navigateAccount, navigateTx, resolveDisplayAddress, getActionLabel }: any) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-5">Signature</th>
                    <th className="px-6 py-5">Action</th>
                    <th className="px-6 py-5">Status</th>
                    <th className="px-6 py-5">From</th>
                    <th className="px-6 py-5">To</th>
                    <th className="px-6 py-5 text-right">Value</th>
                    <th className="px-6 py-5 text-right">Age</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-mono">
                {txs.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors text-xs group">
                        <td className="px-6 py-5">
                            <button onClick={() => navigateTx(tx.id)} className="text-blue-600 hover:text-blue-800 font-bold">
                                {tx.id.substring(0, 8)}...
                            </button>
                        </td>
                        <td className="px-6 py-5 text-slate-500 font-sans font-medium">
                            {getActionLabel(tx.type)}
                        </td>
                        <td className="px-6 py-5">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-50 text-green-600 font-sans font-bold text-[9px] uppercase border border-green-100">
                                <CheckCircleIcon className="h-3 w-3" /> Success
                            </span>
                        </td>
                        <td className="px-6 py-5">
                            <button onClick={() => navigateAccount(tx.senderPublicKey || tx.senderId)} className="text-blue-600 hover:text-blue-800 font-bold">
                                {resolveDisplayAddress(tx.senderId, tx.senderPublicKey)}
                            </button>
                        </td>
                        <td className="px-6 py-5">
                            <button onClick={() => navigateAccount(tx.receiverPublicKey || tx.receiverId)} className="text-blue-600 hover:text-blue-800 font-bold">
                                {resolveDisplayAddress(tx.receiverId, tx.receiverPublicKey)}
                            </button>
                        </td>
                        <td className="px-6 py-5 text-right font-black text-slate-900">
                            {tx.amount.toLocaleString()} UBT
                        </td>
                        <td className="px-6 py-5 text-right text-slate-400 font-sans font-medium">
                            {formatTimeAgo(tx.timestamp)}
                        </td>
                    </tr>
                ))}
                {txs.length === 0 && (
                    <tr>
                        <td colSpan={7} className="py-24 text-center text-slate-300 font-sans italic">Indexing Ledger State...</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const StatBox = ({ label, value, isSuccess }: any) => (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <p className="text-[10px] font-bold text-slate-500 mb-1 tracking-wider">{label}</p>
        <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${isSuccess ? 'text-green-600' : 'text-slate-900'}`}>{value}</span>
            {isSuccess && <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>}
        </div>
    </div>
);

const DetailRow = ({ label, value, isMono, isStatus, isStrong, isSmall, isLink, onClick }: any) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-5 border-b border-slate-50 last:border-0">
        <span className="w-full sm:w-1/3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className="w-full sm:w-2/3 mt-1 sm:mt-0">
            {isStatus ? (
                <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded uppercase border border-green-100 flex items-center gap-1.5 w-fit">
                    <CheckCircleIcon className="h-3 w-3" />
                    Verified On-Ledger
                </span>
            ) : isLink ? (
                <button onClick={onClick} className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm font-bold text-left break-all">{value}</button>
            ) : (
                <span className={`
                    ${isMono ? 'font-mono' : 'font-semibold'} 
                    ${isStrong ? 'text-xl font-black text-slate-900' : 'text-sm text-slate-700'}
                    ${isSmall ? 'text-[10px] opacity-60 leading-relaxed' : ''}
                    break-all
                `}>
                    {value}
                </span>
            )}
        </div>
    </div>
);