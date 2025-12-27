import React, { useState, useEffect, useMemo } from 'react';
import { User, P2POffer, GlobalEconomy, SellRequest, PendingUbtPurchase, UbtTransaction, TreasuryVault } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { onSnapshot, query, collection, where, Timestamp, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { formatTimeAgo } from '../utils';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { PhoneIcon } from './icons/PhoneIcon';
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
    return new Date(val).getTime();
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
            <svg viewBox="0 0 400 100" className="w-full h-full p-6 relative z-10 overflow-visible">
                {candles.map((c, i) => {
                    const x = (i / (candles.length - 1)) * 360 + 20;
                    const isBullish = c.close >= c.open;
                    const color = isBullish ? '#10b981' : '#ef4444';
                    const bodyY = getY(Math.max(c.open, c.close));
                    const bodyH = Math.max(Math.abs(getY(c.open) - getY(c.close)), 2);
                    return (
                        <g key={i} className="animate-fade-in">
                            <line x1={x} y1={getY(c.high)} x2={x} y2={getY(c.low)} stroke={color} strokeWidth="1" opacity="0.6" />
                            <rect x={x - 3} y={bodyY} width="6" height={bodyH} fill={color} rx="1" className="transition-all duration-1000" />
                        </g>
                    );
                })}
            </svg>
            <div className="absolute top-6 left-8 flex items-center gap-3 bg-black/60 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.5em]">Network_Tracing_Pulse</span>
            </div>
        </div>
    );
};

export const PulseHub: React.FC<PulseHubProps> = ({ user }) => {
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [ledger, setLedger] = useState<UbtTransaction[]>([]);
    const [swapType, setSwapType] = useState<'BUY' | 'SELL'>('BUY');
    const [swapAmount, setSwapAmount] = useState('');
    const [handshakeState, setHandshakeState] = useState<'input' | 'escrow'>('input');
    const [lastPurchaseId, setLastPurchaseId] = useState<string | null>(null);
    const [ecocashRef, setEcocashRef] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [myHistory, setMyHistory] = useState<(SellRequest | PendingUbtPurchase)[]>([]);
    const { addToast } = useToast();

    useEffect(() => {
        const unsubEcon = api.listenForGlobalEconomy(setEconomy, console.error);
        const unsubVaults = api.listenToVaults(setVaults, console.error);
        api.getPublicLedger(100).then(setLedger);

        const unsubSell = onSnapshot(query(collection(db, 'sell_requests'), where('userId', '==', user.id), limit(20)), s => {
            const sellData = s.docs.map(d => ({ ...d.data(), id: d.id, itemType: 'SELL' } as any));
            setMyHistory(prev => {
                const filtered = prev.filter(item => (item as any).itemType !== 'SELL');
                return [...filtered, ...sellData].sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
            });
        });

        const unsubBuy = onSnapshot(query(collection(db, 'pending_ubt_purchases'), where('userId', '==', user.id), limit(20)), s => {
            const buyData = s.docs.map(d => ({ ...d.data(), id: d.id, itemType: 'BUY' } as any));
            setMyHistory(prev => {
                const filtered = prev.filter(item => (item as any).itemType !== 'BUY');
                return [...filtered, ...buyData].sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
            });
        });

        return () => { unsubEcon(); unsubVaults(); unsubSell(); unsubBuy(); };
    }, [user.id]);

    const metrics = useMemo(() => {
        const floatVault = vaults.find(v => v.id === 'FLOAT');
        const circulating = floatVault?.balance || 1000000;
        const price = economy?.ubt_to_usd_rate || 0.001;
        const marketCap = price * circulating;
        return { circulating, price, marketCap };
    }, [vaults, economy]);

    const estTotal = (parseFloat(swapAmount) || 0) * metrics.price;
    const merchantCode = "031068";
    const ussdString = `*151*2*2*${merchantCode}*${estTotal.toFixed(2)}#`;

    const handleCopyUssd = () => {
        navigator.clipboard.writeText(ussdString).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            addToast("Payment string copied.", "info");
        });
    };

    const triggerDialer = () => {
        window.location.href = `tel:${ussdString.replace(/#/g, '%23')}`;
    };

    const initiateHandshake = async () => {
        const amountUbt = parseFloat(swapAmount);
        if (!amountUbt || amountUbt <= 0) return addToast("Define quantum volume.", "error");

        setIsProcessing(true);
        try {
            if (swapType === 'BUY') {
                const purchaseDoc = await api.createPendingUbtPurchase(user, estTotal, amountUbt);
                setLastPurchaseId(purchaseDoc.id);
                setHandshakeState('escrow');
                
                triggerDialer();
                addToast("Handshake Block created. Opening dialer.", "success");
            } else {
                if (amountUbt > (user.ubtBalance || 0)) return addToast("Insufficient Node Liquidity.", "error");
                await api.createSellRequest(user, amountUbt, estTotal);
                addToast("Liquidation request anchored to ledger.", "success");
                setSwapAmount('');
            }
        } catch (e) {
            addToast("Handshake initialization failed.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const finalizeHandshake = async () => {
        if (!ecocashRef.trim()) return addToast("Reference ID required.", "error");
        if (!lastPurchaseId) return addToast("Purchase context lost. Re-initialize.", "error");

        setIsProcessing(true);
        try {
            await api.updatePendingPurchaseReference(lastPurchaseId, ecocashRef);
            addToast("Anchor Buffered. Awaiting Oracle Verification.", "success");
            setHandshakeState('input');
            setSwapAmount('');
            setEcocashRef('');
            setLastPurchaseId(null);
        } catch (e) {
            addToast("Failed to anchor reference.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-24 px-4 font-sans">
            <div className="module-frame bg-slate-950 rounded-[3rem] p-10 border-white/5 shadow-premium relative overflow-hidden">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12 relative z-10">
                    <div className="space-y-2">
                        <p className="label-caps !text-[11px] text-brand-gold/70 !tracking-[0.5em]">Network Equilibrium</p>
                        <div className="flex items-baseline gap-6">
                            <h1 className="text-7xl sm:text-8xl font-black text-white tracking-tighter gold-text leading-none">${metrics.price.toFixed(6)}</h1>
                            <span className="text-emerald-500 font-mono text-[11px] font-black uppercase tracking-widest animate-pulse">MARKET_TAPE</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                         <div className="bg-black/60 p-5 rounded-2xl border border-white/10 text-center min-w-[150px]">
                            <p className="label-caps !text-[9px] text-gray-600 mb-2">Market Capitalization</p>
                            <p className="text-2xl font-black text-emerald-500 font-mono">${metrics.marketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="bg-black/60 p-5 rounded-2xl border border-white/10 text-center min-w-[150px]">
                            <p className="label-caps !text-[9px] text-gray-600 mb-2">Network Float</p>
                            <p className="text-2xl font-black text-white font-mono">{metrics.circulating.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <PulseCandleChart ledger={ledger} currentPrice={metrics.price} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-8 module-frame bg-slate-950/60 p-8 sm:p-12 rounded-[4rem] border-white/10 shadow-premium">
                    {handshakeState === 'input' ? (
                        <div className="space-y-12 animate-fade-in">
                            <div className="flex justify-between items-center border-b border-white/10 pb-8">
                                <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text">Market Swap</h2>
                                <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                                    <button onClick={() => setSwapType('BUY')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${swapType === 'BUY' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-600'}`}>Buy</button>
                                    <button onClick={() => setSwapType('SELL')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${swapType === 'SELL' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-600'}`}>Sell</button>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="bg-slate-800 border-2 border-white/20 p-10 rounded-[3rem] shadow-inner focus-within:border-brand-gold/40 transition-all">
                                    <label className="label-caps !text-[12px] mb-6 text-white font-black">Quantum Volume</label>
                                    <div className="flex items-center gap-6">
                                        <input type="number" value={swapAmount} onChange={e => setSwapAmount(e.target.value)} className="bg-transparent border-none text-7xl font-black font-mono text-white focus:outline-none w-full" placeholder="0" />
                                        <span className="text-3xl font-black text-brand-gold font-mono uppercase">UBT</span>
                                    </div>
                                </div>
                                <div className="bg-slate-800 border-2 border-white/20 p-10 rounded-[3rem] shadow-inner text-right">
                                    <label className="label-caps !text-[12px] mb-6 text-white font-black">Settlement Quote</label>
                                    <p className="text-7xl font-black font-mono text-emerald-400 tracking-tighter">${estTotal.toFixed(2)} <span className="text-xl">USD</span></p>
                                </div>
                            </div>

                            <button onClick={initiateHandshake} disabled={isProcessing || !swapAmount} className={`w-full py-8 font-black rounded-3xl transition-all active:scale-[0.98] shadow-glow-gold uppercase tracking-[0.5em] text-[12px] flex justify-center items-center gap-4 ${swapType === 'SELL' ? 'bg-red-600 text-white shadow-red-900/40' : 'bg-brand-gold text-slate-950 shadow-glow-gold'}`}>
                                {isProcessing ? <LoaderIcon className="h-6 w-6 animate-spin" /> : <>Initialize Handshake <ShieldCheckIcon className="h-6 w-6"/></>}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in py-5">
                            <div className="p-8 bg-emerald-950/20 border-2 border-emerald-500/40 rounded-[3rem] flex flex-col items-center gap-6 shadow-glow-matrix text-center">
                                <ShieldCheckIcon className="h-16 w-16 text-emerald-500" />
                                <div>
                                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Handshake Escrow</h3>
                                    <p className="label-caps !text-[9px] text-emerald-500 mt-2">Awaiting External Settlement</p>
                                </div>
                            </div>

                            <div className="p-10 bg-slate-900/80 rounded-[3.5rem] border-2 border-brand-gold/20 space-y-8 shadow-inner text-center">
                                <p className="label-caps !text-[10px] text-gray-500">Step 1: Execute Protocol Payment</p>
                                
                                <div className="bg-black p-8 rounded-3xl border border-white/10 shadow-2xl space-y-4 group">
                                    <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.4em]">USSD Dispatch Signature</p>
                                    <p className="text-4xl sm:text-5xl font-mono text-brand-gold font-black select-all tracking-tighter break-all">
                                        {ussdString}
                                    </p>
                                    <div className="flex gap-4 pt-4">
                                        <button onClick={triggerDialer} className="flex-1 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
                                            <PhoneIcon className="h-5 w-5" /> Launch Dialer Now
                                        </button>
                                        <button onClick={handleCopyUssd} className="p-5 bg-slate-800 hover:bg-slate-700 text-gray-400 rounded-2xl transition-all">
                                            {isCopied ? <ClipboardCheckIcon className="h-6 w-6 text-emerald-500" /> : <ClipboardIcon className="h-6 w-6" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                     <div className="p-5 bg-black/40 rounded-2xl border border-white/5">
                                        <p className="label-caps !text-[8px] text-gray-600 mb-1">Target Node</p>
                                        <p className="text-lg font-black text-white font-mono">{merchantCode}</p>
                                    </div>
                                    <div className="p-5 bg-black/40 rounded-2xl border border-white/5">
                                        <p className="label-caps !text-[8px] text-gray-600 mb-1">Exact Value</p>
                                        <p className="text-lg font-black text-emerald-400 font-mono">${estTotal.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 bg-slate-900/80 rounded-[3.5rem] border border-white/5 space-y-6">
                                <p className="label-caps !text-[10px] text-gray-500">Step 2: Reference Anchor</p>
                                <div className="space-y-6">
                                    <p className="text-xs text-gray-400 leading-relaxed text-center">After paying via USSD, enter the 10-character Reference ID from your SMS below to anchor the transaction block.</p>
                                    <input 
                                        type="text" 
                                        value={ecocashRef} 
                                        onChange={e => setEcocashRef(e.target.value.toUpperCase())} 
                                        className="w-full bg-black border-2 border-brand-gold/40 p-5 rounded-2xl text-white font-mono text-center text-2xl tracking-[0.3em] focus:ring-4 focus:ring-brand-gold/20 outline-none" 
                                        placeholder="REF_ID..." 
                                    />
                                    <button onClick={finalizeHandshake} disabled={isProcessing || !ecocashRef} className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.3em] text-[11px] shadow-glow-gold transition-all active:scale-95">
                                        {isProcessing ? <LoaderIcon className="h-5 w-5 animate-spin mx-auto"/> : "Submit Reference Anchor"}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="text-center">
                                <button onClick={() => setHandshakeState('input')} className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-[0.5em] transition-colors">Abort Protocol Handshake</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="xl:col-span-4 glass-card p-10 rounded-[3.5rem] border-white/10 shadow-inner h-full overflow-y-auto no-scrollbar max-h-[80vh]">
                    <h3 className="label-caps !text-[11px] mb-8 flex items-center gap-3 text-white">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div> Ledger History
                    </h3>
                    <div className="space-y-4">
                        {myHistory.map(item => (
                            <div key={item.id} className="p-6 bg-black/40 rounded-3xl border border-white/5 flex justify-between items-center transition-all hover:border-brand-gold/20">
                                <div>
                                    <p className="text-lg font-black text-white font-mono">{item.amountUbt} UBT</p>
                                    <p className={`text-[8px] font-black uppercase mt-2 tracking-widest ${item.status === 'PENDING' || item.status === 'CLAIMED' || item.status === 'AWAITING_CONFIRMATION' ? 'text-yellow-500' : 'text-emerald-500'}`}>{item.status}</p>
                                </div>
                                <div className="text-right">
                                     <p className="text-[10px] font-bold text-gray-600">${item.amountUsd.toFixed(2)}</p>
                                     <p className="text-[8px] text-gray-700 font-mono mt-1">{(item as any).itemType}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricBox = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="bg-black/60 p-5 rounded-2xl border border-white/10 text-center min-w-[150px] shadow-inner">
        <p className="label-caps !text-[9px] text-gray-600 mb-2">{label}</p>
        <p className={`text-2xl font-black ${color} font-mono tracking-tighter`}>{value}</p>
    </div>
);

const NavBtn = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
    <button onClick={onClick} className={`flex-1 py-4 rounded-[2.2rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 border-2 ${active ? 'bg-brand-gold text-slate-950 border-brand-gold' : 'text-gray-500 hover:text-white border-transparent'}`}>
        {label}
    </button>
);