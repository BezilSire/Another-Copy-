
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
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
// Added missing import for TrendingUpIcon
import { TrendingUpIcon } from './icons/TrendingUpIcon';

interface EarnPageProps {
  user: MemberUser;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  onNavigateToRedemption: () => void;
  onNavigateToInvestments: () => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; description: string }> = ({ title, value, icon, description }) => (
    <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-white/5 group hover:border-brand-gold/20 transition-all">
        <div className="flex items-center">
            <div className="p-3 bg-slate-700/50 rounded-xl group-hover:bg-brand-gold/10 group-hover:text-brand-gold transition-colors">{icon}</div>
            <div className="ml-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{title}</p>
                <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
            </div>
        </div>
        <p className="text-xs text-slate-500 mt-4 leading-relaxed font-medium">{description}</p>
    </div>
);

const PayoutStatusBadge: React.FC<{ status: PayoutRequest['status'] }> = ({ status }) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize tracking-wide';
    switch (status) {
        case 'pending': return <span className={`${baseClasses} bg-yellow-900/30 text-yellow-500 border border-yellow-800`}>Pending</span>;
        case 'completed': return <span className={`${baseClasses} bg-green-900/30 text-green-500 border border-green-800`}>Completed</span>;
        case 'rejected': return <span className={`${baseClasses} bg-red-900/30 text-red-500 border border-red-800`}>Rejected</span>;
        default: return null;
    }
};

const COMMODITIES = ["Bread (Loaf)", "Milk (1L)", "Cooking Oil (2L)", "Maize Meal (10kg)", "Sugar (2kg)", "Eggs (Dozen)", "Other"];

const RedemptionStatus: React.FC<{ cycle: RedemptionCycle | null, onNavigate: () => void, user: MemberUser }> = ({ cycle, onNavigate, user }) => {
    if (user.status !== 'active') {
        return (
            <div className="bg-yellow-900/10 p-6 rounded-2xl border border-yellow-700/30">
                <div className="flex items-start space-x-4">
                    <div className="p-3 bg-yellow-900/20 rounded-xl text-yellow-500"><AlertTriangleIcon className="h-6 w-6" /></div>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-white">Verification Required</h2>
                        <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                            To redeem your Civic Capital (CCAP) for real-world value, your account must be verified by a community agent.
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    
    if (!cycle) {
        return (
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white">Redemption Window</h2>
                    <p className="text-sm text-slate-400 mt-2">The bi-monthly conversion window is currently closed.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 p-6 rounded-2xl border border-brand-gold/30 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUpIcon className="h-20 w-20 text-brand-gold" /></div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Redemption Hub</h2>
                    <p className="text-sm text-slate-300 mt-1">Convert your Civic Capital into cash or investments.</p>
                     <div className="mt-3 text-lg font-bold text-brand-gold">
                        Rate: 1 CCAP ≈ ${cycle.ccap_to_usd_rate.toFixed(4)} USDT
                    </div>
                </div>
                <div className="text-center md:text-right">
                    {cycle.status === 'window_open' ? (
                        <div className="mb-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-900/30 text-green-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-800"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Open</div>
                            <p className="text-xs text-slate-400 mt-2 font-medium">Closes {formatTimeAgo(cycle.windowEndDate.toDate().toISOString())}</p>
                        </div>
                    ) : (
                         <div className="mb-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-slate-700">Closed</div>
                            <p className="text-xs text-slate-400 mt-2 font-medium">Next opening: 1st of the month</p>
                        </div>
                    )}
                     <button onClick={onNavigate} className="w-full sm:w-auto px-8 py-3 bg-brand-gold text-slate-950 rounded-xl font-bold hover:bg-brand-goldlight transition-all shadow-lg text-sm">
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
        const unsubReferrals = api.listenForReferredUsers(user.id, (users) => {
            setReferredUsers(users as User[]);
        }, (error) => {
            console.error("Failed to load referred users:", error);
        });
        return () => {
            unsubPayouts();
            unsubReferrals();
        };
    }, [user.id, addToast]);


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
            await api.performDailyCheckin(user.id); 
            addToast('Checked in! Points awarded.', 'success');
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
            addToast('Contribution recorded! Points awarded.', 'success');
            setPriceData({ commodity: COMMODITIES[0], price: '', shop: '' });
            setOtherCommodity('');
        } catch (error) {
            addToast("Failed to submit data.", "error");
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
        <div className="space-y-8 animate-fade-in font-sans pb-24 px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Activity Points" value={(user.scap ?? 0).toLocaleString()} icon={<SparkleIcon className="h-6 w-6"/>} description="Earned from daily interactions. Higher points increase your chance of receiving community food hampers."/>
                <StatCard title="Civic Capital" value={(user.ccap ?? 0).toLocaleString()} icon={<DatabaseIcon className="h-6 w-6"/>} description="Earned from valuable contributions. These can be redeemed for cash or reinvested in community businesses."/>
            </div>
            
            <RedemptionStatus cycle={cycle} onNavigate={onNavigateToRedemption} user={user} />

            <div className="bg-slate-800 p-6 rounded-2xl border border-white/5 shadow-lg group hover:border-brand-gold/20 transition-all">
                <h2 className="text-xl font-bold text-white flex items-center mb-2">
                    <BriefcaseIcon className="h-6 w-6 mr-3 text-brand-gold" />
                    Venture Equity
                </h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">Your ownership shares in community-led businesses. Watch your investments grow as the ventures succeed.</p>
                <div className="bg-slate-950 p-5 rounded-xl flex items-center justify-between border border-white/5">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Portfolio</p>
                        <p className="text-lg font-bold text-white mt-1">
                            {user.ventureEquity?.length > 0 
                                ? `${user.ventureEquity.length} active investments` 
                                : 'No investments yet'}
                        </p>
                    </div>
                    <button onClick={onNavigateToInvestments} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-sm transition-colors border border-white/10">
                        View Details
                    </button>
                </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-2xl border border-white/5 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-2">Daily Check-in</h2>
                <p className="text-sm text-slate-400 mb-6">Earn points every 24 hours by confirming your community presence.</p>
                <button onClick={handleCheckIn} disabled={!canCheckIn || isLoading.checkin} className="w-full sm:w-auto px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all disabled:bg-slate-700 disabled:text-slate-500 shadow-lg text-sm">
                    {isLoading.checkin ? <LoaderIcon className="h-5 w-5 animate-spin mx-auto"/> : canCheckIn ? 'Check-in Now (+10)' : `Next check-in in ${timeLeft}`}
                </button>
            </div>
            
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">Contribute & Earn</h2>
                <div className="bg-slate-800 p-6 rounded-2xl border border-white/5 shadow-lg">
                    <h3 className="text-xl font-bold text-white">Price Check (+15 Points)</h3>
                    <p className="text-sm text-slate-400 mt-1 mb-6 leading-relaxed">Help the community track market fairness. Report a commodity price in your area.</p>
                    <form onSubmit={handlePriceSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="commodity" className="text-xs font-bold text-slate-400 ml-1">Commodity</label>
                                <select id="commodity" value={priceData.commodity} onChange={e => setPriceData(p => ({...p, commodity: e.target.value}))} className="w-full">
                                    {COMMODITIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="price" className="text-xs font-bold text-slate-400 ml-1">Price (USD)</label>
                                <div className="relative">
                                    <input type="number" step="0.01" id="price" value={priceData.price} onChange={e => setPriceData(p => ({...p, price: e.target.value}))} required placeholder="0.00" className="w-full pr-12" />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">USD</span>
                                </div>
                            </div>
                        </div>
                        {priceData.commodity === 'Other' && (
                            <div className="animate-fade-in space-y-1.5">
                                <label htmlFor="otherCommodity" className="text-xs font-bold text-slate-400 ml-1">Commodity Name</label>
                                <input type="text" id="otherCommodity" value={otherCommodity} onChange={e => setOtherCommodity(e.target.value)} required placeholder="E.G. Soap" className="w-full" />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label htmlFor="shop" className="text-xs font-bold text-slate-400 ml-1">Shop Name & Area</label>
                            <input type="text" id="shop" value={priceData.shop} onChange={e => setPriceData(p => ({...p, shop: e.target.value}))} required placeholder="E.G. OK Supermarket, Harare" className="w-full" />
                        </div>
                        <div className="pt-2 flex justify-end">
                            <button type="submit" disabled={isLoading.price} className="px-8 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-sm transition-colors border border-white/10">
                                {isLoading.price ? <LoaderIcon className="h-4 w-4 animate-spin"/> : 'Submit Report'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <div className="bg-slate-800 p-6 rounded-2xl border border-white/5 shadow-lg group hover:border-brand-gold/20 transition-all">
                <h2 className="text-xl font-bold text-white mb-2">Referral Program</h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">Earn <strong className="text-white">$1.00</strong> for every new verified member you bring into the commons.</p>
                <div className="bg-slate-950 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 border border-white/5">
                    <p className="font-bold text-brand-gold text-lg px-4 py-2 bg-brand-gold/5 rounded-lg border border-brand-gold/20">{user.referralCode}</p>
                    <div className="flex-1 text-xs text-slate-500 font-medium truncate">{referralLink}</div>
                    <button onClick={handleCopy} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-white/5">
                        {isCopied ? <ClipboardCheckIcon className="h-5 w-5 text-green-500"/> : <ClipboardIcon className="h-5 w-5 text-slate-400"/>}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 border-t border-white/5 pt-8">
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Network Growth</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 no-scrollbar">
                            {referredUsers.length > 0 ? referredUsers.map(ref => (
                                <div key={ref.id} className="text-sm font-bold text-white p-3 bg-white/5 rounded-xl border border-white/5">{ref.name}</div>
                            )) : <p className="text-sm text-slate-600 font-medium">No referrals yet.</p>}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Earnings Wallet</h3>
                        <p className="text-4xl font-bold text-green-500 tracking-tight">${referralEarnings.toFixed(2)}</p>
                        {referralEarnings > 0 && (
                            <form onSubmit={handlePayoutRequest} className="mt-6 space-y-4">
                                <input type="text" value={payoutData.ecocashName} onChange={e => setPayoutData(p => ({...p, ecocashName: e.target.value}))} placeholder="Ecocash Holder Name" required className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-white" />
                                <input type="tel" value={payoutData.ecocashNumber} onChange={e => setPayoutData(p => ({...p, ecocashNumber: e.target.value}))} placeholder="Ecocash Number" required className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-white" />
                                <button type="submit" disabled={isLoading.payout} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95">
                                    {isLoading.payout ? <LoaderIcon className="h-4 w-4 animate-spin mx-auto"/> : `Withdraw $${referralEarnings.toFixed(2)}`}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-2xl border border-white/5 shadow-lg">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Payment History</h3>
                {payouts.length > 0 ? (
                    <div className="space-y-3">
                        {payouts.map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-white/5">
                                <div>
                                    <p className="font-bold text-white text-sm">
                                        {p.type === 'ccap_redemption' ? 'CCAP Conversion' : 'Referral Bonus'}
                                    </p>
                                    <p className="text-xs font-bold text-slate-500 mt-1">${p.amount.toFixed(2)} &bull; {p.requestedAt ? formatTimeAgo(p.requestedAt.toDate().toISOString()) : 'Pending'}</p>
                                </div>
                                <PayoutStatusBadge status={p.status} />
                            </div>
                        ))}
                    </div>
                ) : <p className="text-sm text-slate-600 font-medium py-4 text-center">No transactions indexed.</p>}
            </div>
        </div>
    );
};
