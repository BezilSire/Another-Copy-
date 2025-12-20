
import React, { useState, useEffect, useMemo } from 'react';
import { User, P2POffer, GlobalEconomy, CommunityValuePool, SellRequest } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { PlusIcon } from './icons/PlusIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { ArrowUpRightIcon } from './icons/ArrowUpRightIcon';
import { formatTimeAgo } from '../utils';
// FIX: Added missing Firebase and local service imports
import { onSnapshot, query, collection, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

interface PulseHubProps {
    user: User;
}

const PulseChart: React.FC = () => (
    <div className="w-full h-32 relative overflow-hidden mt-4">
        <svg viewBox="0 0 400 100" className="w-full h-full">
            <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path 
                d="M0,80 Q50,70 100,85 T200,60 T300,40 T400,20 L400,100 L0,100 Z" 
                fill="url(#lineGradient)" 
            />
            <path 
                d="M0,80 Q50,70 100,85 T200,60 T300,40 T400,20" 
                fill="none" 
                stroke="#FFD76A" 
                strokeWidth="3" 
                className="animate-draw"
            />
        </svg>
    </div>
);

export const PulseHub: React.FC<PulseHubProps> = ({ user }) => {
    const [view, setView] = useState<'swap' | 'p2p'>('swap');
    const [offers, setOffers] = useState<P2POffer[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [cvp, setCvp] = useState<CommunityValuePool | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();

    // AMM / Swap State
    const [swapType, setSwapType] = useState<'BUY' | 'SELL'>('BUY');
    const [swapAmount, setSwapAmount] = useState('');
    const [isSwapping, setIsSwapping] = useState(false);
    
    // Ecocash Acquisition State
    const [showEcocashBridge, setShowEcocashBridge] = useState(false);
    const [ecocashRef, setEcocashRef] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    // Liquidation / Sell State
    const [showSellConfirmation, setShowSellConfirmation] = useState(false);
    const [mySellRequests, setMySellRequests] = useState<SellRequest[]>([]);

    // P2P State
    const [isListingOffer, setIsListingOffer] = useState(false);
    const [newOffer, setNewOffer] = useState({ type: 'SELL' as const, amount: '', price: '', method: 'Ecocash' });

    useEffect(() => {
        const unsubOffers = api.listenToP2POffers(setOffers, console.error);
        const unsubEcon = api.listenForGlobalEconomy(setEconomy, console.error);
        const unsubCvp = api.listenForCVP(user, setCvp, console.error);
        
        // Listen to own sell requests
        const unsubSell = onSnapshot(query(collection(db, 'sell_requests'), where('userId', '==', user.id), orderBy('createdAt', 'desc')), s => {
            setMySellRequests(s.docs.map(d => ({ id: d.id, ...d.data() } as SellRequest)));
        });

        setIsLoading(false);
        return () => { unsubOffers(); unsubEcon(); unsubCvp(); unsubSell(); };
    }, [user.id]);

    const ubtPrice = economy?.ubt_to_usd_rate || 1.0;
    const estTotal = parseFloat(swapAmount) * ubtPrice;

    // USSD Constructor: *151*2*2*031068*AMOUNT#
    const ussdCommand = `*151*2*2*031068*${Math.round(estTotal)}#`;

    const handleSwapInitiate = async () => {
        const amt = parseFloat(swapAmount);
        if (isNaN(amt) || amt <= 0) {
            addToast("Enter a valid quantum amount.", "error");
            return;
        }

        if (swapType === 'BUY') {
            setShowEcocashBridge(true);
        } else {
            setShowSellConfirmation(true);
        }
    };

    const handleFinalSell = async () => {
        setIsSwapping(true);
        try {
            await api.createSellRequest(user, parseFloat(swapAmount), estTotal);
            addToast("Liquidation protocol initiated. Assets locked in Vault.", "success");
            setShowSellConfirmation(false);
            setSwapAmount('');
        } catch (e) {
            addToast(e instanceof Error ? e.message : 'Liquidation rejected.', 'error');
        } finally {
            setIsSwapping(false);
        }
    };

    const handleEcocashSubmit = async () => {
        if (!ecocashRef.trim()) {
            addToast("Reference code required for node verification.", "error");
            return;
        }
        setIsSwapping(true);
        try {
            await api.createPendingUbtPurchase(user, estTotal, parseFloat(swapAmount), ecocashRef);
            addToast("Handshake initiated. Authority nodes verifying...", "success");
            setShowEcocashBridge(false);
            setSwapAmount('');
            setEcocashRef('');
        } catch (e) {
            addToast("Index failure.", "error");
        } finally {
            setIsSwapping(false);
        }
    };

    const handleConfirmPayoutReceipt = async (req: SellRequest) => {
        if (!window.confirm("Verify that you have received the exact USD amount in your Ecocash. This action is final.")) return;
        setIsSwapping(true);
        try {
            await api.completeSellRequest(user, req);
            addToast("Protocol completed. UBT released from Escrow.", "success");
        } catch (e) {
            addToast("Action failed.", "error");
        } finally {
            setIsSwapping(false);
        }
    }

    const handleCopyUssd = () => {
        navigator.clipboard.writeText(ussdCommand).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const handleDial = () => {
        window.location.href = `tel:${encodeURIComponent(ussdCommand)}`;
    };

    const handleCreateOffer = async () => {
        const amt = parseFloat(newOffer.amount);
        const prc = parseFloat(newOffer.price);
        if (isNaN(amt) || amt <= 0 || isNaN(prc) || prc <= 0) return;
        try {
            await api.createP2POffer(user, {
                type: newOffer.type,
                amount: amt,
                pricePerUnit: prc,
                totalPrice: amt * prc,
                paymentMethod: newOffer.method
            });
            addToast("Bazaar listing indexed.", "success");
            setIsListingOffer(false);
        } catch (e) {
            addToast(e instanceof Error ? e.message : "Index failure.", "error");
        }
    };

    const handleTakeOffer = async (offer: P2POffer) => {
        if (!window.confirm(`Initiate protocol for ${offer.totalPrice.toFixed(2)} USD? UBT will be held in Escrow.`)) return;
        try {
            await api.takeP2POffer(user, offer.id);
            addToast("Liquidity locked in Escrow. Complete payment to proceed.", "success");
        } catch (e) {
            addToast("Protocol error.", "error");
        }
    };

    const handleConfirmReceipt = async (offer: P2POffer) => {
        if (!window.confirm(`Confirm receipt of funds? This will release ${offer.amount} UBT from Escrow to the buyer.`)) return;
        try {
            await api.completeP2PTrade(user, offer.id);
            addToast("Trade completed successfully. Assets released.", "success");
        } catch (e) {
            addToast("Action failed. Check node connection.", "error");
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20 px-4">
            {/* Market Intelligence Dashboard */}
            <div className="glass-card p-8 rounded-[3rem] border-white/5 relative overflow-hidden flex flex-col lg:flex-row justify-between items-center gap-12 group">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-gold/5 via-transparent to-transparent pointer-events-none"></div>
                <div className="space-y-4 text-center lg:text-left z-10 w-full lg:w-1/2">
                    <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.5em] mb-2">Network Liquidity Index</p>
                    <div className="flex items-baseline justify-center lg:justify-start gap-4">
                        <h1 className="text-6xl font-black text-white tracking-tighter gold-text leading-none">${ubtPrice.toFixed(4)}</h1>
                        <span className="text-green-400 font-mono text-sm font-black">+2.4% Pulse</span>
                    </div>
                    <PulseChart />
                </div>
                
                <div className="grid grid-cols-2 gap-4 w-full lg:w-auto z-10">
                    <div className="bg-slate-950/60 p-6 rounded-[2rem] border border-white/10 text-center backdrop-blur-sm">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Value Pool</p>
                        <p className="text-xl font-mono font-black text-white">${cvp?.total_usd_value.toLocaleString() || '15,000'}</p>
                    </div>
                    <div className="bg-slate-950/60 p-6 rounded-[2rem] border border-white/10 text-center backdrop-blur-sm">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Market Depth</p>
                        <p className="text-xl font-mono font-black text-white">42.8k UBT</p>
                    </div>
                </div>
            </div>

            {/* Navigation Spectrum */}
            <div className="flex bg-slate-950/80 p-2 rounded-[2.5rem] gap-2 border border-white/5 shadow-2xl">
                <button 
                    onClick={() => setView('swap')} 
                    className={`flex-1 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 ${view === 'swap' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-600 hover:text-gray-300'}`}
                >
                    Instant Swap
                </button>
                <button 
                    onClick={() => setView('p2p')} 
                    className={`flex-1 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 ${view === 'p2p' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-600 hover:text-gray-300'}`}
                >
                    Social Bazaar
                </button>
            </div>

            {view === 'swap' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Swap Interface */}
                    <div className="lg:col-span-8 glass-card p-10 rounded-[3.5rem] border-white/5 space-y-10 shadow-premium relative">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Liquid Exchange</h2>
                            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                                <button onClick={() => setSwapType('BUY')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${swapType === 'BUY' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500'}`}>Buy</button>
                                <button onClick={() => setSwapType('SELL')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${swapType === 'SELL' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'}`}>Sell</button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-950/80 p-8 rounded-[2.5rem] border border-white/10 group focus-within:ring-2 focus-within:ring-brand-gold/30 transition-all">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Quantum Input</label>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">Balance: {(user.ubtBalance || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <input 
                                        type="number" 
                                        value={swapAmount}
                                        onChange={e => setSwapAmount(e.target.value)}
                                        className="bg-transparent border-none text-5xl font-black font-mono text-white focus:outline-none w-full placeholder-gray-900 tracking-tighter" 
                                        placeholder="0.00"
                                    />
                                    <span className="text-2xl font-black text-brand-gold font-mono tracking-tighter ml-4">UBT</span>
                                </div>
                            </div>
                            
                            <div className="flex justify-center -my-8 relative z-20">
                                <button 
                                    onClick={() => setSwapType(swapType === 'BUY' ? 'SELL' : 'BUY')}
                                    className="p-4 bg-brand-gold rounded-[1.5rem] border-4 border-slate-950 text-slate-950 shadow-glow-gold hover:scale-110 active:scale-95 transition-all"
                                >
                                    <ArrowLeftRightIcon className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="bg-slate-950/80 p-8 rounded-[2.5rem] border border-white/10">
                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-4 block">Estimated {swapType === 'BUY' ? 'Cost' : 'Return'}</label>
                                <div className="flex justify-between items-center">
                                    <p className="text-5xl font-black font-mono text-white tracking-tighter">${estTotal.toFixed(2)}</p>
                                    <span className="text-2xl font-black text-gray-600 font-mono tracking-tighter uppercase">USD</span>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleSwapInitiate}
                            disabled={isSwapping || !swapAmount}
                            className={`w-full py-7 font-black rounded-[2rem] transition-all active:scale-95 shadow-glow-gold disabled:opacity-50 uppercase tracking-[0.3em] text-sm flex justify-center items-center gap-3 ${swapType === 'SELL' ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-brand-gold text-slate-950 hover:bg-brand-gold-light'}`}
                        >
                            {isSwapping ? <LoaderIcon className="h-6 w-6 animate-spin" /> : <>Initiate {swapType} Protocol <ShieldCheckIcon className="h-5 w-5"/></>}
                        </button>
                    </div>

                    {/* Pending Liquidation Track */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="glass-card p-8 rounded-[3rem] border-white/5 bg-slate-900/40">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-8">Active Protocols</h3>
                            <div className="space-y-4">
                                {mySellRequests.map(req => (
                                    <div key={req.id} className="p-5 bg-slate-950/60 rounded-[1.5rem] border border-white/5 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-lg font-black font-mono text-white tracking-tighter">{req.amountUbt} UBT</p>
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Target: ${req.amountUsd.toFixed(2)}</p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${req.status === 'PENDING' ? 'bg-yellow-900/20 text-yellow-500 border border-yellow-800/30' : req.status === 'DISPATCHED' ? 'bg-green-900/20 text-green-400 border border-green-800/30' : 'bg-blue-900/20 text-blue-400 border border-blue-800/30'}`}>
                                                {req.status}
                                            </div>
                                        </div>
                                        {req.status === 'DISPATCHED' ? (
                                            <div className="pt-2 animate-fade-in">
                                                <p className="text-[9px] text-green-400 uppercase font-bold mb-2">Node Dispatch: Verify Reference</p>
                                                <p className="text-xs font-mono text-white mb-3 p-2 bg-black/40 rounded-lg">{req.ecocashRef}</p>
                                                <button onClick={() => handleConfirmPayoutReceipt(req)} className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Confirm Receipt</button>
                                            </div>
                                        ) : req.status === 'CLAIMED' ? (
                                            <p className="text-[9px] text-blue-400 uppercase font-bold italic animate-pulse">Node {req.claimerName} is processing...</p>
                                        ) : (
                                             <button onClick={() => api.cancelSellRequest(user, req.id)} className="w-full py-2 text-[9px] text-gray-600 hover:text-red-400 font-bold uppercase tracking-widest">Abort Protocol</button>
                                        )}
                                    </div>
                                ))}
                                {mySellRequests.length === 0 && (
                                    <div className="py-12 text-center">
                                        <LoaderIcon className="h-6 w-6 text-gray-800 mx-auto mb-4 opacity-20" />
                                        <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.4em]">No Active Liquidations</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-fade-in px-2">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div>
                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter gold-text">Social Bazaar</h2>
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mt-1">Peer-to-Peer Protocol</p>
                        </div>
                        <button 
                            onClick={() => setIsListingOffer(true)} 
                            className="w-full sm:w-auto px-10 py-4 bg-brand-gold text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] shadow-glow-gold active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <PlusIcon className="h-4 w-4" /> Index New Offer
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {offers.map(offer => {
                            const isOwnOffer = offer.sellerId === user.id;
                            const isLocked = offer.status === 'LOCKED';
                            
                            return (
                                <div key={offer.id} className={`glass-card p-10 rounded-[3rem] border-white/5 space-y-8 relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:ring-2 hover:ring-brand-gold/30 ${isLocked ? 'grayscale-50 opacity-70' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${offer.type === 'SELL' ? 'bg-red-950/20 text-red-400 border-red-900/30' : 'bg-green-950/20 text-green-400 border-green-900/30'}`}>
                                            {offer.type} QUANTUM
                                        </div>
                                        {isLocked && <div className="flex items-center gap-2 bg-yellow-400/10 text-yellow-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse border border-yellow-400/20">Active Escrow</div>}
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-5xl font-black text-white font-mono tracking-tighter">{offer.amount.toLocaleString()} <span className="text-lg text-gray-500 font-bold tracking-widest">UBT</span></p>
                                        <p className="text-xl font-black text-green-400 font-mono tracking-tighter">Total Price: ${offer.totalPrice.toFixed(2)}</p>
                                    </div>

                                    <div className="pt-6 border-t border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center shadow-inner">
                                                <UsersIcon className="h-6 w-6 text-gray-700" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Origin Node</p>
                                                <p className="text-sm font-black text-white truncate tracking-tight uppercase">{offer.sellerName}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {isOwnOffer ? (
                                        isLocked ? (
                                            <button onClick={() => handleConfirmReceipt(offer)} className="w-full py-5 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95">Confirm Receipt & Release</button>
                                        ) : (
                                            <button onClick={() => api.cancelP2POffer(user, offer.id)} className="w-full py-5 bg-white/5 hover:bg-red-600/20 text-gray-600 hover:text-red-400 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all">Revoke Listing</button>
                                        )
                                    ) : (
                                        <button 
                                            onClick={() => handleTakeOffer(offer)}
                                            disabled={isLocked}
                                            className="w-full py-5 bg-slate-900 border border-brand-gold/20 hover:border-brand-gold text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl disabled:opacity-30"
                                        >
                                            Lock Liquidity
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        {offers.length === 0 && (
                            <div className="col-span-full py-32 text-center glass-card rounded-[3.5rem] border-white/5 flex flex-col items-center justify-center gap-4">
                                <DatabaseIcon className="h-16 w-16 text-gray-800 opacity-20" />
                                <p className="text-[11px] font-black text-gray-700 uppercase tracking-[0.5em]">No Global Offers Indexed</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Ecocash Buy Bridge Modal */}
            {showEcocashBridge && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setShowEcocashBridge(false)}></div>
                    <div className="glass-card w-full max-w-lg p-10 rounded-[3.5rem] border-brand-gold/30 z-10 relative space-y-10 animate-fade-in shadow-glow-gold">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter gold-text leading-tight">Quantum Acquisition</h3>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Ecocash External Protocol</p>
                            </div>
                            <button onClick={() => setShowEcocashBridge(false)} className="p-3 bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><XCircleIcon className="h-8 w-8" /></button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-950/80 p-8 rounded-[2.5rem] border border-brand-gold/20 relative overflow-hidden">
                                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 blur-3xl rounded-full"></div>
                                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4">Payment Command</p>
                                 <p className="text-3xl font-black text-brand-gold font-mono tracking-tighter break-all">{ussdCommand}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={handleCopyUssd}
                                    className="py-4 bg-slate-900 border border-white/10 text-white rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
                                >
                                    {isCopied ? <ClipboardCheckIcon className="h-5 w-5 text-green-400" /> : <ClipboardIcon className="h-5 w-5 text-gray-400" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest">Copy Code</span>
                                </button>
                                <button 
                                    onClick={handleDial}
                                    className="py-4 bg-brand-gold text-slate-950 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-brand-gold-light transition-all active:scale-95"
                                >
                                    <PhoneIcon className="h-5 w-5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Dial Now</span>
                                </button>
                            </div>

                            <div className="pt-8 border-t border-white/5 space-y-4">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Ecocash Reference Code (SMS)</label>
                                    <input 
                                        type="text" 
                                        value={ecocashRef} 
                                        onChange={e => setEcocashRef(e.target.value.toUpperCase())}
                                        placeholder="e.g. PP230524.1234.H00123"
                                        className="w-full bg-slate-950 border border-white/10 p-5 rounded-2xl text-white font-mono text-xl focus:outline-none focus:ring-1 focus:ring-brand-gold/30 uppercase"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-600 leading-loose uppercase font-bold italic">
                                    Dial the protocol above. Once successful, paste the transaction reference from your Ecocash SMS to anchor your UBT in the ledger.
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={handleEcocashSubmit}
                            disabled={!ecocashRef.trim() || isSwapping}
                            className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-xs shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-2"
                        >
                            {isSwapping ? <LoaderIcon className="h-5 w-5 animate-spin" /> : "Authorize Settlement"}
                        </button>
                    </div>
                </div>
            )}

            {/* Sell Confirmation Modal */}
            {showSellConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setShowSellConfirmation(false)}></div>
                    <div className="glass-card w-full max-w-lg p-10 rounded-[3.5rem] border-red-500/30 z-10 relative space-y-10 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight text-red-500">Quantum Dissolution</h3>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">UBT Liquidation Protocol</p>
                            </div>
                            <button onClick={() => setShowSellConfirmation(false)} className="p-3 bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><XCircleIcon className="h-8 w-8" /></button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-950/80 p-8 rounded-[2.5rem] border border-red-500/20 text-center">
                                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4">Escrow Value</p>
                                 <p className="text-6xl font-black text-white font-mono tracking-tighter">${estTotal.toFixed(2)}</p>
                                 <p className="text-lg font-black text-gray-600 font-mono tracking-tighter uppercase mt-2">({swapAmount} UBT)</p>
                            </div>

                            <div className="p-5 bg-red-950/30 border border-red-900/50 rounded-3xl flex gap-4 items-start">
                                <AlertTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                                <div className="space-y-2">
                                    <p className="text-[11px] text-red-200 font-black uppercase tracking-tight">Escrow Agreement</p>
                                    <p className="text-[10px] text-red-400 leading-relaxed uppercase font-medium">
                                        Your {swapAmount} $UBT will be moved to a secure System Escrow. This request will be dispatched to verified agents or the central treasury for Ecocash payout. Do not confirm receipt until funds are in your account.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleFinalSell}
                            disabled={isSwapping}
                            className="w-full py-6 bg-red-600 hover:bg-red-500 text-white font-black rounded-3xl uppercase tracking-[0.4em] text-xs shadow-xl active:scale-95 transition-all flex justify-center items-center gap-2"
                        >
                            {isSwapping ? <LoaderIcon className="h-5 w-5 animate-spin" /> : "Initiate Dissolution"}
                        </button>
                    </div>
                </div>
            )}

            {/* List Offer Modal */}
            {isListingOffer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => setIsListingOffer(false)}></div>
                    <div className="glass-card w-full max-w-lg p-10 rounded-[3.5rem] border-brand-gold/30 z-10 relative space-y-10 animate-fade-in shadow-[0_0_100px_-20px_rgba(212,175,55,0.4)]">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter gold-text leading-tight">Index Bazaar Offer</h3>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Network Entry Registration</p>
                            </div>
                            <button onClick={() => setIsListingOffer(false)} className="p-3 bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><XCircleIcon className="h-8 w-8" /></button>
                        </div>

                        <div className="space-y-8">
                            <div className="flex bg-slate-950/80 p-2 rounded-3xl border border-white/10">
                                <button onClick={() => setNewOffer(o => ({...o, type: 'SELL'}))} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${newOffer.type === 'SELL' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-600'}`}>Sell UBT</button>
                                <button onClick={() => setNewOffer(o => ({...o, type: 'BUY'}))} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${newOffer.type === 'BUY' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-600'}`}>Buy UBT</button>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Quantum Amount</label>
                                    <input type="number" value={newOffer.amount} onChange={e => setNewOffer(o => ({...o, amount: e.target.value}))} className="w-full bg-slate-950 border border-white/10 p-5 rounded-2xl text-white font-mono text-xl focus:outline-none focus:ring-1 focus:ring-brand-gold/30" placeholder="0.00" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Price / Unit (USD)</label>
                                    <input type="number" value={newOffer.price} onChange={e => setNewOffer(o => ({...o, price: e.target.value}))} className="w-full bg-slate-950 border border-white/10 p-5 rounded-2xl text-white font-mono text-xl focus:outline-none focus:ring-1 focus:ring-brand-gold/30" placeholder="1.00" />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Payment Protocol</label>
                                <input type="text" value={newOffer.method} onChange={e => setNewOffer(o => ({...o, method: e.target.value}))} className="w-full bg-slate-950 border border-white/10 p-5 rounded-2xl text-white font-bold text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold/30 uppercase tracking-widest" placeholder="Ecocash / Cash / Transfer" />
                            </div>
                        </div>

                        <button onClick={handleCreateOffer} className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-xs shadow-glow-gold active:scale-95 transition-all">Submit Protocol Index</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ArrowLeftRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M7 10L3 14L7 18" />
    <path d="M3 14H21" />
    <path d="M17 14L21 10L17 6" />
  </svg>
);
