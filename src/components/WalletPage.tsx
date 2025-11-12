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
import { ClockIcon } from './icons/ClockIcon';
import { InfoIcon } from './icons/InfoIcon';
import { WithdrawOnchainModal } from './WithdrawOnchainModal';

interface WalletPageProps {
  user: User;
}

const PayoutStatusBadge: React.FC<{ status: PayoutRequest['status'] }> = ({ status }) => {
    const baseClasses = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize';
    switch (status) {
        case 'pending': return <span className={`${baseClasses} bg-yellow-800 text-yellow-300`}>Pending</span>;
        case 'completed': return <span className={`${baseClasses} bg-green-800 text-green-300`}>Completed</span>;
        case 'rejected': return <span className={`${baseClasses} bg-red-800 text-red-300`}>Rejected</span>;
        default: return null;
    }
};


const PayoutRequestItem: React.FC<{ payout: PayoutRequest }> = ({ payout }) => {
    const getTitleAndAmount = () => {
        switch (payout.type) {
            case 'onchain_withdrawal':
                return { title: 'On-chain Withdrawal', amount: `${payout.amount.toFixed(2)} $UBT` };
            case 'ubt_redemption':
                return { title: 'Ecocash Redemption', amount: `$${payout.amount.toFixed(2)}` };
            case 'referral':
                return { title: 'Referral Payout', amount: `$${payout.amount.toFixed(2)}` };
            case 'commission':
                 return { title: 'Commission Payout', amount: `$${payout.amount.toFixed(2)}` };
            default:
                 return { title: 'Payout Request', amount: `$${payout.amount.toFixed(2)}` };
        }
    }

    const { title, amount } = getTitleAndAmount();

    return (
        <li className="p-3">
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-semibold text-white">{title}</p>
                    <p className="text-xs text-gray-400">Requested {formatTimeAgo(payout.requestedAt.toDate().toISOString())}</p>
                </div>
                <div className="text-right">
                    <p className="font-semibold text-lg font-mono text-white">{amount}</p>
                    <PayoutStatusBadge status={payout.status} />
                </div>
            </div>
            {payout.status === 'completed' && payout.completedAt && (
                <p className="text-xs text-green-400 mt-1">Completed {formatTimeAgo(payout.completedAt.toDate().toISOString())}</p>
            )}
             {payout.status === 'rejected' && (
                <p className="text-xs text-red-400 mt-1">This request was rejected by an admin.</p>
            )}
        </li>
    );
};

const TransactionItem: React.FC<{ tx: Transaction, currentUserId: string }> = ({ tx, currentUserId }) => {
    const isSent = tx.type === 'debit' || tx.type === 'p2p_sent';
    const amountColor = isSent ? 'text-red-400' : 'text-green-400';
    const icon = isSent ? <ArrowUpRightIcon className="h-5 w-5" /> : <ArrowDownLeftIcon className="h-5 w-5" />;

    return (
        <li className="flex items-center justify-between p-3">
            <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${isSent ? 'bg-red-900/50' : 'bg-green-900/50'}`}>
                    <div className={amountColor}>{icon}</div>
                </div>
                <div>
                    <p className="font-semibold text-white">{tx.reason}</p>
                    <p className="text-xs text-gray-400">{formatTimeAgo(tx.timestamp.toDate().toISOString())}</p>
                </div>
            </div>
            <div className={`font-semibold text-lg font-mono ${amountColor}`}>
                {isSent ? '-' : '+'} {tx.amount.toFixed(2)}
            </div>
        </li>
    );
};

export const WalletPage: React.FC<WalletPageProps> = ({ user }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [redemptionTimeLeft, setRedemptionTimeLeft] = useState('');
    
    const ubtBalance = user.ubtBalance || 0;
    const usdValue = ubtBalance * (economy?.ubt_to_usd_rate || 0);
    const isRedemptionOpen = economy?.ubtRedemptionWindowOpen === true;

    useEffect(() => {
        let isMounted = true;
        const unsubscribers: (() => void)[] = [];

        const loadData = () => {
            setIsLoading(true);
            
            const unsubTx = api.listenForUserTransactions(user.id, (txs) => {
                if(isMounted) setTransactions(txs);
            }, (err) => {
                if(isMounted) { console.error("Error fetching transactions:", err); addToast("Could not load transaction history.", 'error'); }
            });
            unsubscribers.push(unsubTx);
            
            const unsubPayouts = api.listenForUserPayouts(user.id, (payouts) => {
                if(isMounted) setPayouts(payouts);
            }, (err) => {
                 if(isMounted) { console.error("Error fetching payout requests:", err); addToast("Could not load payout requests.", 'error'); }
            });
            unsubscribers.push(unsubPayouts);

            const unsubEconomy = api.listenForGlobalEconomy((econ) => {
                if(isMounted) setEconomy(econ);
            }, (err) => {
                if(isMounted) { console.error("Error fetching economy data:", err); addToast("Could not load UBT price.", 'error'); }
            });
            unsubscribers.push(unsubEconomy);
            
            if(isMounted) setIsLoading(false);
        };

        loadData();

        return () => {
            isMounted = false;
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user.id, addToast]);

     useEffect(() => {
        let timer: number | undefined;
        const calculateTime = () => {
            if (economy?.ubtRedemptionWindowOpen && economy?.ubtRedemptionWindowClosesAt) {
                const timeLeftMs = economy.ubtRedemptionWindowClosesAt.toDate().getTime() - new Date().getTime();
                if (timeLeftMs <= 0) {
                    setRedemptionTimeLeft('Window Closed');
                    clearInterval(timer);
                } else {
                    const days = Math.floor(timeLeftMs / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((timeLeftMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    setRedemptionTimeLeft(`${days}d ${hours}h left`);
                }
            } else if (economy?.ubtRedemptionWindowStartedAt) {
                const nextWindowDate = new Date(economy.ubtRedemptionWindowStartedAt.toDate());
                nextWindowDate.setDate(nextWindowDate.getDate() + 60);
                const timeLeftMs = nextWindowDate.getTime() - new Date().getTime();
                if (timeLeftMs > 0) {
                    const days = Math.floor(timeLeftMs / (1000 * 60 * 60 * 24));
                    setRedemptionTimeLeft(`Opens in ~${days} day(s)`);
                } else {
                    setRedemptionTimeLeft('Next window soon');
                }
            } else {
                setRedemptionTimeLeft('Window Closed');
            }
        };

        calculateTime(); // Initial call
        if(economy?.ubtRedemptionWindowOpen) {
            timer = setInterval(calculateTime, 1000 * 60); // Update every minute
        }

        return () => clearInterval(timer);
    }, [economy]);

    return (
        <>
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                <div className="bg-slate-800 p-6 rounded-lg shadow-lg text-center">
                    <WalletIcon className="h-10 w-10 mx-auto text-green-400 mb-2"/>
                    <p className="text-sm font-medium text-gray-400">Your $UBT Balance</p>
                    <p className="text-5xl font-bold text-white my-1">{ubtBalance.toFixed(2)}</p>
                    <p className="font-semibold text-gray-300">≈ ${usdValue.toFixed(2)} USD</p>
                    <div className="mt-6 flex justify-center gap-2 sm:gap-4">
                        <button 
                            onClick={() => setIsRedeemModalOpen(true)} 
                            disabled={!isRedemptionOpen || user.status !== 'active'} 
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center px-6 py-3 bg-slate-700 text-white rounded-md hover:bg-slate-600 font-semibold disabled:bg-slate-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                            title={user.status !== 'active' ? 'Your account must be verified to redeem.' : !isRedemptionOpen ? "Redemption is only open for 5 days every 2 months." : "Redeem your earned UBT value"}
                        >
                            Redeem
                        </button>
                        <button 
                            onClick={() => setIsWithdrawModalOpen(true)} 
                            disabled={ubtBalance <= 0 || user.status !== 'active'}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center px-6 py-3 bg-slate-700 text-white rounded-md hover:bg-slate-600 font-semibold disabled:bg-slate-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                            title={user.status !== 'active' ? 'Your account must be verified to withdraw.' : "Withdraw your UBT to a personal Solana wallet"}
                        >
                            Withdraw
                        </button>
                    </div>
                     <div className="mt-4 text-center space-y-1">
                        <p className={`text-sm font-semibold flex items-center justify-center gap-2 ${isRedemptionOpen ? 'text-green-400' : 'text-yellow-400'}`}>
                            <ClockIcon className="h-4 w-4" />
                            Ecocash Redemption Window: {isRedemptionOpen ? `OPEN (${redemptionTimeLeft})` : `CLOSED (${redemptionTimeLeft})`}
                        </p>
                        <p className="text-xs text-gray-400">On-chain withdrawals to a Solana wallet are always available.</p>
                    </div>
                </div>

                <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-white flex items-center mb-3">
                        <InfoIcon className="h-5 w-5 mr-3 text-blue-400" />
                        How Your Wallet Works
                    </h3>
                    <ul className="space-y-3 text-sm text-gray-300 list-disc list-inside">
                         <li>
                            <strong>Initial Stake:</strong> Your initial stake is required for certain commons features like Ecocash redemption. This portion of your balance cannot be redeemed for cash via Ecocash.
                        </li>
                        <li>
                            <strong>Redeem for Cash:</strong> You can redeem any value above your initial stake to Ecocash. This is only available during the bi-monthly redemption window.
                        </li>
                        <li>
                            <strong>Withdraw On-chain:</strong> You can withdraw your entire $UBT balance, including your initial stake, to a personal Solana wallet at any time for full self-custody of your assets.
                        </li>
                    </ul>
                </div>

                <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-white px-3 mb-2">Redemption & Withdrawal Requests</h3>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-10"><LoaderIcon className="h-8 w-8 animate-spin text-green-500" /></div>
                    ) : payouts.length > 0 ? (
                        <ul className="divide-y divide-slate-700">
                            {payouts.map(payout => <PayoutRequestItem key={payout.id} payout={payout} />)}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 py-10">No requests found.</p>
                    )}
                </div>

                <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-white px-3 mb-2">Transaction History</h3>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-10"><LoaderIcon className="h-8 w-8 animate-spin text-green-500" /></div>
                    ) : transactions.length > 0 ? (
                        <ul className="divide-y divide-slate-700">
                            {transactions.map(tx => <TransactionItem key={tx.id} tx={tx} currentUserId={user.id} />)}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 py-10">No transactions yet.</p>
                    )}
                </div>
            </div>

            <RedeemUbtModal isOpen={isRedeemModalOpen} onClose={() => setIsRedeemModalOpen(false)} currentUser={user} economy={economy} onTransactionComplete={() => {}} />

            <WithdrawOnchainModal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} currentUser={user} onTransactionComplete={() => {}} />
        </>
    );
};
