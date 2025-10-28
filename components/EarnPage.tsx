import React, { useState, useEffect } from 'react';
import { MemberUser, User, PayoutRequest, RedemptionCycle } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { SparkleIcon } from './icons/SparkleIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { Timestamp } from 'firebase/firestore';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { formatTimeAgo } from '../utils';
import { ClockIcon } from './icons/ClockIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';

interface EarnPageProps {
  user: MemberUser;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  onNavigateToRedemption: () => void;
  onNavigateToInvestments: () => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; description: string }> = ({ title, value, icon, description }) => (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
        <div className="flex items-center">
            <div className="p-3 bg-slate-700 rounded-full">{icon}</div>
            <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">{title}</p>
                <p className="text-3xl font-bold text-white">{value}</p>
            </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">{description}</p>
    </div>
);

const PayoutStatusBadge: React.FC<{ status: PayoutRequest['status'] }> = ({ status }) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize';
    switch (status) {
        case 'pending': return <span className={`${baseClasses} bg-yellow-800 text-yellow-300`}>Pending</span>;
        case 'completed': return <span className={`${baseClasses} bg-green-800 text-green-300`}>Completed</span>;
        case 'rejected': return <span className={`${baseClasses} bg-red-800 text-red-300`}>Rejected</span>;
        default: return null;
    }
};


const COMMODITIES = ["Bread (Loaf)", "Milk (1L)", "Cooking Oil (2L)", "Maize Meal (10kg)", "Sugar (2kg)", "Eggs (Dozen)", "Other"];

const RedemptionStatus: React.FC<{ cycle: RedemptionCycle | null, onNavigate: () => void }> = ({ cycle, onNavigate }) => {
    if (!cycle) {
        return (
            <div className="bg-slate-900/50 p-6 rounded-lg border-2 border-slate-700">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white">Redemption Hub</h2>
                    <p className="text-gray-400 mt-2">The Redemption Hub is currently closed.</p>
                    <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                        This is a bi-monthly event where you can convert the Civic Capital (CCAP) you've earned into real-world value. The Hub typically opens at the beginning of the cycle. Check back soon!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 p-6 rounded-lg border-2 border-green-500/50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold text-white">Redemption Hub</h2>
                    <p className="text-gray-300">Convert your Civic Capital (CCAP) into real value.</p>
                     <div className="mt-2 text-lg font-mono text-green-300">
                        1 CCAP ≈ ${cycle.ccap_usd_value.toFixed(4)} USDT
                    </div>
                </div>
                <div className="text-center">
                    {cycle.status === 'window_open' ? (
                        <>
                            <p className="font-semibold text-yellow-300 flex items-center justify-center"><ClockIcon className="h-4 w-4 mr-1"/> Redemption Window is OPEN</p>
                            <p className="text-xs text-gray-400">Closes {formatTimeAgo(cycle.windowEndDate.toDate().toISOString())}</p>
                        </>
                    ) : (
                         <>
                            <p className="font-semibold text-gray-300 flex items-center justify-center"><ClockIcon className="h-4 w-4 mr-1"/> Redemption Window is Closed</p>
                            <p className="text-xs text-gray-400">Opens on the 1st of next month</p>
                        </>
                    )}
                     <button onClick={onNavigate} className="mt-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">
                        Enter Hub
                    </button>
                </div>
            </div>
        </div>
    );
};


export const EarnPage: React.FC<EarnPageProps> = ({ user, onUpdateUser, onNavigateToRedemption, onNavigateToInvestments }) => {
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
    const [priceData, setPriceData] = useState({ commodity: COMMODITIES[0], price: '', shop: '' });
    const [otherCommodity, setOtherCommodity] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    
    // Payout state
    const [payoutData, setPayoutData] = useState({ ecocashName: '', ecocashNumber: '' });
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [referredUsers, setReferredUsers] = useState<User[]>([]);
    const [cycle, setCycle] = useState<RedemptionCycle | null>(null);

    const [timeLeft, setTimeLeft] = useState('');
    const canCheckIn = !user.lastDailyCheckin || (new Date().getTime() - user.lastDailyCheckin.toDate().getTime()) > 24 * 60 * 60 * 1000;

    const referralLink = `${window.location.origin}?ref=${user.referralCode}`;
    const referralEarnings = user.referralEarnings ?? 0;

    useEffect(() => {
        api.getCurrentRedemptionCycle().then(setCycle);
        const unsubPayouts = api.listenForUserPayouts(user.id, setPayouts, console.error);
        const unsubReferrals = api.listenForReferredUsers(user.id, setReferredUsers, console.error);
        return () => {
            unsubPayouts();
            unsubReferrals();
        };
    }, [user.id]);


    useEffect(() => {
        if (!canCheckIn && user.lastDailyCheckin) {
            const calculateTimeLeft = () => {
                const now = new Date().getTime();
                const lastCheckinTime = user.lastDailyCheckin!.toDate().getTime();
                const nextAvailableTime = lastCheckinTime + 24 * 60 * 60 * 1000;
                const diff = nextAvailableTime - now;

                if (diff <= 0) {
                    setTimeLeft('');
                    return true;
                } else {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff / 1000 / 60) % 60);
                    setTimeLeft(`${hours}h ${minutes}m`);
                    return false;
                }
            };
            
            if (!calculateTimeLeft()) {
                const interval = setInterval(calculateTimeLeft, 60000);
                return () => clearInterval(interval);
            }
        }
    }, [canCheckIn, user.lastDailyCheckin]);

    const handleCheckIn = async () => {
        setIsLoading(prev => ({ ...prev, checkin: true }));
        try {
            const updatedFields = await api.performDailyCheckin(user.id);
            await onUpdateUser(updatedFields);
            addToast('Checked in! +10 SCAP awarded.', 'success');
        } catch (error) {
            addToast(error instanceof Error ? error.message : "Check-in failed.", "error");
        } finally {
            setIsLoading(prev => ({ ...prev, checkin: false }));
        }
    };
    
    const handlePriceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const commodityToSubmit = priceData.commodity === 'Other' ? otherCommodity : priceData.commodity;

        if (!priceData.price || !priceData.shop || !commodityToSubmit.trim()) {
            addToast("Please fill in commodity, price, and shop name.", "error");
            return;
        }
        setIsLoading(prev => ({ ...prev, price: true }));
        try {
            await api.submitPriceVerification(user.id, commodityToSubmit, parseFloat(priceData.price), priceData.shop);
            await onUpdateUser({}); // Just to trigger a user data refresh
            addToast('Price submitted! +15 CCAP awarded.', 'success');
            setPriceData({ commodity: COMMODITIES[0], price: '', shop: '' });
            setOtherCommodity('');
        } catch (error) {
            addToast("Failed to submit price.", "error");
        } finally {
            setIsLoading(prev => ({ ...prev, price: false }));
        }
    };

    const handlePayoutRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payoutData.ecocashName || !payoutData.ecocashNumber) {
            addToast('Please provide your Ecocash details.', 'error');
            return;
        }
        setIsLoading(prev => ({ ...prev, payout: true }));
        try {
            await api.requestPayout(user, payoutData.ecocashName, payoutData.ecocashNumber, referralEarnings ?? 0);
            await onUpdateUser({ referralEarnings: 0 });
            addToast('Payout request submitted successfully!', 'success');
            setPayoutData({ ecocashName: '', ecocashNumber: '' });
        } catch (error) {
            addToast(error instanceof Error ? error.message : "Failed to request payout.", "error");
        } finally {
            setIsLoading(prev => ({ ...prev, payout: false }));
        }
    };
    
    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };
    
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Social Capital (SCAP)" value={(user.scap ?? 0).toLocaleString()} icon={<SparkleIcon className="h-6 w-6 text-yellow-400"/>} description="Earned from daily activity. Your SCAP increases your chances in the bi-monthly Sustenance Dividend lottery."/>
                <StatCard title="Civic Capital (CCAP)" value={(user.ccap ?? 0).toLocaleString()} icon={<DatabaseIcon className="h-6 w-6 text-blue-400"/>} description="Earned by making valuable contributions. During the bi-monthly Redemption Cycle, you can convert your CCAP to cash, stake it for a 10% bonus, or invest it in community ventures to earn Venture Equity (VEQ)."/>
            </div>
            
            <RedemptionStatus cycle={cycle} onNavigate={onNavigateToRedemption} />

            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-white flex items-center mb-2">
                    <BriefcaseIcon className="h-6 w-6 mr-3 text-yellow-400" />
                    Venture Equity (VEQ)
                </h2>
                <p className="text-gray-400 mb-4">Your ownership in community ventures. Redeem your shares or watch your investments grow.</p>
                <div className="bg-slate-900/50 p-4 rounded-lg flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-400">Your Holdings</p>
                        <p className="text-lg font-semibold text-white">
                            {user.ventureEquity?.length > 0 
                                ? `Invested in ${user.ventureEquity.length} venture(s)` 
                                : 'No investments yet'}
                        </p>
                    </div>
                    <button onClick={onNavigateToInvestments} className="px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 font-semibold text-sm">
                        Manage Investments
                    </button>
                </div>
            </div>

            {/* Daily Check-in */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-2">Daily Check-in</h2>
                <p className="text-gray-400 mb-4">Earn 10 SCAP every 24 hours just for being an active member of the commons.</p>
                <button onClick={handleCheckIn} disabled={!canCheckIn || isLoading.checkin} className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed">
                    {isLoading.checkin ? <LoaderIcon className="h-5 w-5 animate-spin"/> : canCheckIn ? 'Check-in Now (+10 SCAP)' : `Next check-in in ${timeLeft}`}
                </button>
            </div>
            
            {/* Ways to Earn CCAP */}
            <div className="space-y-6">
                 <h2 className="text-2xl font-bold text-white">Earn More Civic Capital (CCAP)</h2>
                 
                 {/* Price Verification */}
                 <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold text-white">Price Verification (+15 CCAP)</h3>
                    <p className="text-gray-400 mt-1 mb-4">Help the commons track fair market prices. Submit the current price of a commodity in your area.</p>
                    <form onSubmit={handlePriceSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="commodity" className="block text-sm font-medium text-gray-300">Commodity</label>
                                <select id="commodity" value={priceData.commodity} onChange={e => setPriceData(p => ({...p, commodity: e.target.value}))} className="mt-1 block w-full pl-3 pr-10 py-2 bg-slate-700 border-slate-600 rounded-md text-white">
                                    {COMMODITIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="price" className="block text-sm font-medium text-gray-300">Price (USD)</label>
                                <input type="number" step="0.01" id="price" value={priceData.price} onChange={e => setPriceData(p => ({...p, price: e.target.value}))} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                            </div>
                        </div>
                        {priceData.commodity === 'Other' && (
                             <div className="animate-fade-in">
                                <label htmlFor="otherCommodity" className="block text-sm font-medium text-gray-300">Specify Commodity Name <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    id="otherCommodity"
                                    value={otherCommodity}
                                    onChange={e => setOtherCommodity(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                                    required
                                />
                            </div>
                        )}
                        <div>
                            <label htmlFor="shop" className="block text-sm font-medium text-gray-300">Shop Name & Location</label>
                            <input type="text" id="shop" value={priceData.shop} onChange={e => setPriceData(p => ({...p, shop: e.target.value}))} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                        </div>
                        <div className="text-right">
                             <button type="submit" disabled={isLoading.price} className="px-6 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 font-semibold disabled:bg-slate-600">
                                {isLoading.price ? <LoaderIcon className="h-5 w-5 animate-spin"/> : 'Submit Price'}
                            </button>
                        </div>
                    </form>
                 </div>
            </div>
            
            {/* Referral System */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-white mb-2">Referral Program</h2>
                <p className="text-gray-400 mb-4">Earn <strong className="text-white">$1.00 USDT</strong> for every new member who joins using your referral code.</p>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-900/50 rounded-lg">
                    <p className="font-mono text-lg text-green-300 tracking-widest bg-slate-700 p-2 rounded-md">{user.referralCode}</p>
                    <div className="flex-1 text-sm text-gray-300 break-all">{referralLink}</div>
                    <button onClick={handleCopy} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md">
                        {isCopied ? <ClipboardCheckIcon className="h-5 w-5 text-green-400"/> : <ClipboardIcon className="h-5 w-5"/>}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Your Referrals ({referredUsers.length})</h3>
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                            {referredUsers.length > 0 ? referredUsers.map(ref => (
                                <div key={ref.id} className="text-sm text-gray-300 p-2 bg-slate-700/50 rounded-md">{ref.name}</div>
                            )) : <p className="text-sm text-gray-500">No referrals yet.</p>}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Available Earnings</h3>
                        <p className="text-3xl font-bold text-green-400">${referralEarnings.toFixed(2)}</p>
                         {referralEarnings > 0 && (
                            <form onSubmit={handlePayoutRequest} className="mt-4 space-y-3">
                                <input type="text" value={payoutData.ecocashName} onChange={e => setPayoutData(p => ({...p, ecocashName: e.target.value}))} placeholder="Ecocash Full Name" required className="block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                                <input type="tel" value={payoutData.ecocashNumber} onChange={e => setPayoutData(p => ({...p, ecocashNumber: e.target.value}))} placeholder="Ecocash Phone Number" required className="block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                                <button type="submit" disabled={isLoading.payout} className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-slate-600">
                                    {isLoading.payout ? 'Processing...' : `Request Payout ($${referralEarnings.toFixed(2)})`}
                                </button>
                            </form>
                         )}
                    </div>
                </div>
            </div>

            {/* Payout Requests */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Payout History</h3>
                {payouts.length > 0 ? (
                    <div className="space-y-2">
                        {payouts.map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-slate-700/50 p-3 rounded-md">
                                <div>
                                    <p className="font-semibold text-gray-200">
                                        {p.type === 'ccap_redemption' ? `CCAP Redemption: $${p.amount.toFixed(2)}` : `Referral Payout: $${p.amount.toFixed(2)}`}
                                    </p>
                                    <p className="text-xs text-gray-400">{formatTimeAgo(p.requestedAt.toDate().toISOString())}</p>
                                </div>
                                <PayoutStatusBadge status={p.status} />
                            </div>
                        ))}
                    </div>
                ) : <p className="text-sm text-gray-500">You haven't requested any payouts yet.</p>}
            </div>
        </div>
    );
};