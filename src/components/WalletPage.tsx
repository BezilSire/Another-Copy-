
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
            addToast("Node Anchor Copied.", "info");
        });
    };

    const hotBalance = user.ubtBalance || 0;
    const currentPrice = economy?.ubt_to_usd_rate || 0.001; 
    const usdValue = hotBalance * currentPrice;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-32 px-4 font-sans">
            
            {/* SOVEREIGN VAULT HUD */}
            <div className="module-frame bg-slate-950 rounded-[3rem] p-8 sm:p-10 border-white/5 shadow-premium relative overflow-hidden group">
                 <div className="corner-tl"></div><div className="corner-tr"></div>
                 <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-gold/[0.03] to-transparent pointer-events-none"></div>
                 
                 <div className="relative z-10 flex flex-col gap-10">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-4">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-glow-matrix"></div>
                                <span className="label-caps !text-[10px] text-emerald-500/80 !tracking-[0.4em]">Sovereign Node Active</span>
                            </div>
                            
                            <div className="space-y-1">
                                <div className="flex items-baseline gap-4">
                                    <h1 className="text-6xl sm:text-7xl font-black text-white tracking-tighter leading-none">
                                        {hotBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </h1>
                                    <span className="text-xl font-black text-white font-mono tracking-widest uppercase">UBT</span>
                                </div>
                                <div className="flex items-center gap-3 pl-1">
                                    <span className="label-caps !text-[11px] text-white">Oracle Valuation</span>
                                    <span className="data-mono text-lg text-brand-gold font-black">&approx; ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                                </div>
                            </div>
                        </div>

                        <div 
                            onClick={handleCopyAddress}
                            className="w-full lg:w-80 bg-black border border-white/10 p-6 rounded-[1.5rem] flex flex-col gap-3 shadow-inner hover:border-brand-gold/40 transition-all group cursor-pointer"
                        >
                            <div className="flex justify-between items-center">
                                <p className="label-caps !text-[10px] text-white !tracking-widest">Public Address Anchor</p>
                                <div className="text-white group-hover:text-brand-gold transition-colors">
                                    {isCopied ? <ClipboardCheckIcon className="h-4 w-4 text-emerald-500" /> : <ClipboardIcon className="h-4 w-4" />}
                                </div>
                            </div>
                            <p className="data-mono text-[9px] text-brand-gold break-all leading-tight uppercase font-black tracking-tight group-hover:text-white transition-colors">
                                {user.publicKey || 'PROVISIONING IDENTITY...'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setIsSendOpen(true)}
                            className="bg-brand-gold text-slate-950 py-4 rounded-2xl border border-brand-gold/20 flex items-center justify-center gap-3 transition-all active:scale-[0.95] shadow-glow-gold group"
                        >
                            <SendIcon className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Direct Dispatch</span>
                        </button>
                        <button 
                            onClick={() => setIsScanOpen(true)}
                            className="bg-white/5 text-white py-4 rounded-2xl border border-white/10 flex items-center justify-center gap-3 transition-all active:scale-[0.95] hover:bg-white/10 group shadow-xl"
                        >
                            <QrCodeIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Scan Pay</span>
                        </button>
                    </div>
                 </div>
            </div>

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 px-4 overflow-x-auto no-scrollbar pb-2">
                    <nav className="flex p-1.5 bg-slate-950/80 rounded-[2rem] gap-1 border border-white/5 w-fit shadow-2xl flex-shrink-0">
                        <button 
                            onClick={() => setActiveTab('ledger')}
                            className={`px-8 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === 'ledger' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-white hover:opacity-80'}`}
                        >
                            Ledger History
                        </button>
                        <button 
                            onClick={() => setActiveTab('nodes')}
                            className={`px-8 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === 'nodes' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-white hover:opacity-80'}`}
                        >
                            Cold Storage
                        </button>
                        <button 
                            onClick={() => setActiveTab('security')}
                            className={`px-8 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-[0.3em] transition-all ${activeTab === 'security' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-white hover:opacity-80'}`}
                        >
                            Security Config
                        </button>
                    </nav>
                    
                    <button 
                        onClick={() => setIsAuditOpen(true)}
                        className="flex-shrink-0 flex items-center gap-3 px-6 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/20 transition-all shadow-lg active:scale-95"
                    >
                        <HistoryIcon className="h-4 w-4" /> Run Protocol Audit
                    </button>
                </div>

                <div className="min-h-[400px]">
                    {activeTab === 'ledger' && (
                        <div className="space-y-3 animate-fade-in">
                            {transactions.length > 0 ? transactions.map(tx => (
                                <div key={tx.id} className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 hover:border-brand-gold/10 transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-6">
                                        <div className={`p-4 rounded-2xl ${tx.senderId === user.id ? 'bg-red-500/5 text-red-500' : 'bg-emerald-500/5 text-emerald-500'} border border-white/5`}>
                                            {tx.senderId === user.id ? <ArrowUpRightIcon className="h-5 w-5" /> : <ArrowDownLeftIcon className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white uppercase tracking-widest leading-none mb-2">
                                                {tx.type === 'FIAT_BRIDGE' ? 'Bridge Settlement' : tx.senderId === user.id ? 'Asset Dispatch' : 'Asset Ingress'}
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{formatTimeAgo(tx.timestamp)}</span>
                                                <span className="text-[9px] font-black text-emerald-500/40 uppercase font-mono">Finalized</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xl font-black font-mono tracking-tighter ${tx.senderId === user.id ? 'text-gray-400' : 'text-emerald-500'}`}>
                                            {tx.senderId === user.id ? '-' : '+'} {tx.amount.toLocaleString()}
                                        </p>
                                        <p className="text-[10px] font-black text-gray-600 font-mono tracking-widest mt-1">≈ ${(tx.amount * currentPrice).toFixed(4)} USD</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-20 text-center opacity-20">
                                    <p className="label-caps !text-[12px] !tracking-[0.6em] text-white">No Ledger Events Indexed</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'nodes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                            <div className="module-frame glass-module p-8 rounded-[2.5rem] border-white/5 flex flex-col gap-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                                    <TrendingUpIcon className="h-10 w-10 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="label-caps !text-[9px] text-gray-500 mb-2">Operational Float</p>
                                    <h4 className="text-3xl font-black text-white font-mono">{hotBalance.toLocaleString()} UBT</h4>
                                </div>
                                <p className="text-[10px] text-gray-400 uppercase font-black leading-relaxed">
                                    <strong className="text-white">Liquid Assets:</strong> Available for immediate peer-to-peer exchange and marketplace settlement.
                                </p>
                            </div>

                            {vaults.map(v => (
                                <div key={v.id} className="module-frame glass-module p-8 rounded-[2.5rem] border-white/5 flex flex-col gap-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                                        <LockIcon className="h-10 w-10 text-brand-gold" />
                                    </div>
                                    <div>
                                        <p className="label-caps !text-[9px] text-gray-500 mb-2">{v.name}</p>
                                        <h4 className="text-3xl font-black text-white font-mono">{v.balance.toLocaleString()} UBT</h4>
                                    </div>
                                    <p className="text-[10px] text-gray-400 uppercase font-black leading-relaxed">
                                        {v.type === 'LOCKED' ? `Vested node. These assets are locked to strengthen system equity.` : `Cold storage node. Secure assets away from operational float.`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="animate-fade-in max-w-2xl mx-auto">
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
