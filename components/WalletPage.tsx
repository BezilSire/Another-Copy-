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
// FIX: Added missing icon imports
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { PlusIcon } from './icons/PlusIcon';

export const WalletPage: React.FC<{ user: User }> = ({ user }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [vaults, setVaults] = useState<UserVault[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [activeTab, setActiveTab] = useState<'vaults' | 'ledger' | 'security'>('vaults');
    const [isSendOpen, setIsSendOpen] = useState(false);
    const [isScanOpen, setIsScanOpen] = useState(false);
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
        <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-32 px-4">
            
            {/* HUD: Identity & Global Liquidity */}
            <div className="relative p-10 sm:p-16 rounded-[4rem] bg-black border-2 border-white/5 shadow-2xl overflow-hidden module-frame">
                 <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-brand-gold/[0.03] blur-[100px] pointer-events-none"></div>
                 
                 <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 bg-emerald-500/10 w-fit px-5 py-2 rounded-full border border-emerald-500/20">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-glow-matrix"></div>
                            <span className="label-caps !text-[9px] text-emerald-400 !tracking-[0.4em]">Primary Node Active</span>
                        </div>
                        
                        <div className="space-y-2">
                             <h1 className="text-8xl sm:text-9xl font-black text-white tracking-tighter leading-none font-sans">{hotBalance.toLocaleString()}</h1>
                             <div className="flex items-baseline gap-4 ml-2">
                                <span className="label-caps !text-[14px] text-gray-600 !tracking-[0.4em]">Quantum UBT</span>
                                <span className="data-mono text-2xl text-emerald-400 font-black tracking-tighter">&approx; ${usdValue.toFixed(2)} USD</span>
                             </div>
                        </div>
                    </div>

                    <div className="w-full lg:w-96 glass-card p-8 rounded-[2.5rem] border-white/10 flex flex-col gap-6 shadow-2xl hover:border-brand-gold/30 transition-all group cursor-pointer" onClick={handleCopyAddress}>
                        <div className="flex justify-between items-center">
                            <p className="label-caps !text-[10px] text-gray-500">Public Node Anchor</p>
                            <div className="text-gray-400 group-hover:text-brand-gold transition-colors">
                                {isCopied ? <ClipboardCheckIcon className="h-5 w-5 text-emerald-500" /> : <ClipboardIcon className="h-5 w-5" />}
                            </div>
                        </div>
                        <p className="data-mono text-[10px] text-brand-gold break-all leading-relaxed opacity-80 uppercase">{user.publicKey || 'PROVISIONING...'}</p>
                    </div>
                 </div>

                 {/* Protocol Control Bar */}
                 <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16">
                    <HUDButton onClick={() => setIsSendOpen(true)} icon={<SendIcon className="h-5 w-5" />} label="Dispatch" color="bg-brand-gold text-slate-950" premium />
                    <HUDButton onClick={() => setIsScanOpen(true)} icon={<QrCodeIcon className="h-5 w-5" />} label="Handshake" color="bg-white/5 text-brand-gold" />
                    <HUDButton onClick={() => setActiveTab('security')} icon={<ShieldCheckIcon className="h-5 w-5" />} label="Authorize" color="bg-white/5 text-gray-500" />
                    <HUDButton onClick={() => setActiveTab('ledger')} icon={<DatabaseIcon className="h-5 w-5" />} label="Audit" color="bg-white/5 text-gray-500" />
                 </div>
            </div>

            {/* Content Spectrum */}
            <div className="space-y-10">
                <nav className="flex p-2 bg-slate-950/80 rounded-[2.5rem] gap-2 border border-white/5 w-fit mx-auto sm:mx-0 shadow-2xl">
                    <NavTab active={activeTab === 'vaults'} onClick={() => setActiveTab('vaults')} label="Sovereign Vaults" />
                    <NavTab active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} label="Local Ledger" />
                    <NavTab active={activeTab === 'security'} onClick={() => setActiveTab('security')} label="Node Security" />
                </nav>

                {activeTab === 'vaults' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                        {/* Static Hot Wallet View */}
                        <VaultCard name="Hot Wallet" balance={hotBalance} type="HOT" description="Liquid protocol assets for bazaar trade." icon={<TrendingUpIcon className="h-6 w-6 text-emerald-400" />} color="border-emerald-500/20" />
                        
                        {vaults.map(v => (
                            <VaultCard key={v.id} name={v.name} balance={v.balance} type={v.type} description={v.type === 'LOCKED' ? `Locked until ${v.lockedUntil?.toDate().toLocaleDateString()}` : "Operational venture assets."} icon={v.type === 'LOCKED' ? <LockIcon className="h-6 w-6 text-red-400" /> : <BriefcaseIcon className="h-6 w-6 text-blue-400" />} color={v.type === 'LOCKED' ? "border-red-500/20" : "border-blue-500/20"} />
                        ))}
                        
                        <button 
                            onClick={() => api.createUserVault(user.id, "Emergency Fund", "LOCKED", 30)}
                            className="p-10 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-6 hover:bg-white/[0.02] hover:border-brand-gold/20 transition-all text-gray-600 hover:text-brand-gold group"
                        >
                            <div className="p-4 rounded-2xl bg-white/5 group-hover:bg-brand-gold/10 transition-colors">
                                <PlusIcon className="h-8 w-8" />
                            </div>
                            <span className="label-caps !text-[10px] !tracking-[0.4em]">Partition New Vault</span>
                        </button>
                    </div>
                )}

                {activeTab === 'ledger' && (
                    <div className="space-y-4 animate-fade-in">
                        {transactions.map(tx => (
                            <div key={tx.id} className="glass-card p-6 rounded-[2.5rem] border-white/5 hover:border-brand-gold/20 transition-all flex items-center justify-between group">
                                <div className="flex items-center gap-6">
                                    <div className={`p-4 rounded-2xl ${tx.type.includes('sent') || tx.type === 'debit' ? 'bg-red-500/5 text-red-500' : 'bg-green-500/5 text-green-500'} border border-white/5 shadow-inner`}>
                                        {tx.type.includes('sent') ? <ArrowUpRightIcon className="h-5 w-5" /> : <ArrowDownLeftIcon className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-white uppercase tracking-widest">{tx.reason}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="label-caps !text-[7px]">{formatTimeAgo(tx.timestamp.toDate().toISOString())}</span>
                                            {tx.protocol_mode && <span className="text-[7px] font-black text-gray-600 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 uppercase">{tx.protocol_mode}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xl font-black font-mono tracking-tighter ${tx.type.includes('sent') || tx.type === 'debit' ? 'text-white' : 'text-emerald-400'}`}>
                                        {tx.type.includes('sent') ? '-' : '+'} {tx.amount.toFixed(2)}
                                    </p>
                                    <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Quantum_Asset</p>
                                </div>
                            </div>
                        ))}
                        {transactions.length === 0 && (
                            <div className="py-40 text-center glass-card rounded-[4rem] border-white/5 opacity-50">
                                <DatabaseIcon className="h-16 w-16 mx-auto mb-6 text-gray-800" />
                                <p className="label-caps !text-[12px] !tracking-[0.6em]">No Sync History Indexed</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="animate-fade-in">
                        <IdentityVault onRestore={() => window.location.reload()} />
                    </div>
                )}
            </div>

            {isSendOpen && <SendUbtModal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} currentUser={user} onTransactionComplete={() => {}} />}
            {isScanOpen && <UBTScan currentUser={user} onTransactionComplete={() => {}} onClose={() => setIsScanOpen(false)} />}
        </div>
    );
};

const HUDButton: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; color: string; premium?: boolean }> = ({ onClick, icon, label, color, premium }) => (
    <button onClick={onClick} className={`${color} py-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center gap-5 transition-all active:scale-[0.9] hover:border-brand-gold/40 shadow-2xl group`}>
        <div className={`transition-all duration-500 group-hover:scale-125 ${premium ? 'drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]' : ''}`}>{icon}</div>
        <span className="label-caps !text-[9px] !tracking-[0.4em] font-black">{label}</span>
    </button>
);

const NavTab: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
    <button onClick={onClick} className={`px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 ${active ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-600 hover:text-gray-300'}`}>
        {label}
    </button>
);

const VaultCard: React.FC<{ name: string; balance: number; type: string; description: string; icon: React.ReactNode; color: string }> = ({ name, balance, description, icon, color }) => (
    <div className={`glass-card p-10 rounded-[3rem] border-white/5 hover:border-brand-gold/30 transition-all duration-500 group relative overflow-hidden border-t-4 ${color}`}>
        <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity">
            {icon}
        </div>
        <p className="label-caps !text-[9px] text-gray-500 mb-2">{name}</p>
        <p className="text-5xl font-black text-white font-mono tracking-tighter leading-none mb-10">{balance.toLocaleString()}</p>
        <div className="pt-6 border-t border-white/5">
             <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest leading-loose">{description}</p>
        </div>
    </div>
);