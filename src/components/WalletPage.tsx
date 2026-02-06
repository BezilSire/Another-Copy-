
import React, { useState, useEffect } from 'react';
import { User, UbtTransaction, GlobalEconomy, UserVault } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { formatTimeAgo } from '../utils';
import { ArrowUpRightIcon } from './icons/ArrowUpRightIcon';
import { ArrowDownLeftIcon } from './icons/ArrowDownLeftIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { UBTScan } from './UBTScan';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { SendIcon } from './icons/SendIcon';
import { SendUbtModal } from './SendUbtModal';
import { LockIcon } from './icons/LockIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { ProtocolReconciliation } from './ProtocolReconciliation';
import { IdentityVault } from './IdentityVault';

export const WalletPage: React.FC<{ user: User }> = ({ user }) => {
    const [transactions, setTransactions] = useState<UbtTransaction[]>([]);
    const [vaults, setVaults] = useState<UserVault[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [activeTab, setActiveTab] = useState<'ledger' | 'nodes' | 'security'>('ledger');
    const [isSendOpen, setIsSendOpen] = useState(false);
    const [isScanOpen, setIsScanOpen] = useState(false);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const unsubTx = api.listenForUserTransactions(user.id, (txs) => {
            setTransactions(txs as UbtTransaction[]);
        }, console.error);
        
        const unsubEcon = api.listenForGlobalEconomy(setEconomy, console.error);
        const unsubVaults = api.listenToUserVaults(user.id, setVaults);
        
        return () => { unsubTx(); unsubEcon(); unsubVaults(); };
    }, [user.id]);

    const handleCopyAddress = () => {
        if (!user.publicKey) return;
        navigator.clipboard.writeText(user.publicKey).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            addToast("Address Copied.", "info");
        });
    };

    const hotBalance = user.ubtBalance || 0;
    const currentPrice = economy?.ubt_to_usd_rate || 0.001; 
    const usdValue = hotBalance * currentPrice;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-32 px-4 font-sans">
            
            {/* BALANCES HUD */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/10 shadow-premium relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-gold/[0.04] to-transparent pointer-events-none"></div>
                 
                 <div className="relative z-10 flex flex-col gap-8">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                        <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live Node Active</span>
                            </div>
                            
                            <div className="space-y-1">
                                <div className="flex items-baseline gap-3">
                                    <h1 className="text-6xl sm:text-7xl font-bold text-white tracking-tight leading-none">
                                        {hotBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h1>
                                    <span className="text-xl font-bold text-slate-500 uppercase">UBT</span>
                                </div>
                                <div className="flex items-center gap-2 pl-1">
                                    <span className="text-lg font-bold text-brand-gold">≈ ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                                </div>
                            </div>
                        </div>

                        <div 
                            onClick={handleCopyAddress}
                            className="w-full lg:w-80 bg-black/40 border border-white/10 p-5 rounded-2xl flex flex-col gap-2 hover:border-brand-gold/30 transition-all group cursor-pointer"
                        >
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account Identity</p>
                                <div className="text-slate-500 group-hover:text-brand-gold transition-colors">
                                    {isCopied ? <ClipboardCheckIcon className="h-4 w-4 text-emerald-500" /> : <ClipboardIcon className="h-4 w-4" />}
                                </div>
                            </div>
                            <p className="text-[11px] text-brand-gold break-all font-bold group-hover:text-white transition-colors">
                                {user.publicKey || 'PROVISIONING...'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setIsSendOpen(true)}
                            className="bg-brand-gold text-slate-950 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.95] shadow-lg"
                        >
                            <SendIcon className="h-5 w-5" />
                            <span className="text-sm uppercase tracking-wide">Send $UBT</span>
                        </button>
                        <button 
                            onClick={() => setIsScanOpen(true)}
                            className="bg-white/5 text-white py-4 rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-[0.95] hover:bg-white/10"
                        >
                            <QrCodeIcon className="h-5 w-5" />
                            <span className="text-sm uppercase tracking-wide">Scan Code</span>
                        </button>
                    </div>
                 </div>
            </div>

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4">
                    <nav className="flex p-1 bg-slate-900 rounded-2xl gap-1 border border-white/10 w-fit">
                        <button 
                            onClick={() => setActiveTab('ledger')}
                            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'ledger' ? 'bg-brand-gold text-slate-950' : 'text-slate-500 hover:text-white'}`}
                        >
                            History
                        </button>
                        <button 
                            onClick={() => setActiveTab('nodes')}
                            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'nodes' ? 'bg-brand-gold text-slate-950' : 'text-slate-500 hover:text-white'}`}
                        >
                            Vaults
                        </button>
                        <button 
                            onClick={() => setActiveTab('security')}
                            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'security' ? 'bg-brand-gold text-slate-950' : 'text-slate-500 hover:text-white'}`}
                        >
                            Identity
                        </button>
                    </nav>
                    
                    <button 
                        onClick={() => setIsAuditOpen(true)}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition-all"
                    >
                        <HistoryIcon className="h-4 w-4" /> Run Audit
                    </button>
                </div>

                <div className="min-h-[400px]">
                    {activeTab === 'ledger' && (
                        <div className="space-y-3 animate-fade-in">
                            {transactions.length > 0 ? transactions.map(tx => (
                                <div key={tx.id} className="bg-slate-900/60 p-5 rounded-2xl border border-white/5 hover:border-brand-gold/10 transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-5">
                                        <div className={`p-3 rounded-xl ${tx.senderId === user.id ? 'bg-red-500/5 text-red-500' : 'bg-emerald-500/5 text-emerald-500'}`}>
                                            {tx.senderId === user.id ? <ArrowUpRightIcon className="h-5 w-5" /> : <ArrowDownLeftIcon className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white mb-0.5">
                                                {tx.type === 'FIAT_BRIDGE' ? 'Deposit' : tx.senderId === user.id ? 'Sent' : 'Received'}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{formatTimeAgo(tx.timestamp)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-lg font-bold tracking-tight ${tx.senderId === user.id ? 'text-slate-400' : 'text-emerald-500'}`}>
                                            {tx.senderId === user.id ? '-' : '+'} {tx.amount.toLocaleString()} UBT
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-600 mt-0.5">≈ ${(tx.amount * currentPrice).toFixed(2)} USD</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-20 text-center opacity-30">
                                    <p className="text-sm font-bold uppercase tracking-widest text-white">No history indexed</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'nodes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                            <div className="bg-slate-900/60 p-8 rounded-3xl border border-white/5 flex flex-col gap-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <TrendingUpIcon className="h-10 w-10 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Liquid Wallet</p>
                                    <h4 className="text-3xl font-bold text-white tracking-tight">{hotBalance.toLocaleString()} UBT</h4>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                    These funds are available for immediate use in the marketplace and peer-to-peer transfers.
                                </p>
                            </div>

                            {vaults.map(v => (
                                <div key={v.id} className="bg-slate-900/60 p-8 rounded-3xl border border-white/5 flex flex-col gap-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <LockIcon className="h-10 w-10 text-brand-gold" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{v.name}</p>
                                        <h4 className="text-3xl font-bold text-white tracking-tight">{v.balance.toLocaleString()} UBT</h4>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                        {v.type === 'LOCKED' ? `Your equity stake in the community. These funds grow as the commons succeeds.` : `A secure storage node for your long-term assets.`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="animate-fade-in max-w-xl mx-auto">
                            <IdentityVault onRestore={() => setActiveTab('ledger')} />
                        </div>
                    )}
                </div>
            </div>

            {isSendOpen && <SendUbtModal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} currentUser={user} onTransactionComplete={() => {}} />}
            {isScanOpen && <UBTScan currentUser={user} onTransactionComplete={() => {}} onClose={() => setIsScanOpen(false)} />}
            {isAuditOpen && <ProtocolReconciliation user={user} onClose={() => setIsAuditOpen(false)} />}
        </div>
    );
};
