
import React, { useState, useEffect } from 'react';
import { User, Transaction, GlobalEconomy, UserVault } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { WalletIcon } from './icons/WalletIcon';
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
import { KeyIcon } from './icons/KeyIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { IdentityVault } from './IdentityVault';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { LockIcon } from './icons/LockIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { PlusIcon } from './icons/PlusIcon';
import { HeartIcon } from './icons/HeartIcon';
import { ProtocolReconciliation } from './ProtocolReconciliation';
import { HistoryIcon } from './icons/HistoryIcon';

export const WalletPage: React.FC<{ user: User }> = ({ user }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    // FIX: UserVault is now correctly imported from ../types
    const [vaults, setVaults] = useState<UserVault[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [activeTab, setActiveTab] = useState<'vaults' | 'ledger' | 'security'>('vaults');
    const [isSendOpen, setIsSendOpen] = useState(false);
    const [isScanOpen, setIsScanOpen] = useState(false);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const unsubTx = api.listenForUserTransactions(user.id, setTransactions, console.error);
        const unsubEcon = api.listenForGlobalEconomy(setEconomy, console.error);
        const unsubVaults = api.listenToUserVaults(user.id, setVaults);
        return () => { unsubTx(); unsubEcon(); unsubVaults(); };
    }, [user.id]);

    const handleCopyAddress = () => {
        navigator.clipboard.writeText(user.publicKey || "").then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            addToast("Node Anchor Copied.", "info");
        });
    };

    const hotBalance = user.ubtBalance || 0;
    const usdValue = hotBalance * (economy?.ubt_to_usd_rate || 1.0);

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-32 px-4 font-sans">
            
            {/* SOVEREIGN HUD */}
            <div className="module-frame bg-slate-950 rounded-[3rem] p-8 sm:p-12 border-white/5 shadow-premium overflow-hidden group">
                 <div className="corner-tl"></div><div className="corner-tr"></div>
                 <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-gold/[0.02] to-transparent pointer-events-none"></div>
                 
                 <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                    <div className="space-y-6 flex-1">
                        <div className="flex items-center gap-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-glow-matrix"></div>
                            <span className="label-caps !text-[10px] text-emerald-500/80 !tracking-[0.4em]">Sovereign Capital Active</span>
                        </div>
                        
                        <div className="space-y-1">
                             <div className="flex items-baseline gap-4">
                                <h1 className="text-7xl sm:text-8xl font-black text-white tracking-tighter leading-none">{hotBalance.toLocaleString()}</h1>
                                <span className="text-2xl font-black text-gray-700 font-mono tracking-widest uppercase">UBT</span>
                             </div>
                             <div className="flex items-center gap-3 pl-1">
                                <span className="label-caps !text-[12px] text-gray-600">Protocol Equity Value</span>
                                <span className="data-mono text-xl text-brand-gold font-bold">&approx; ${usdValue.toFixed(2)} internal</span>
                             </div>
                        </div>
                    </div>

                    <div className="w-full lg:w-80 glass-card p-6 rounded-[2rem] border-white/10 flex flex-col gap-4 shadow-2xl hover:border-brand-gold/30 transition-all group cursor-pointer" onClick={handleCopyAddress}>
                        <div className="flex justify-between items-center">
                            <p className="label-caps !text-[9px] text-gray-500">Public Anchor</p>
                            <div className="text-gray-500 group-hover:text-brand-gold transition-colors">
                                {isCopied ? <ClipboardCheckIcon className="h-4 w-4 text-emerald-500" /> : <ClipboardIcon className="h-4 w-4" />}
                            </div>
                        </div>
                        <p className="data-mono text-[9px] text-brand-gold break-all leading-relaxed uppercase opacity-60 group-hover:opacity-100 transition-opacity">
                            {user.publicKey || 'PROVISIONING IDENTITY...'}
                        </p>
                    </div>
                 </div>

                 {/* Protocol Quick-Access Bar - Ecosystem Actions Only */}
                 <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 pt-10 border-t border-white/5">
                    <HUDButton onClick={() => setIsSendOpen(true)} icon={<SendIcon className="h-5 w-5" />} label="Dispatch" color="bg-brand-gold text-slate-950" />
                    <HUDButton onClick={() => setIsScanOpen(true)} icon={<QrCodeIcon className="h-5 w-5" />} label="Handshake" color="bg-white/5 text-gray-300" />
                    <HUDButton onClick={() => {}} icon={<HeartIcon className="h-5 w-5" />} label="Sustenance" color="bg-white/5 text-gray-300" />
                    <HUDButton onClick={() => {}} icon={<BriefcaseIcon className="h-5 w-5" />} label="Ventures" color="bg-white/5 text-gray-300" />
                 </div>
            </div>

            {/* CONTROL SPECTRUM */}
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                    <nav className="flex p-1.5 bg-slate-950/80 rounded-[2rem] gap-1 border border-white/5 w-fit shadow-2xl">
                        <NavTab active={activeTab === 'vaults'} onClick={() => setActiveTab('vaults')} label="Protocol Vaults" />
                        <NavTab active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} label="Immutable Log" />
                        <NavTab active={activeTab === 'security'} onClick={() => setActiveTab('security')} label="Node Security" />
                    </nav>
                    
                    <button 
                        onClick={() => setIsAuditOpen(true)}
                        className="flex items-center gap-3 px-6 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/20 transition-all"
                    >
                        <HistoryIcon className="h-4 w-4" /> Run Temporal Audit
                    </button>
                </div>

                <div className="min-h-[400px]">
                    {activeTab === 'vaults' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                            <VaultCard name="Social Float" balance={hotBalance} type="LIQUID" description="Assets currently available for internal peer exchange." icon={<TrendingUpIcon className="h-6 w-6 text-emerald-400" />} color="border-emerald-500/20" />
                            {vaults.map(v => (
                                <VaultCard key={v.id} name={v.name} balance={v.balance} type={v.type} description={v.type === 'LOCKED' ? `Vested until ${v.lockedUntil?.toDate().toLocaleDateString()}` : "Operational venture assets."} icon={v.type === 'LOCKED' ? <LockIcon className="h-6 w-6 text-red-400" /> : <BriefcaseIcon className="h-6 w-6 text-blue-400" />} color={v.type === 'LOCKED' ? "border-red-500/20" : "border-blue-500/20"} />
                            ))}
                            <button onClick={() => api.createUserVault(user.id, "Savings Node", "LOCKED", 30)} className="p-10 rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-5 hover:bg-white/[0.02] hover:border-brand-gold/20 transition-all text-gray-600 hover:text-brand-gold group">
                                <div className="p-4 rounded-2xl bg-white/5 group-hover:bg-brand-gold/10 transition-colors"><PlusIcon className="h-8 w-8" /></div>
                                <span className="label-caps !text-[9px] !tracking-[0.4em]">Partition New Vault</span>
                            </button>
                        </div>
                    )}

                    {activeTab === 'ledger' && (
                        <div className="space-y-2 animate-fade-in max-w-4xl">
                            {transactions.map(tx => (
                                <div key={tx.id} className="bg-slate-900/40 p-5 rounded-[1.5rem] border border-white/5 hover:border-brand-gold/10 transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-6">
                                        <div className={`p-3 rounded-xl ${tx.type.includes('sent') || tx.type === 'debit' ? 'bg-red-500/5 text-red-500' : 'bg-emerald-500/5 text-emerald-500'} border border-white/5`}>
                                            {tx.type.includes('sent') ? <ArrowUpRightIcon className="h-4 w-4" /> : <ArrowDownLeftIcon className="h-4 w-4" />}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-white uppercase tracking-widest leading-none mb-1.5">{tx.reason}</p>
                                            <div className="flex items-center gap-3">
                                                <span className="label-caps !text-[7px] text-gray-600">{formatTimeAgo(tx.timestamp.toDate().toISOString())}</span>
                                                <span className="text-[7px] font-black text-emerald-500/60 uppercase font-mono">Mainnet_Signed</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-lg font-black font-mono tracking-tighter ${tx.type.includes('sent') || tx.type === 'debit' ? 'text-gray-400' : 'text-emerald-500'}`}>
                                            {tx.type.includes('sent') ? '-' : '+'} {tx.amount.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="animate-fade-in max-w-2xl">
                            <IdentityVault onRestore={() => window.location.reload()} />
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

const HUDButton: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; color: string }> = ({ onClick, icon, label, color }) => (
    <button onClick={onClick} className={`${color} py-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.95] hover:opacity-90 shadow-lg group`}>
        <div className={`transition-all duration-300 group-hover:scale-110`}>{icon}</div>
        <span className="label-caps !text-[8px] !tracking-[0.3em] font-black">{label}</span>
    </button>
);

const NavTab: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
    <button onClick={onClick} className={`px-8 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${active ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-600 hover:text-gray-300'}`}>
        {label}
    </button>
);

const VaultCard: React.FC<{ name: string; balance: number; type: string; description: string; icon: React.ReactNode; color: string }> = ({ name, balance, description, icon, color }) => (
    <div className={`glass-card p-8 rounded-[2.5rem] border-white/5 hover:border-brand-gold/20 transition-all duration-500 group relative overflow-hidden flex flex-col border-t-2 ${color}`}>
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-40 transition-opacity">{icon}</div>
        <p className="label-caps !text-[8px] text-gray-500 mb-2">{name}</p>
        <p className="text-4xl font-black text-white font-mono tracking-tighter leading-none mb-6">{balance.toLocaleString()}</p>
        <div className="mt-auto pt-6 border-t border-white/5">
             <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-relaxed">{description}</p>
        </div>
    </div>
);
