
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
import { InfoIcon } from './icons/InfoIcon';
import { WithdrawOnchainModal } from './WithdrawOnchainModal';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { UBTScan } from './UBTScan';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { SendIcon } from './icons/SendIcon';
import { SendUbtModal } from './SendUbtModal';
import { KeyIcon } from './icons/KeyIcon';

interface WalletPageProps {
  user: User;
  onNavigateToLedger?: (type: 'tx' | 'address', value: string) => void;
}

const PayoutStatusBadge: React.FC<{ status: PayoutRequest['status'] }> = ({ status }) => {
    const baseClasses = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider';
    switch (status) {
        case 'pending': return <span className={`${baseClasses} bg-yellow-900/30 text-yellow-500 border border-yellow-800`}>Pending</span>;
        case 'completed': return <span className={`${baseClasses} bg-green-900/30 text-green-500 border border-green-800`}>Completed</span>;
        case 'rejected': return <span className={`${baseClasses} bg-red-900/30 text-red-500 border border-red-800`}>Rejected</span>;
        default: return null;
    }
};

const TransactionItem: React.FC<{ tx: Transaction, onNavigate?: (hash: string) => void }> = ({ tx, onNavigate }) => {
    const isSent = tx.type === 'debit' || tx.type === 'p2p_sent';
    const amountColor = isSent ? 'text-white' : 'text-green-400';
    const icon = isSent ? <ArrowUpRightIcon className="h-4 w-4" /> : <ArrowDownLeftIcon className="h-4 w-4" />;
    const iconBg = isSent ? 'bg-slate-700 text-gray-400' : 'bg-green-900/30 text-green-400';

    return (
        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl hover:bg-slate-800/80 transition-colors border border-slate-800/50">
            <div className="flex items-center space-x-4">
                <div className={`p-2.5 rounded-full ${iconBg}`}>
                    {icon}
                </div>
                <div>
                    <p className="font-semibold text-white text-sm">{tx.reason}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                         <p className="text-xs text-gray-500 font-mono">{formatTimeAgo(tx.timestamp.toDate().toISOString())}</p>
                         {tx.txHash && onNavigate && (
                             <button onClick={() => onNavigate(tx.txHash!)} className="text-[10px] text-blue-500 hover:text-blue-400 font-medium">
                                 EXPLORE
                             </button>
                         )}
                    </div>
                </div>
            </div>
            <div className={`font-mono font-bold ${amountColor}`}>
                {isSent ? '-' : '+'} {tx.amount.toFixed(2)}
            </div>
        </div>
    );
};

export const WalletPage: React.FC<WalletPageProps> = ({ user, onNavigateToLedger }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isScanOpen, setIsScanOpen] = useState(false);
    const [isSendOpen, setIsSendOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    
    const ubtBalance = user.ubtBalance || 0;
    const usdValue = ubtBalance * (economy?.ubt_to_usd_rate || 0);
    const walletAddress = user.publicKey || "Generating...";

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
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
            {isScanOpen && <UBTScan currentUser={user} onTransactionComplete={() => {}} onClose={() => setIsScanOpen(false)} />}
            {isSendOpen && <SendUbtModal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} currentUser={user} onTransactionComplete={() => {}} />}
            
            {/* Main Balance Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 shadow-2xl p-6 sm:p-8">
                 {/* Decorative background elements */}
                 <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-green-500/10 blur-3xl"></div>
                 <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl"></div>

                 <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                             <WalletIcon className="h-5 w-5" />
                             <span className="text-sm font-medium uppercase tracking-widest">Total Balance</span>
                        </div>
                        <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight">{ubtBalance.toLocaleString()} <span className="text-3xl text-gray-500 font-light">UBT</span></h1>
                        <p className="text-lg text-green-400 font-mono">≈ ${usdValue.toFixed(2)} USD</p>
                    </div>

                    <div className="w-full md:w-auto flex flex-col gap-3">
                         {/* Address Pill */}
                        <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-3 cursor-pointer hover:bg-black/40 transition-colors group" onClick={handleCopyAddress}>
                            <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                                <QrCodeIcon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Wallet Address</p>
                                <p className="text-xs font-mono text-green-400 truncate max-w-[180px] sm:max-w-[200px]">{walletAddress}</p>
                            </div>
                            <div className="text-gray-500 group-hover:text-white transition-colors">
                                {isCopied ? <ClipboardCheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardIcon className="h-4 w-4" />}
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* Action Buttons */}
                 <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                    <ActionButton onClick={() => setIsSendOpen(true)} icon={<SendIcon className="h-6 w-6" />} label="Send" color="bg-blue-600 hover:bg-blue-500" />
                    <ActionButton onClick={() => setIsScanOpen(true)} icon={<QrCodeIcon className="h-6 w-6" />} label="Scan" color="bg-green-600 hover:bg-green-500" />
                    <ActionButton onClick={() => setIsRedeemModalOpen(true)} icon={<ArrowUpRightIcon className="h-6 w-6" />} label="Cash Out" color="bg-slate-700 hover:bg-slate-600" />
                    <ActionButton onClick={() => setIsWithdrawModalOpen(true)} icon={<KeyIcon className="h-6 w-6" />} label="Self Custody" color="bg-slate-700 hover:bg-slate-600" />
                 </div>
            </div>

            {/* Transaction History */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Recent Activity</h3>
                    <button className="text-sm text-green-400 hover:text-green-300 font-medium">View All</button>
                </div>
                <div className="p-4 space-y-2">
                    {isLoading ? (
                        <div className="flex justify-center py-12"><LoaderIcon className="h-8 w-8 animate-spin text-green-500" /></div>
                    ) : transactions.length > 0 ? (
                        transactions.map(tx => <TransactionItem key={tx.id} tx={tx} onNavigate={(hash) => onNavigateToLedger && onNavigateToLedger('tx', hash)} />)
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <InfoIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>No transactions found.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <RedeemUbtModal isOpen={isRedeemModalOpen} onClose={() => setIsRedeemModalOpen(false)} currentUser={user} economy={economy} onTransactionComplete={() => {}} />
            <WithdrawOnchainModal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} currentUser={user} onTransactionComplete={() => {}} />
        </div>
    );
};

const ActionButton: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; color: string }> = ({ onClick, icon, label, color }) => (
    <button onClick={onClick} className={`${color} p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg group`}>
        <div className="text-white opacity-90 group-hover:opacity-100">{icon}</div>
        <span className="text-sm font-bold text-white">{label}</span>
    </button>
);
