
import React, { useState, useEffect, useMemo } from 'react';
import { User, GlobalEconomy, PendingUbtPurchase, UbtTransaction, TreasuryVault } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { onSnapshot, query, collection, where, Timestamp, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { formatTimeAgo, safeDate } from '../utils';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { OracleHUD } from './OracleHUD';
import { InfoIcon } from './icons/InfoIcon';

interface PulseHubProps {
    user: User;
}

const getMillis = (val: any): number => {
    const d = safeDate(val);
    return d ? d.getTime() : 0;
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
                const volFactor = tx.amount / 500000; 
                return tx.senderId === 'FLOAT' ? acc - volFactor : acc + volFactor;
            }, 0) || (Math.random() - 0.5) * 0.00002; 
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
        <div className="w-full h-48 relative overflow-hidden mt-8 bg-black rounded-[2.5rem] border border-white/5 shadow-inner group">
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
            <div className="absolute top-6 left-8 flex items-center gap-3 bg-slate-900/60 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.5em]">Global_Equilibrium_Trace</span>
            </div>
            <div className="absolute bottom-4 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[7px] text-gray-500 uppercase font-black tracking-widest bg-black/60 px-3 py-1 rounded-lg">Real-time market pressure visualizer</p>
            </div>
        </div>
    );
};

export const PulseHub: React.FC<PulseHubProps> = ({ user }) => {
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [ledger, setLedger] = useState<UbtTransaction[]>([]);
    const [swapAmount, setSwapAmount] = useState('');
    const [handshakeState, setHandshakeState] = useState<'input' | 'escrow'>('input');
    const [lastPurchaseId, setLastPurchaseId] = useState<string | null>(null);
    const [ecocashRef, setEcocashRef] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [myHistory, setMyHistory] = useState<PendingUbtPurchase[]>([]);
    const { addToast } = useToast();

    useEffect(() => {
        const unsubEcon = api.listenForGlobalEconomy(setEconomy, console.error);
        const unsubVaults = api.listenToVaults(setVaults, console.error);
        api.getPublicLedger(100).then(setLedger);
        const unsubBuy = onSnapshot(query(collection(db, 'pending_ubt_purchases'), where('userId', '==', user.id), limit(20)), s => {
            const buyData = s.docs.map(d => ({ ...d.data(), id: d.id } as any));
            setMyHistory(buyData.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt)));
        });
        return () => { unsubEcon(); unsubVaults(); unsubBuy(); };
    }, [user.id]);

    const metrics = useMemo(() => {
        const floatVault = vaults.find(v => v.id === 'FLOAT');
        const circulating = floatVault?.balance || 1000000;
        const price = economy?.ubt_to_usd_rate || 0.001;
        return { circulating, price };
    }, [vaults, economy]);

    const estTotal = (parseFloat(swapAmount) || 0) * metrics.price;
    const merchantCode = "031068";
    const ussdString = `*151*2*2*${merchantCode}*${estTotal.toFixed(2)}#`;

    const handleCopyUssd = () => {
        navigator.clipboard.writeText(ussdString).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            addToast("Signature Copied.", "info");
        });
    };

    const initiateHandshake = async () => {
        const amountUbt = parseFloat(swapAmount);
        if (!amountUbt || amountUbt <= 0) return addToast("Define volume.", "error");
        setIsProcessing(true);
        try {
            const purchaseDoc = await api.createPendingUbtPurchase(user, estTotal, amountUbt);
            setLastPurchaseId(purchaseDoc.id);
            setHandshakeState('escrow');
            window.location.href = `tel:${ussdString.replace(/#/g, '%23')}`;
            addToast("Escrow Initialized.", "success");
        } catch (e) {
            addToast("Protocol Failure.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const finalizeHandshake = async () => {
        if (!ecocashRef.trim()) return addToast("Reference Anchor Required.", "error");
        if (!lastPurchaseId) return;
        setIsProcessing(true);
        try {
            await api.updatePendingPurchaseReference(lastPurchaseId, ecocashRef);
            addToast("Oracle Sync Buffered.", "success");
            setHandshakeState('input');
            setSwapAmount('');
            setEcocashRef('');
        } catch (e) {
            addToast("Anchor Failed.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-24 px-4 font-mono">
            {/* LIVING ORACLE HUD */}
            <OracleHUD user={user} />

            <div className="module-frame bg-slate-950 rounded-[3rem] p-10 border border-white/10 shadow-premium relative overflow-hidden group">
                <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                             <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.5em] opacity-80">Network_Oracle_Tape</p>
                             <div className="group/hint relative">
                                <InfoIcon className="h-3 w-3 text-gray-700 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black p-3 rounded-xl border border-white/10 opacity-0 group-hover/hint:opacity-100 transition-opacity z-50 pointer-events-none shadow-2xl">
                                    <p className="text-[8px] text-gray-400 font-bold uppercase leading-relaxed">The Oracle Price is the real-time equilibrium point of the network economy, calculated by the ratio of CVP backing to circulating supply.</p>
                                </div>
                             </div>
                        </div>
                        <div className="flex items-baseline gap-6">
                            <h1 className="text-7xl sm:text-8xl font-black text-white tracking-tighter leading-none">${metrics.price.toFixed(6)}</h1>
                            <span className="text-emerald-500 text-[12px] font-black uppercase tracking-widest animate-pulse font-sans">Live_Market_Gravity</span>
                        </div>
                    </div>
                    <div className="flex gap-6">
                        <div className="bg-white/[0.03] p-6 rounded-[1.5rem] border border-white/5 text-center min-w-[180px]">
                            <p className="text-[9px] font-black text-gray-600 uppercase mb-3 tracking-[0.3em]">Circ_Float</p>
                            <p className="text-3xl font-black text-white tracking-tighter">{metrics.circulating.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <PulseCandleChart ledger={ledger} currentPrice={metrics.price} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-8 module-frame bg-slate-950/60 p-8 sm:p-12 rounded-[4rem] border border-white/10 shadow-premium relative">
                    {handshakeState === 'input' ? (
                        <div className="space-y-12 animate-fade-in">
                            <div className="flex justify-between items-center border-b border-white/10 pb-10">
                                <div>
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Asset_Ingress</h2>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-2">Convert local currency to protocol equity</p>
                                </div>
                                <div className="bg-emerald-950/20 text-emerald-400 px-6 py-2 rounded-2xl border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest font-sans">Buy UBT via USSD</div>
                            </div>

                            <div className="space-y-8">
                                <div className="bg-slate-900/60 border-2 border-white/10 p-10 rounded-[3.5rem] shadow-inner focus-within:border-brand-gold/40 transition-all">
                                    <label className="label-caps !text-[12px] mb-8 text-gray-500 font-black">Quantum_Allocation</label>
                                    <div className="flex items-center gap-8">
                                        <input type="number" value={swapAmount} onChange={e => setSwapAmount(e.target.value)} className="bg-transparent border-none text-8xl font-black text-white focus:outline-none w-full tracking-tighter" placeholder="0" />
                                        <span className="text-4xl font-black text-brand-gold uppercase tracking-widest">UBT</span>
                                    </div>
                                    <p className="text-[9px] text-gray-600 mt-6 font-bold uppercase tracking-widest italic">How many tokens do you wish to acquire?</p>
                                </div>
                                <div className="bg-slate-900/60 border-2 border-white/10 p-10 rounded-[3.5rem] shadow-inner text-right relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03]"><PhoneIcon className="h-32 w-32 text-white" /></div>
                                    <label className="label-caps !text-[12px] mb-8 text-gray-500 font-black">Settlement_Handshake</label>
                                    <p className="text-7xl font-black text-emerald-400 tracking-tighter">${estTotal.toFixed(2)} <span className="text-2xl font-sans opacity-40">USD</span></p>
                                    <p className="text-[9px] text-gray-600 mt-6 font-bold uppercase tracking-widest italic">Required Ecocash contribution based on current Oracle price.</p>
                                </div>
                            </div>

                            <button onClick={initiateHandshake} disabled={isProcessing || !swapAmount} className="w-full py-10 font-black rounded-[2.5rem] transition-all active:scale-[0.98] bg-brand-gold text-slate-950 shadow-glow-gold uppercase tracking-[0.6em] text-sm flex justify-center items-center gap-6">
                                {isProcessing ? <LoaderIcon className="h-8 w-8 animate-spin" /> : <>Initiate Handshake <ShieldCheckIcon className="h-8 w-8"/></>}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-12 animate-fade-in py-10">
                            <div className="p-10 bg-emerald-950/20 border-2 border-emerald-500/40 rounded-[4rem] flex flex-col items-center gap-8 shadow-glow-matrix text-center">
                                <ShieldCheckIcon className="h-20 w-20 text-emerald-500" />
                                <div className="space-y-4">
                                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Node_Escrow_Locked</h3>
                                    <p className="label-caps !text-[10px] text-emerald-500 !tracking-[0.6em]">Protocol: USSD_MERCHANT_SETTLEMENT</p>
                                </div>
                                <p className="text-xs text-gray-400 max-w-sm font-bold uppercase leading-relaxed tracking-widest">Execute the USSD sequence below on your phone to complete the external payment anchor.</p>
                            </div>

                            <div className="p-12 bg-black rounded-[4rem] border-2 border-brand-gold/20 space-y-10 text-center">
                                <p className="text-[11px] text-gray-500 uppercase font-black tracking-[0.5em]">Signature_String</p>
                                <p className="text-5xl sm:text-6xl text-brand-gold font-black select-all tracking-tighter leading-none">{ussdString}</p>
                                <button onClick={handleCopyUssd} className="mx-auto flex items-center gap-4 px-10 py-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest transition-all">
                                    {isCopied ? <ClipboardCheckIcon className="h-5 w-5 text-emerald-500" /> : <ClipboardIcon className="h-5 w-5" />}
                                    Copy Protocol Anchor
                                </button>
                            </div>

                            <div className="space-y-6">
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.4em] text-center mb-8">Execute State Verification</p>
                                <div className="bg-slate-900/60 p-10 rounded-[3.5rem] border border-white/10 space-y-8">
                                    <input 
                                        type="text" 
                                        value={ecocashRef} 
                                        onChange={e => setEcocashRef(e.target.value.toUpperCase())} 
                                        className="w-full bg-black border-2 border-brand-gold/40 p-8 rounded-[2rem] text-white text-center text-4xl tracking-[0.5em] focus:ring-8 focus:ring-brand-gold/10 outline-none uppercase placeholder-gray-900" 
                                        placeholder="REF_ID" 
                                    />
                                    <p className="text-[9px] text-center text-gray-600 font-black uppercase tracking-widest">Paste the Reference ID from your Ecocash SMS to anchor this block.</p>
                                    <button onClick={finalizeHandshake} disabled={isProcessing || !ecocashRef} className="w-full py-8 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.5em] text-xs shadow-glow-gold transition-all active:scale-95">
                                        {isProcessing ? <LoaderIcon className="h-6 w-6 animate-spin"/> : "Anchor Block to Mainnet"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="xl:col-span-4 space-y-8 h-full">
                    <div className="module-frame glass-module p-10 rounded-[3.5rem] border-white/10 shadow-inner h-full overflow-y-auto no-scrollbar max-h-[85vh] relative">
                        <div className="sticky top-0 bg-slate-950/90 backdrop-blur-3xl pb-8 border-b border-white/5 mb-8 z-10">
                            <h3 className="label-caps !text-[11px] flex items-center gap-4 text-white">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-glow-matrix"></div> Ledger_Tracing
                            </h3>
                            <p className="text-[8px] text-gray-600 font-black uppercase mt-3 tracking-widest leading-loose">Real-time status of your bridge operations.</p>
                        </div>
                        <div className="space-y-4">
                            {myHistory.map(item => (
                                <div key={item.id} className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 flex justify-between items-center transition-all hover:border-brand-gold/20 hover:scale-[1.02] group">
                                    <div className="space-y-3">
                                        <p className="text-2xl font-black text-white tracking-tighter leading-none">{item.amountUbt} <span className="text-[10px] text-gray-700">UBT</span></p>
                                        <p className={`text-[9px] font-black uppercase tracking-widest ${item.status === 'VERIFIED' ? 'text-emerald-500' : 'text-brand-gold animate-pulse'}`}>{item.status}</p>
                                    </div>
                                    <div className="text-right">
                                         <p className="text-xs font-black text-gray-500 font-sans tracking-tight">${item.amountUsd.toFixed(2)}</p>
                                         <p className="text-[8px] text-gray-700 mt-2">ID: {item.id.substring(0,6)}</p>
                                    </div>
                                </div>
                            ))}
                            {myHistory.length === 0 && (
                                <div className="py-20 text-center opacity-20 space-y-4">
                                    <DatabaseIcon className="h-10 w-10 mx-auto text-gray-500" />
                                    <p className="label-caps !text-[9px] font-black uppercase tracking-[0.5em]">No_Events_Indexed</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
