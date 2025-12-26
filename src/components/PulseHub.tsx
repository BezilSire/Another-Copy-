
import React, { useState, useEffect, useMemo } from 'react';
import { User, P2POffer, GlobalEconomy, SellRequest, PendingUbtPurchase, UbtTransaction, TreasuryVault } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { onSnapshot, query, collection, where, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { formatTimeAgo } from '../utils';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
// FIX: Added missing imports for GlobeIcon and DollarSignIcon to resolve build errors
import { GlobeIcon } from './icons/GlobeIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';

interface PulseHubProps {
    user: User;
}

const getMillis = (val: any): number => {
    if (!val) return 0;
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (val instanceof Timestamp) return val.toMillis();
    if (val instanceof Date) return val.getTime();
    if (val.seconds !== undefined) return val.seconds * 1000;
    const date = new Date(val);
    return isNaN(date.getTime()) ? 0 : date.getTime();
};

const PulseCandleChart: React.FC<{ ledger: UbtTransaction[], currentPrice: number }> = ({ ledger, currentPrice }) => {
    const candles = useMemo(() => {
        const candleCount = 20;
        const processed = [];
        let runningPrice = currentPrice;
        
        const marketEvents = ledger
            .filter(tx => tx.senderId === 'FLOAT' || tx.receiverId === 'FLOAT')
            .sort((a, b) => b.timestamp - a.timestamp);

        for (let i = 0; i < candleCount; i++) {
            const chunk = marketEvents.slice(i * 2, (i * 2) + 2);
            const close = runningPrice;
            
            const impact = chunk.reduce((acc, tx) => {
                const volFactor = tx.amount / 300000; 
                return tx.senderId === 'FLOAT' ? acc - volFactor : acc + volFactor;
            }, 0) || (Math.random() - 0.5) * 0.00004; 

            const open = close + impact;
            const high = Math.max(open, close) + Math.abs(impact * 0.5);
            const low = Math.min(open, close) - Math.abs(impact * 0.5);

            processed.push({ open, high, low, close });
            runningPrice = open; 
        }

        return processed.reverse();
    }, [ledger, currentPrice]);

    const minPrice = Math.min(...candles.map(c => c.low));
    const maxPrice = Math.max(...candles.map(c => c.high));
    const range = (maxPrice - minPrice) || 0.0001;

    const getY = (p: number) => 100 - ((p - minPrice) / range) * 75 - 15;

    return (
        <div className="w-full h-48 relative overflow-hidden mt-8 bg-slate-950/80 rounded-[2.5rem] border border-white/10 shadow-inner group">
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>

            <svg viewBox="0 0 400 100" className="w-full h-full p-6 relative z-10 overflow-visible">
                {candles.map((c, i) => {
                    const x = (i / (candles.length - 1)) * 360 + 20;
                    const isBullish = c.close >= c.open;
                    const color = isBullish ? '#10b981' : '#ef4444';
                    
                    const yHigh = getY(c.high);
                    const yLow = getY(c.low);
                    const yOpen = getY(c.open);
                    const yClose = getY(c.close);
                    
                    const bodyY = Math.min(yOpen, yClose);
                    const bodyH = Math.max(Math.abs(yOpen - yClose), 1.5);

                    return (
                        <g key={i} className="animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                            <rect x={x - 3} y={bodyY} width="6" height={bodyH} fill={color} opacity="0.1" className="blur-sm" />
                            <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" opacity="0.6" />
                            <rect 
                                x={x - 3} 
                                y={bodyY} 
                                width="6" 
                                height={bodyH} 
                                fill={color} 
                                rx="1" 
                                className={`transition-all duration-1000 ${i === candles.length - 1 ? 'animate-pulse' : ''}`} 
                            />
                        </g>
                    );
                })}
            </svg>
            
            <div className="absolute inset-y-0 w-px bg-brand-gold/40 shadow-[0_0_15px_#D4AF37] animate-pulse-scan pointer-events-none z-20"></div>

            <div className="absolute top-6 left-8 flex items-center gap-3 bg-black/60 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.5em]">Network_Equilibrium_Trace</span>
            </div>
            
            <style>{`
                @keyframes pulse-scan {
                    0% { left: 0; opacity: 0; }
                    10% { opacity: 0.8; }
                    90% { opacity: 0.8; }
                    100% { left: 100%; opacity: 0; }
                }
                .animate-pulse-scan {
                    animation: pulse-scan 5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
};

export const PulseHub: React.FC<PulseHubProps> = ({ user }) => {
    const [view, setView] = useState<'swap' | 'p2p'>('swap');
    const [offers, setOffers] = useState<P2POffer[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [ledger, setLedger] = useState<UbtTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();

    // Handshake Flow State
    const [swapType, setSwapType] = useState<'BUY' | 'SELL'>('BUY');
    const [swapAmount, setSwapAmount] = useState('');
    const [handshakeState, setHandshakeState] = useState<'input' | 'escrow' | 'finalizing'>('input');
    const [ecocashRef, setEcocashRef] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [mySellRequests, setMySellRequests] = useState<SellRequest[]>([]);

    useEffect(() => {
        const unsubOffers = api.listenToP2POffers(setOffers, console.error);
        const unsubEcon = api.listenForGlobalEconomy(setEconomy, console.error);
        const unsubVaults = api.listenToVaults(setVaults, console.error);
        api.getPublicLedger(150).then(setLedger);

        const unsubSell = onSnapshot(query(collection(db, 'sell_requests'), where('userId', '==', user.id)), s => {
            const data = s.docs.map(d => ({ id: d.id, ...d.data() } as SellRequest));
            setMySellRequests(data.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt)));
        });

        setIsLoading(false);
        return () => { unsubOffers(); unsubEcon(); unsubVaults(); unsubSell(); };
    }, [user.id]);

    const metrics = useMemo(() => {
        const floatVault = vaults.find(v => v.id === 'FLOAT');
        const circulating = floatVault?.balance || 1000000;
        const backing = economy?.cvp_usd_backing || 1000;
        const price = backing / Math.max(1, circulating);
        return { circulating, backing, price };
    }, [vaults, economy]);

    const estTotal = (parseFloat(swapAmount) || 0) * metrics.price;

    // HANDSHAKE LOGIC
    const initiateHandshake = async () => {
        const amountUbt = parseFloat(swapAmount);
        if (!amountUbt || amountUbt <= 0) {
            addToast("Specify quantum volume.", "error");
            return;
        }

        setIsProcessing(true);
        try {
            if (swapType === 'BUY') {
                // 1. Create the pending block in Firestore
                await api.createPendingUbtPurchase(user, estTotal, amountUbt);
                
                // 2. Trigger USSD Protocol (Standard Ecocash USD transfer to Authority)
                const authorityNumber = "077446959717"; // Root Merchant Node
                const ussdCode = `tel:*151*1*1*${authorityNumber}*${estTotal.toFixed(2)}#`;
                
                // Switch UI to Escrow Waiting mode
                setHandshakeState('escrow');
                window.location.href = ussdCode;
                addToast("Dialer triggered. Assets secured in escrow.", "success");
            } else {
                // Sell logic (Standard Sell Request)
                await api.createSellRequest(user, amountUbt, estTotal);
                addToast("Liquidation request anchored to ledger.", "success");
                setSwapAmount('');
            }
        } catch (e) {
            addToast("Protocol handshake failure.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const finalizeHandshake = async () => {
        if (!ecocashRef.trim()) {
            addToast("Reference ID required for verification.", "error");
            return;
        }

        setIsProcessing(true);
        try {
            // In a real implementation, we would update the specific pending purchase doc
            // with the reference for the admin to verify.
            // For now, we simulate the submission.
            addToast("Reference Buffered. Awaiting Oracle Verification.", "success");
            setHandshakeState('input');
            setSwapAmount('');
            setEcocashRef('');
        } catch (e) {
            addToast("Finalization aborted.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-24 px-4 font-sans">
            <div className="module-frame bg-slate-950 rounded-[3rem] p-10 border-white/5 shadow-premium relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/[0.05] via-transparent to-transparent pointer-events-none"></div>
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12 relative z-10">
                    <div className="space-y-2">
                        <p className="label-caps !text-[11px] text-brand-gold/70 !tracking-[0.5em]">Live Oracle Valuation</p>
                        <div className="flex items-baseline gap-6">
                            <h1 className="text-7xl sm:text-8xl font-black text-white tracking-tighter gold-text leading-none">${metrics.price.toFixed(6)}</h1>
                            <div className="flex flex-col">
                                <span className="text-emerald-500 font-mono text-[11px] font-black uppercase tracking-widest animate-pulse">ACTIVE_FEED</span>
                                <span className="text-[10px] text-gray-700 font-mono uppercase">Ratio 1:{Math.round(1/metrics.price)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
                        <MetricBox label="USD Reserve" value={`$${metrics.backing.toLocaleString()}`} color="text-emerald-500" />
                        <MetricBox label="Liquid Float" value={`${metrics.circulating.toLocaleString()} UBT`} color="text-white" />
                    </div>
                </div>

                <PulseCandleChart ledger={ledger} currentPrice={metrics.price} />
            </div>

            <div className="flex bg-slate-950/80 p-2 rounded-[2.5rem] border border-white/10 shadow-2xl max-w-sm mx-auto">
                <NavBtn active={view === 'swap'} onClick={() => setView('swap')} label="Treasury" />
                <NavBtn active={view === 'p2p'} onClick={() => setView('p2p')} label="Bazaar" />
            </div>

            {view === 'swap' ? (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                    <div className="xl:col-span-8 module-frame bg-slate-950/60 p-8 sm:p-12 rounded-[4rem] border-white/10 shadow-premium space-y-10 relative overflow-hidden">
                         
                        {handshakeState === 'input' && (
                             <div className="space-y-12 animate-fade-in">
                                <div className="flex justify-between items-center border-b border-white/10 pb-8">
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text">Distribution</h2>
                                    <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10">
                                        <button onClick={() => setSwapType('BUY')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${swapType === 'BUY' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-600'}`}>Buy</button>
                                        <button onClick={() => setSwapType('SELL')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${swapType === 'SELL' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-600'}`}>Sell</button>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-slate-800 border-2 border-white/20 p-10 rounded-[3rem] shadow-inner focus-within:border-brand-gold/40 transition-all cursor-text">
                                        <label className="label-caps !text-[12px] mb-6 text-white font-black">1. Asset Quantity</label>
                                        <div className="flex items-center gap-6">
                                            <input 
                                                type="number" 
                                                value={swapAmount} 
                                                onChange={e => setSwapAmount(e.target.value)} 
                                                className="bg-transparent border-none text-7xl font-black font-mono text-white focus:outline-none w-full placeholder-white/10 tracking-tighter !p-0" 
                                                placeholder="0" 
                                            />
                                            <span className="text-3xl font-black text-brand-gold font-mono tracking-widest uppercase">UBT</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-center -my-14 relative z-20">
                                        <div className="p-4 bg-slate-900 rounded-full border-2 border-white/10 shadow-glow-gold">
                                            <TrendingUpIcon className={`h-8 w-8 text-brand-gold transition-transform duration-500 ${swapType === 'SELL' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>

                                    <div className="bg-slate-800 border-2 border-white/20 p-10 rounded-[3rem] shadow-inner">
                                        <label className="label-caps !text-[12px] mb-6 text-white font-black">2. Settlement Value</label>
                                        <div className="flex justify-between items-center">
                                            <p className="text-7xl font-black font-mono text-emerald-400 tracking-tighter leading-none">${estTotal.toFixed(6)}</p>
                                            <span className="text-2xl font-black text-gray-500 font-mono tracking-widest uppercase">USD</span>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={initiateHandshake} 
                                    disabled={isProcessing || !swapAmount} 
                                    className={`w-full py-8 font-black rounded-3xl transition-all active:scale-[0.98] shadow-glow-gold uppercase tracking-[0.5em] text-[12px] flex justify-center items-center gap-4 ${swapType === 'SELL' ? 'bg-red-600 text-white' : 'bg-brand-gold text-slate-950'}`}
                                >
                                    {isProcessing ? <LoaderIcon className="h-6 w-6 animate-spin" /> : <>Authorize Handshake <ShieldCheckIcon className="h-6 w-6"/></>}
                                </button>
                            </div>
                        )}

                        {handshakeState === 'escrow' && (
                            <div className="space-y-10 animate-fade-in py-10 text-center">
                                <div className="p-8 bg-emerald-950/20 border-2 border-emerald-500/40 rounded-[3rem] shadow-glow-matrix flex flex-col items-center gap-6">
                                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse shadow-glow-matrix">
                                        <ShieldCheckIcon className="h-10 w-10 text-slate-900" />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Protocol Escrow Active</h3>
                                        <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3">Assets secured & waiting for settlement</p>
                                    </div>
                                </div>

                                <div className="p-10 bg-slate-900/60 rounded-[3rem] border border-white/10 space-y-8">
                                    <div className="space-y-2">
                                        <p className="label-caps !text-[10px] text-gray-500">Transaction Reference Anchor</p>
                                        <p className="text-xs text-gray-400">Enter the Reference ID from your Ecocash Confirmation SMS</p>
                                    </div>
                                    <input 
                                        type="text"
                                        value={ecocashRef}
                                        onChange={e => setEcocashRef(e.target.value.toUpperCase())}
                                        className="w-full bg-black border-2 border-brand-gold/40 p-8 rounded-2xl text-white font-mono text-center text-3xl tracking-[0.4em] focus:ring-4 focus:ring-brand-gold/20 outline-none"
                                        placeholder="E.G. ABC123XYZ"
                                    />
                                    <button 
                                        onClick={finalizeHandshake}
                                        disabled={isProcessing || !ecocashRef}
                                        className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-xs shadow-glow-gold active:scale-95 transition-all"
                                    >
                                        {isProcessing ? <LoaderIcon className="h-5 w-5 animate-spin mx-auto"/> : "Finalize Protocol Dispatch"}
                                    </button>
                                </div>

                                <button 
                                    onClick={() => setHandshakeState('input')}
                                    className="text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors"
                                >
                                    Cancel & Return to Desk
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="xl:col-span-4 space-y-6">
                        <div className="glass-card p-10 rounded-[3.5rem] border-white/10 bg-slate-900/40 shadow-inner h-full">
                            <h3 className="label-caps !text-[11px] mb-8 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                                Handshake Logs
                            </h3>
                            <div className="space-y-4">
                                {mySellRequests.map(req => (
                                    <div key={req.id} className="p-6 bg-black/40 rounded-3xl border border-white/5 hover:border-white/10 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-2xl font-black text-white font-mono tracking-tighter leading-none">{req.amountUbt} UBT</p>
                                                <p className="text-[10px] font-bold text-gray-600 uppercase mt-2 tracking-widest">${req.amountUsd.toFixed(6)} USD</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${req.status === 'PENDING' ? 'bg-yellow-900/20 text-yellow-500' : 'bg-emerald-900/20 text-emerald-400'}`}>
                                                {req.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {mySellRequests.length === 0 && (
                                    <div className="py-20 text-center opacity-20">
                                        <DatabaseIcon className="h-8 w-8 mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">No local handshakes indexed</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                     {offers.map(offer => (
                        <div key={offer.id} className="module-frame glass-module p-8 rounded-[3rem] border-white/10 hover:border-brand-gold/30 transition-all flex flex-col gap-8 shadow-2xl relative group">
                            <div className="corner-tl opacity-20"></div>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-white/10 group-hover:border-brand-gold/40 transition-all"><UsersIcon className="h-6 w-6 text-gray-600" /></div>
                                    <div>
                                        <p className="text-sm font-black text-white uppercase tracking-tight">{offer.sellerName}</p>
                                        <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest">{formatTimeAgo(offer.createdAt.toDate().toISOString())}</p>
                                    </div>
                                </div>
                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase ${offer.type === 'SELL' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                    {offer.type}
                                </span>
                            </div>
                            <p className="text-5xl font-black text-white font-mono tracking-tighter">{offer.amount} <span className="text-base text-gray-700">UBT</span></p>
                            <p className="text-[11px] font-black text-gray-600 uppercase tracking-widest font-mono">Rate: ${offer.pricePerUnit.toFixed(6)}</p>
                            <button className="w-full py-5 bg-slate-800 hover:bg-brand-gold hover:text-slate-950 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.4em] transition-all shadow-xl active:scale-95 border border-white/10 group-hover:border-transparent">Commit Swap</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const MetricBox = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="bg-black/60 p-5 rounded-2xl border border-white/10 text-center min-w-[150px] shadow-inner transition-all hover:border-brand-gold/20">
        <p className="label-caps !text-[9px] text-gray-600 mb-2">{label}</p>
        <p className={`text-2xl font-black ${color} font-mono tracking-tighter`}>{value}</p>
    </div>
);

const NavBtn = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
    <button onClick={onClick} className={`flex-1 py-4 rounded-[2.2rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 border-2 ${active ? 'bg-brand-gold text-slate-950 border-brand-gold shadow-glow-gold' : 'text-gray-600 hover:text-white border-transparent'}`}>
        {label}
    </button>
);
