
import React, { useState, useEffect, useMemo } from 'react';
import { User, P2POffer, GlobalEconomy, CommunityValuePool, SellRequest, PendingUbtPurchase, AssetType, UbtTransaction, TreasuryVault } from '../types';
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
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { onSnapshot, query, collection, where, Timestamp, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { LogoIcon } from './icons/LogoIcon';
import { formatTimeAgo } from '../utils';

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
        const candleCount = 14;
        const processed = [];
        let runningPrice = currentPrice;
        
        // Protocol Logic for OHLC generation:
        // Transactions FROM 'FLOAT' are 'Buys' -> Scarcity up -> Price was lower before close
        // Transactions TO 'FLOAT' are 'Sells' -> Scarcity down -> Price was higher before close
        
        const floatTxs = ledger
            .filter(tx => tx.senderId === 'FLOAT' || tx.receiverId === 'FLOAT')
            .sort((a, b) => b.timestamp - a.timestamp);

        for (let i = 0; i < candleCount; i++) {
            const chunk = floatTxs.slice(i * 2, (i * 2) + 2);
            const close = runningPrice;
            
            // Impact factor: larger volume moves price more. 
            // We simulate the "open" by looking at the delta of the transactions in this period.
            const impact = chunk.reduce((acc, tx) => {
                const volFactor = tx.amount / 1000000; // Normalized volume impact
                return tx.senderId === 'FLOAT' ? acc - volFactor : acc + volFactor;
            }, 0) || (Math.random() - 0.5) * 0.0001; // Tiny random noise if no trade

            const open = runningPrice + impact;
            const high = Math.max(open, close) + Math.abs(impact * 0.15);
            const low = Math.min(open, close) - Math.abs(impact * 0.15);

            processed.push({ open, high, low, close });
            runningPrice = open; // Walk backwards
        }

        return processed.reverse();
    }, [ledger, currentPrice]);

    const minPrice = Math.min(...candles.map(c => c.low));
    const maxPrice = Math.max(...candles.map(c => c.high));
    const range = (maxPrice - minPrice) || 0.001;

    const getY = (p: number) => 100 - ((p - minPrice) / range) * 80 - 10;

    return (
        <div className="w-full h-36 relative overflow-hidden mt-6 bg-slate-900/40 rounded-2xl border border-white/5 shadow-inner">
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '25px 25px' }}>
            </div>

            <svg viewBox="0 0 400 100" className="w-full h-full p-4 relative z-10">
                {candles.map((c, i) => {
                    const x = (i / candles.length) * 380 + 10;
                    const isBullish = c.close >= c.open;
                    const color = isBullish ? '#10b981' : '#ef4444';
                    
                    const yHigh = getY(c.high);
                    const yLow = getY(c.low);
                    const yOpen = getY(c.open);
                    const yClose = getY(c.close);
                    
                    const bodyY = Math.min(yOpen, yClose);
                    const bodyH = Math.max(Math.abs(yOpen - yClose), 2);

                    return (
                        <g key={i} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                            {/* Wick */}
                            <line x1={x + 6} y1={yHigh} x2={x + 6} y2={yLow} stroke={color} strokeWidth="1.5" opacity="0.5" />
                            {/* Body */}
                            <rect x={x} y={bodyY} width="12" height={bodyH} fill={color} rx="1.5" className="drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]" />
                        </g>
                    );
                })}
            </svg>
            <div className="absolute bottom-2 right-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">Oracle_Feed_Signed</span>
            </div>
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

    const [swapType, setSwapType] = useState<'BUY' | 'SELL'>('BUY');
    const [swapAmount, setSwapAmount] = useState('');
    const [isSwapping, setIsSwapping] = useState(false);
    
    const [bridgeStep, setBridgeStep] = useState<'input' | 'ussd' | 'reference' | 'sync'>('input');
    const [ecocashRef, setEcocashRef] = useState('');
    const [activePurchaseId, setActivePurchaseId] = useState<string | null>(null);
    const [syncLogs, setSyncLogs] = useState<string[]>([]);

    const [mySellRequests, setMySellRequests] = useState<SellRequest[]>([]);

    useEffect(() => {
        const unsubOffers = api.listenToP2POffers(setOffers, console.error);
        const unsubEcon = api.listenForGlobalEconomy(setEconomy, console.error);
        const unsubVaults = api.listenToVaults(setVaults, console.error);
        
        api.getPublicLedger(100).then(setLedger);

        const unsubSell = onSnapshot(query(collection(db, 'sell_requests'), where('userId', '==', user.id)), s => {
            const data = s.docs.map(d => ({ id: d.id, ...d.data() } as SellRequest));
            setMySellRequests(data.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt)));
        });

        setIsLoading(false);
        return () => { unsubOffers(); unsubEcon(); unsubVaults(); unsubSell(); };
    }, [user.id]);

    useEffect(() => {
        if (!activePurchaseId) return;
        const unsub = onSnapshot(doc(db, 'pending_ubt_purchases', activePurchaseId), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as PendingUbtPurchase;
                if (data.status === 'VERIFIED') {
                    setSyncLogs(prev => [...prev, "> [SUCCESS] BLOCK VERIFIED.", "> [SUCCESS] ASSETS RELEASED."]);
                    setTimeout(() => {
                        setActivePurchaseId(null);
                        setBridgeStep('input');
                        setSwapAmount('');
                        setEcocashRef('');
                    }, 5000);
                } else if (data.status === 'REJECTED') {
                    setSyncLogs(prev => [...prev, "> [ERROR] BLOCK REJECTED."]);
                    setTimeout(() => { setActivePurchaseId(null); setBridgeStep('input'); }, 5000);
                }
            }
        });
        return () => unsub();
    }, [activePurchaseId]);

    // Live Metrics - Only UBT in the 'FLOAT' node is considered circulating.
    const metrics = useMemo(() => {
        const floatVault = vaults.find(v => v.id === 'FLOAT');
        const floatBalance = floatVault?.balance || 1000000;
        
        // Protocol Standard: Circulation = Float Balance
        const circulating = floatBalance;
        const backing = economy?.cvp_usd_backing || 1000;
        
        // Calculated Rate: Backing Reserve / Liquidity Float
        const price = backing / Math.max(1, circulating);
        
        return { circulating, backing, price };
    }, [vaults, economy]);

    const estTotal = (parseFloat(swapAmount) || 0) * metrics.price;
    const merchantCode = "031068";
    const ussdCommand = `*151*2*2*${merchantCode}*${Math.round(estTotal)}#`;

    const handleSwapInitiate = async () => {
        const amt = parseFloat(swapAmount);
        if (isNaN(amt) || amt <= 0) return;
        if (swapType === 'BUY') {
            setBridgeStep('ussd');
        } else {
            setIsSwapping(true);
            try {
                await api.createSellRequest(user, amt, estTotal);
                addToast("Redemption anchor created.", "success");
                setSwapAmount('');
            } finally {
                setIsSwapping(false);
            }
        }
    };

    const handleEcocashSubmit = async () => {
        if (!ecocashRef.trim()) return;
        setIsSwapping(true);
        setSyncLogs(["> INITIALIZING_BRIDGE...", "> ESCROWING_ASSETS...", "> BROADCASTING_PROOF..."]);
        try {
            const purchaseRef = await api.createPendingUbtPurchase(user, estTotal, parseFloat(swapAmount), ecocashRef.toUpperCase());
            setActivePurchaseId(purchaseRef.id);
            setBridgeStep('sync');
        } catch (e) {
            addToast("Sync failure.", "error");
            setBridgeStep('input');
        } finally {
            setIsSwapping(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-24 px-4 font-sans">
            
            {/* SOVEREIGN MARKET HUD */}
            <div className="module-frame bg-slate-950/80 rounded-[3rem] p-8 border-white/5 flex flex-col justify-between relative overflow-hidden shadow-premium">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-gold/[0.04] to-transparent pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 relative z-10">
                    <div className="space-y-1">
                        <p className="label-caps !text-[10px] text-brand-gold/60 !tracking-[0.5em]">Global Equilibrium Pulse</p>
                        <div className="flex items-baseline gap-5">
                            <h1 className="text-6xl sm:text-8xl font-black text-white tracking-tighter gold-text leading-none">${metrics.price.toFixed(6)}</h1>
                            <div className="flex flex-col">
                                <span className="text-emerald-400 font-mono text-[10px] font-black uppercase tracking-widest animate-pulse">Oracle_Verified</span>
                                <span className="text-[9px] text-gray-700 font-mono uppercase">Liquidity Ratio: 1:{Math.round(1/metrics.price)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                        <div className="bg-black/60 p-5 rounded-2xl border border-white/5 text-center min-w-[150px] shadow-inner">
                            <p className="label-caps !text-[8px] text-gray-600 mb-2">USD Backing</p>
                            <p className="text-2xl font-black text-emerald-500 font-mono tracking-tighter">${metrics.backing.toLocaleString()}</p>
                        </div>
                        <div className="bg-black/60 p-5 rounded-2xl border border-white/5 text-center min-w-[150px] shadow-inner">
                            <p className="label-caps !text-[8px] text-gray-600 mb-2">Liquid Float</p>
                            <p className="text-2xl font-black text-white font-mono tracking-tighter">{metrics.circulating.toLocaleString()} <span className="text-[10px] font-sans">UBT</span></p>
                        </div>
                    </div>
                </div>

                <PulseCandleChart ledger={ledger} currentPrice={metrics.price} />
            </div>

            {/* View Selector */}
            <div className="flex bg-slate-950/80 p-1.5 rounded-[2.5rem] border border-white/5 shadow-2xl w-full sm:max-w-md mx-auto">
                <button 
                    onClick={() => setView('swap')} 
                    className={`flex-1 py-4 rounded-[2.2rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${view === 'swap' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Treasury
                </button>
                <button 
                    onClick={() => setView('p2p')} 
                    className={`flex-1 py-4 rounded-[2.2rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${view === 'p2p' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    P2P Bazaar
                </button>
            </div>

            {view === 'swap' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8 module-frame bg-slate-950/60 p-8 sm:p-12 rounded-[4rem] border-white/5 shadow-premium space-y-10 relative overflow-hidden">
                        <div className="corner-tl opacity-20"></div><div className="corner-tr opacity-20"></div>
                        
                        {bridgeStep === 'input' ? (
                            <div className="space-y-10 animate-fade-in">
                                <div className="flex flex-col sm:flex-row justify-between items-center border-b border-white/5 pb-8 gap-6">
                                    <div>
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text">Order Desk</h2>
                                        <p className="label-caps !text-[9px] mt-1 text-gray-500">Liquidity Float Interconnect</p>
                                    </div>
                                    <div className="flex bg-black/60 p-1 rounded-2xl border border-white/5">
                                        <button onClick={() => setSwapType('BUY')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${swapType === 'BUY' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-600'}`}>Buy UBT</button>
                                        <button onClick={() => setSwapType('SELL')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${swapType === 'SELL' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-600'}`}>Sell UBT</button>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 focus-within:border-brand-gold/40 transition-all shadow-inner">
                                        <label className="label-caps !text-[11px] mb-6 block">Order Volume</label>
                                        <div className="flex items-center gap-6">
                                            <input 
                                                type="number" 
                                                value={swapAmount}
                                                onChange={e => setSwapAmount(e.target.value)}
                                                className="bg-transparent border-none text-7xl font-black font-mono text-white focus:outline-none w-full placeholder-gray-900 tracking-tighter" 
                                                placeholder="0.00"
                                            />
                                            <span className="text-3xl font-black text-brand-gold font-mono tracking-widest">UBT</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-center -my-12 relative z-20">
                                        <div className="p-4 bg-slate-900 rounded-full border border-white/10 shadow-glow-gold">
                                            <TrendingUpIcon className={`h-8 w-8 text-brand-gold transition-transform duration-500 ${swapType === 'SELL' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>

                                    <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 shadow-inner">
                                        <label className="label-caps !text-[11px] mb-6 block">Target Valuation</label>
                                        <div className="flex justify-between items-center">
                                            <p className="text-7xl font-black font-mono text-white tracking-tighter leading-none">${estTotal.toFixed(2)}</p>
                                            <span className="text-2xl font-black text-gray-700 font-mono tracking-widest uppercase">USD</span>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleSwapInitiate}
                                    disabled={isSwapping || !swapAmount}
                                    className={`w-full py-8 font-black rounded-3xl transition-all active:scale-[0.98] shadow-glow-gold disabled:opacity-20 uppercase tracking-[0.5em] text-[11px] flex justify-center items-center gap-4 ${swapType === 'SELL' ? 'bg-red-600 text-white shadow-red-900/40' : 'bg-brand-gold text-slate-950'}`}
                                >
                                    {isSwapping ? <LoaderIcon className="h-6 w-6 animate-spin" /> : <>Initialize Dispatch <ShieldCheckIcon className="h-6 w-6"/></>}
                                </button>
                            </div>
                        ) : bridgeStep === 'ussd' ? (
                            <div className="space-y-12 animate-fade-in text-center py-10">
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter gold-text">Ecocash Terminal</h2>
                                <div className="bg-black/60 p-12 rounded-[3.5rem] border border-brand-gold/30 shadow-inner">
                                     <p className="label-caps !text-[11px] mb-8">Execute SMS Packet</p>
                                     <p className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tighter break-all">{ussdCommand}</p>
                                </div>
                                <div className="space-y-6 max-w-sm mx-auto">
                                    <a 
                                        href={`tel:${ussdCommand}`}
                                        onClick={() => setBridgeStep('reference')}
                                        className="w-full block py-6 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95"
                                    >
                                        Execute Command
                                    </a>
                                    <button onClick={() => setBridgeStep('input')} className="text-[10px] text-gray-600 font-black uppercase tracking-widest hover:text-white transition-colors">Abort Sync</button>
                                </div>
                            </div>
                        ) : bridgeStep === 'reference' ? (
                            <div className="space-y-12 animate-fade-in text-center py-10">
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter gold-text">Ledger Proof</h2>
                                <div className="space-y-8 max-w-md mx-auto">
                                    <p className="text-sm text-gray-400 uppercase font-black leading-loose text-center px-6">Input the reference identity from your Ecocash receipt to anchor the block.</p>
                                    <input 
                                        type="text" 
                                        value={ecocashRef}
                                        onChange={e => setEcocashRef(e.target.value.toUpperCase())}
                                        className="w-full bg-black border border-white/10 p-8 rounded-[2rem] text-white font-mono text-center text-4xl font-black tracking-[0.2em] focus:outline-none focus:ring-1 focus:ring-brand-gold"
                                        placeholder="ANCHOR_ID"
                                        autoFocus
                                    />
                                    <button 
                                        onClick={handleEcocashSubmit}
                                        disabled={isSwapping || !ecocashRef}
                                        className="w-full py-6 bg-emerald-600 text-white font-black rounded-3xl uppercase tracking-[0.4em] text-[10px] shadow-glow-matrix active:scale-95 flex justify-center items-center gap-3"
                                    >
                                        {isSwapping ? <LoaderIcon className="h-6 w-6 animate-spin" /> : <>Finalize Handshake</>}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-12 animate-fade-in py-16 flex flex-col items-center">
                                <div className="relative">
                                    <div className="w-40 h-40 bg-brand-gold/5 rounded-full border border-brand-gold/20 flex items-center justify-center animate-pulse">
                                        <LogoIcon className="h-20 w-20 text-brand-gold animate-spin-slow" />
                                    </div>
                                    <div className="absolute inset-0 border border-brand-gold/20 rounded-full animate-ping"></div>
                                </div>
                                <div className="w-full max-w-md bg-black border border-white/10 rounded-[2.5rem] p-10 font-mono text-[11px] text-brand-gold/80 space-y-4 shadow-inner h-80 overflow-y-auto no-scrollbar">
                                    {syncLogs.map((log, i) => <div key={i} className="animate-fade-in">{log}</div>)}
                                    <div className="w-2 h-5 bg-brand-gold animate-terminal-cursor shadow-glow-gold"></div>
                                </div>
                                <p className="label-caps !text-[11px] animate-pulse text-gray-500">Processing Network Consensus...</p>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="glass-card p-10 rounded-[3.5rem] border-white/5 bg-slate-900/40 shadow-inner overflow-hidden">
                            <h3 className="label-caps !text-[10px] mb-8 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                                Recent Activity
                            </h3>
                            <div className="space-y-4">
                                {mySellRequests.map(req => (
                                    <div key={req.id} className="p-6 bg-black/40 rounded-3xl border border-white/5 space-y-4 group hover:border-brand-gold/30 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-2xl font-black text-white font-mono tracking-tighter leading-none">{req.amountUbt} UBT</p>
                                                <p className="text-[10px] font-bold text-gray-600 uppercase mt-2 tracking-widest">${req.amountUsd.toFixed(2)} VAL</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${req.status === 'PENDING' ? 'bg-yellow-900/20 text-yellow-500' : 'bg-emerald-900/20 text-emerald-400'}`}>
                                                {req.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {mySellRequests.length === 0 && (
                                    <p className="text-center py-10 text-[9px] text-gray-700 uppercase font-black tracking-widest">No bridge events logged.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {offers.map(offer => (
                        <div key={offer.id} className="module-frame glass-module p-8 rounded-[3rem] border-white/5 hover:border-brand-gold/30 transition-all flex flex-col gap-8 relative group shadow-2xl">
                            <div className="corner-tl opacity-20"></div>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-800 rounded-2xl border border-white/10"><UsersIcon className="h-6 w-6 text-gray-500" /></div>
                                    <div>
                                        <p className="text-sm font-black text-white uppercase tracking-tight">{offer.sellerName}</p>
                                        <p className="text-[9px] text-gray-600 uppercase font-black tracking-[0.2em]">{formatTimeAgo(offer.createdAt.toDate().toISOString())}</p>
                                    </div>
                                </div>
                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black tracking-[0.3em] uppercase ${offer.type === 'SELL' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                    {offer.type}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <p className="text-5xl font-black text-white font-mono tracking-tighter leading-none">{offer.amount} <span className="text-base text-gray-700 font-sans">UBT</span></p>
                                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Signed At: ${offer.pricePerUnit.toFixed(6)} / UBT</p>
                            </div>

                            <button className="w-full py-5 bg-slate-800 hover:bg-brand-gold hover:text-slate-950 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.4em] transition-all shadow-xl active:scale-95 border border-white/10 group-hover:border-transparent">Commit Swap</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
