
import React, { useState, useEffect } from 'react';
import { User, Transaction, GlobalEconomy, PayoutRequest } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { WalletIcon } from './icons/WalletIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { formatTimeAgo } from '../utils';
import { ArrowUpRightIcon } from './icons/ArrowUpRightIcon';
import { ArrowDownLeftIcon } from './icons/ArrowDownLeftIcon';
import { RedeemUbtModal } from './RedeemUbtModal';
import { WithdrawOnchainModal } from './WithdrawOnchainModal';
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

interface WalletPageProps {
  user: User;
  onNavigateToLedger?: (type: 'tx' | 'address', value: string) => void;
  initialTab?: 'history' | 'security';
}

const TransactionEntry: React.FC<{ tx: Transaction, onNavigate?: (hash: string) => void }> = ({ tx, onNavigate }) => {
    const isSent = tx.type === 'debit' || tx.type === 'p2p_sent' || tx.type === 'liquidation_lock';
    const amountColor = isSent ? 'text-white' : 'text-emerald-400';
    const icon = isSent ? <ArrowUpRightIcon className="h-3 w-3" /> : <ArrowDownLeftIcon className="h-3 w-3" />;
    const iconBg = isSent ? 'bg-slate-800 text-gray-400' : 'bg-emerald-950/40 text-emerald-400';

    return (
        <div className="flex items-center justify-between p-6 bg-slate-950/90 rounded-2xl hover:bg-black transition-all border border-white/10 group module-frame shadow-xl">
            <div className="flex items-center space-x-5">
                <div className={`p-3.5 rounded-xl ${iconBg} border border-white/5 shadow-inner`}>
                    {icon}
                </div>
                <div>
                    <p className="font-black text-white text-xs tracking-[0.1em] uppercase">{tx.reason}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                         <p className="data-mono text-[9px] text-gray-500 font-bold uppercase tracking-widest">{formatTimeAgo(tx.timestamp.toDate().toISOString())}</p>
                         {tx.txHash && onNavigate && (
                             <button onClick={() => onNavigate(tx.txHash!)} className="data-mono text-[9px] text-brand-gold hover:text-white font-black uppercase tracking-tighter transition-colors">
                                 [ VERIFY_BLOCK ]
                             </button>
                         )}
                    </div>
                </div>
            </div>
            <div className={`data-mono font-black text-lg ${amountColor} tracking-tighter`}>
                {isSent ? '-' : '+'} {tx.amount.toFixed(2)}
            </div>
        </div>
    );
};

export const WalletPage: React.FC<WalletPageProps> = ({ user, onNavigateToLedger, initialTab = 'history' }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isScanOpen, setIsScanOpen] = useState(false);
    const [isSendOpen, setIsSendOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'history' | 'security'>(initialTab);
    
    const ubtBalance = user.ubtBalance || 0;
    const usdValue = ubtBalance * (economy?.ubt_to_usd_rate || 0);
    const walletAddress = user.publicKey || "AUTH_PROTOCOL_PENDING...";

    useEffect(() => {
        setIsLoading(true);
        const unsubTx = api.listenForUserTransactions(user.id, setTransactions, console.error);
        const unsubEcon = api.listenForGlobalEconomy(setEconomy, console.error);
        setIsLoading(false);
        return () => { unsubTx(); unsubEcon(); };
    }, [user.id]);

    const handleCopyAddress = () => {
        navigator.clipboard.writeText(walletAddress).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-28 px-4">
            {isScanOpen && <UBTScan currentUser={user} onTransactionComplete={() => {}} onClose={() => setIsScanOpen(false)} />}
            {isSendOpen && <SendUbtModal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} currentUser={user} onTransactionComplete={() => {}} />}
            
            {/* Liquidity Node Panel */}
            <div className="relative overflow-hidden rounded-[4rem] bg-black border-2 border-white/5 shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] p-8 sm:p-14 module-frame">
                 <div className="corner-tl !w-16 !h-16"></div><div className="corner-tr !w-16 !h-16"></div><div className="corner-bl !w-16 !h-16"></div><div className="corner-br !w-16 !h-16"></div>
                 
                 <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-emerald-500/[0.04] blur-[100px] pointer-events-none"></div>
                 
                 <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-14">
                    <div className="space-y-8 w-full lg:w-auto">
                        <div className="flex items-center gap-4 bg-emerald-500/10 w-fit px-6 py-2.5 rounded-full border border-emerald-500/30">
                             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
                             <span className="label-caps !text-[10px] !text-emerald-400 !tracking-[0.4em] font-black">Node Verified & Active</span>
                        </div>
                        
                        <div className="space-y-3">
                             <h1 className="text-8xl sm:text-9xl font-black text-white tracking-tighter leading-none font-sans drop-shadow-[0_10px_30px_rgba(0,0,0,1)]">{ubtBalance.toLocaleString()}</h1>
                             <div className="flex items-baseline gap-6 pl-2 border-l-4 border-brand-gold/30">
                                 <p className="data-mono text-3xl font-black text-gray-500 tracking-tighter uppercase">Quantum UBT</p>
                                 <p className="data-mono text-2xl text-emerald-400 font-black tracking-tighter">&approx; ${usdValue.toFixed(2)} USD</p>
                             </div>
                        </div>
                    </div>

                    <div className="w-full lg:w-80">
                        <div className="bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/10 flex flex-col gap-6 cursor-pointer hover:border-brand-gold/40 transition-all group shadow-2xl" onClick={handleCopyAddress}>
                            <div className="flex justify-between items-center">
                                <p className="label-caps !text-[10px] !text-gray-400">Node Public Anchor</p>
                                <div className="text-gray-400 group-hover:text-brand-gold transition-colors">
                                    {isCopied ? <ClipboardCheckIcon className="h-6 w-6 text-emerald-500 shadow-glow-matrix" /> : <ClipboardIcon className="h-6 w-6" />}
                                </div>
                            </div>
                            <p className="data-mono text-[11px] text-brand-gold break-all leading-relaxed font-black tracking-tight">{walletAddress}</p>
                        </div>
                    </div>
                 </div>

                 {/* Protocol Action Grid */}
                 <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-20">
                    <ActionNode onClick={() => setIsSendOpen(true)} icon={<SendIcon className="h-6 w-6" />} label="Broadcast" color="bg-brand-gold text-slate-950" premium />
                    <ActionNode onClick={() => setIsScanOpen(true)} icon={<QrCodeIcon className="h-6 w-6" />} label="Handshake" color="bg-slate-900 text-brand-gold" />
                    <ActionNode onClick={() => setIsRedeemModalOpen(true)} icon={<ArrowUpRightIcon className="h-6 w-6" />} label="Dissolve" color="bg-slate-900 text-white/60" />
                    <ActionNode onClick={() => setActiveTab('security')} icon={<KeyIcon className="h-6 w-6" />} label="Identity" color="bg-slate-900 text-white/60" />
                 </div>
            </div>

            {/* Ledger Spectrum */}
            <div className="space-y-10">
                <div className="flex border border-white/10 p-2 gap-3 bg-slate-950/80 rounded-[2.5rem] w-fit border border-white/10 mx-auto sm:mx-0 shadow-2xl">
                    <button onClick={() => setActiveTab('history')} className={`px-12 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 ${activeTab === 'history' ? 'bg-brand-gold text-slate-950 font-black shadow-glow-gold' : 'text-gray-500 hover:text-gray-300'}`}>Local Ledger</button>
                    <button onClick={() => setActiveTab('security')} className={`px-12 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 ${activeTab === 'security' ? 'bg-brand-gold text-slate-950 font-black shadow-glow-gold' : 'text-gray-500 hover:text-gray-300'}`}>Security Vault</button>
                </div>

                {activeTab === 'history' ? (
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="flex justify-center py-32"><LoaderIcon className="h-10 w-10 animate-spin text-brand-gold opacity-50" /></div>
                        ) : transactions.length > 0 ? (
                            transactions.map(tx => <TransactionEntry key={tx.id} tx={tx} onNavigate={(hash) => onNavigateToLedger && onNavigateToLedger('tx', hash)} />)
                        ) : (
                            <div className="text-center py-40 glass-module rounded-[4rem] border border-white/5 module-frame opacity-50">
                                <DatabaseIcon className="h-16 w-16 mx-auto mb-6 text-gray-800" />
                                <p className="label-caps !text-[12px] !tracking-[0.8em]">No Syncs Detected</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        <IdentityVault onRestore={() => window.location.reload()} />
                    </div>
                )}
            </div>

            <RedeemUbtModal isOpen={isRedeemModalOpen} onClose={() => setIsRedeemModalOpen(false)} currentUser={user} economy={economy} onTransactionComplete={() => {}} />
            <WithdrawOnchainModal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} currentUser={user} onTransactionComplete={() => {}} />
        </div>
    );
};

const ActionNode: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; color: string; premium?: boolean }> = ({ onClick, icon, label, color, premium }) => (
    <button onClick={onClick} className={`${color} py-9 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all active:scale-[0.9] shadow-2xl group border border-white/5 hover:border-brand-gold/40`}>
        <div className={`transition-all duration-500 group-hover:scale-125 ${premium ? 'drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]' : ''}`}>{icon}</div>
        <span className="label-caps !text-[9px] !tracking-[0.35em] !font-black">{label}</span>
    </button>
);
