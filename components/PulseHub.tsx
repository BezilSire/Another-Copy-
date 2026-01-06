
import React, { useState, useEffect, useMemo } from 'react';
import { User, GlobalEconomy, PendingUbtPurchase, TreasuryVault } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { onSnapshot, query, collection, where, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { formatTimeAgo, safeDate } from '../utils';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { InfoIcon } from './icons/InfoIcon';

interface PulseHubProps {
    user: User;
}

const getMillis = (val: any): number => {
    const d = safeDate(val);
    return d ? d.getTime() : 0;
};

// Standard Currency Formatter
const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(val);
};

const formatUBT = (val: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(val);
};

export const PulseHub: React.FC<PulseHubProps> = ({ user }) => {
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [usdInput, setUsdInput] = useState('');
    const [buyState, setBuyState] = useState<'input' | 'escrow'>('input');
    const [lastPurchaseId, setLastPurchaseId] = useState<string | null>(null);
    const [ecocashRef, setEcocashRef] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [myHistory, setMyHistory] = useState<PendingUbtPurchase[]>([]);
    const { addToast } = useToast();

    useEffect(() => {
        const unsubEcon = api.listenForGlobalEconomy(setEconomy, console.error);
        const unsubVaults = api.listenToVaults(setVaults, console.error);
        const unsubBuy = onSnapshot(query(collection(db, 'pending_ubt_purchases'), where('userId', '==', user.id), limit(10)), s => {
            const buyData = s.docs.map(d => ({ ...d.data(), id: d.id } as any));
            setMyHistory(buyData.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt)));
        });
        return () => { unsubEcon(); unsubVaults(); unsubBuy(); };
    }, [user.id]);

    const ubtPrice = economy?.ubt_to_usd_rate || 0.001;
    
    // Total Liquidity cap logic
    const totalLiquidity = 15000000;
    const circulatingFloat = vaults.find(v => v.id === 'FLOAT')?.balance || 0;

    // Calculate UBT output based on USD input
    const ubtOutput = useMemo(() => {
        const usd = parseFloat(usdInput);
        if (isNaN(usd) || usd <= 0) return 0;
        return usd / ubtPrice;
    }, [usdInput, ubtPrice]);

    const merchantCode = "031068";
    const rawUsdAmount = (parseFloat(usdInput) || 0).toFixed(2);
    const ussdString = `*151*2*2*${merchantCode}*${rawUsdAmount}#`;

    const handleBuyInit = async () => {
        const usd = parseFloat(usdInput);
        if (!usd || usd < 1) return addToast("Minimum purchase is $1.00 USD.", "error");
        
        setIsProcessing(true);
        try {
            // Explicitly pass data to ensure order creation is flawless
            const order = await api.createPendingUbtPurchase(user, usd, ubtOutput);
            setLastPurchaseId(order.id);
            setBuyState('escrow');
            addToast("Order created. Funds are now in escrow.", "success");
        } catch (e: any) {
            console.error("Order Failure:", e);
            addToast("Order failed. Protocol mismatch.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFinalize = async () => {
        if (!ecocashRef.trim()) return addToast("Please enter the Reference ID.", "error");
        if (!lastPurchaseId) return;
        
        setIsProcessing(true);
        try {
            await api.updatePendingPurchaseReference(lastPurchaseId, ecocashRef);
            addToast("Evidence linked. Oracle settlement pending.", "success");
            setBuyState('input');
            setUsdInput('');
            setEcocashRef('');
        } catch (e) {
            addToast("Failed to sync reference.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!economy) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold" />
            <p className="label-caps !text-gray-500">Syncing Oracle...</p>
        </div>
    );

    return (
        <div className="max-w-md mx-auto space-y-6 animate-fade-in pb-24 px-4 font-sans">
            
            {/* STATS HUD */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-white/5 p-5 rounded-[1.5rem] shadow-xl">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Oracle Price</p>
                    <p className="text-xl font-black text-white">${ubtPrice.toFixed(4)} <span className="text-[10px] text-gray-600">USD</span></p>
                </div>
                <div className="bg-slate-900 border border-white/5 p-5 rounded-[1.5rem] shadow-xl">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Node Liquidity</p>
                    <p className="text-xl font-black text-emerald-500">{formatUBT(circulatingFloat, 0)} <span className="text-[10px] text-gray-600">UBT</span></p>
                </div>
            </div>

            {/* MAIN PURCHASE CARD */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Buy Assets</h2>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Direct Mainnet Settlement</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl">
                        <TrendingUpIcon className="h-6 w-6 text-slate-900" />
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {buyState === 'input' ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 group focus-within:border-brand-gold transition-all">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Fiat Contribution</label>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-3xl font-black text-slate-400">$</span>
                                        <input 
                                            type="number"
                                            inputMode="decimal"
                                            value={usdInput}
                                            onChange={e => setUsdInput(e.target.value)}
                                            placeholder="0.00"
                                            className="bg-transparent border-none text-5xl font-black text-slate-950 focus:outline-none w-full !p-0 placeholder-slate-200"
                                        />
                                    </div>
                                    <span className="text-sm font-black text-slate-400 ml-4">USD</span>
                                </div>
                            </div>

                            <div className="flex justify-center -my-10 relative z-10">
                                <div className="bg-white p-3 rounded-full border border-slate-100 shadow-xl">
                                    <ArrowDownIcon className="h-5 w-5 text-slate-300" />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Quantum Allocation</label>
                                <div className="flex items-center justify-between">
                                    <p className={`text-5xl font-black ${ubtOutput > 0 ? 'text-emerald-600' : 'text-slate-200'}`}>
                                        {formatUBT(ubtOutput, 0)}
                                    </p>
                                    <span className="text-sm font-black text-slate-400 ml-4">UBT</span>
                                </div>
                            </div>

                            <button 
                                onClick={handleBuyInit}
                                disabled={isProcessing || !usdInput || parseFloat(usdInput) < 1}
                                className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all uppercase tracking-[0.4em] text-[11px] disabled:opacity-30 flex justify-center items-center gap-3"
                            >
                                {isProcessing ? <LoaderIcon className="h-5 w-5 animate-spin" /> : "Initiate Protocol"}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] text-center">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-4">Funds in Escrow</p>
                                <p className="text-4xl font-black text-slate-950 font-mono tracking-tighter">{ussdString}</p>
                                <div className="grid grid-cols-2 gap-3 mt-6">
                                    <button 
                                        onClick={() => {
                                            window.location.href = `tel:${ussdString.replace(/#/g, '%23')}`;
                                            addToast("Dialing...", "info");
                                        }}
                                        className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95"
                                    >
                                        <PhoneIcon className="h-4 w-4" /> Dial
                                    </button>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(ussdString);
                                            setIsCopied(true);
                                            setTimeout(() => setIsCopied(false), 2000);
                                        }}
                                        className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95"
                                    >
                                        {isCopied ? <ClipboardCheckIcon className="h-4 w-4 text-emerald-500" /> : <ClipboardIcon className="h-4 w-4" />}
                                        {isCopied ? "Copied" : "Copy"}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex gap-4 items-start">
                                <InfoIcon className="h-5 w-5 text-blue-500 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-blue-900 uppercase">Instructions</p>
                                    <p className="text-[11px] text-blue-800 leading-relaxed font-medium">Dial the code above to pay via Ecocash. After payment, enter the <strong className="text-blue-950 underline">Reference ID</strong> from your SMS below to notify the Oracle for settlement.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ecocash Reference ID</label>
                                <input 
                                    type="text"
                                    value={ecocashRef}
                                    onChange={e => setEcocashRef(e.target.value.toUpperCase())}
                                    placeholder="PASTE_REF_HERE"
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-slate-950 font-mono text-center text-xl tracking-[0.2em] focus:border-slate-900 outline-none transition-all placeholder-slate-200"
                                />
                            </div>

                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={handleFinalize}
                                    disabled={isProcessing || !ecocashRef}
                                    className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all uppercase tracking-[0.4em] text-[11px]"
                                >
                                    {isProcessing ? <LoaderIcon className="h-5 w-5 animate-spin" /> : "Verify Settlement"}
                                </button>
                                <button onClick={() => setBuyState('input')} className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Discard Order</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ORDER HISTORY */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Temporal Ledger</h3>
                </div>
                
                <div className="space-y-3">
                    {myHistory.map(item => (
                        <div key={item.id} className="bg-slate-900/50 border border-white/5 p-5 rounded-[1.5rem] flex justify-between items-center transition-all hover:bg-slate-900">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${item.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand-gold/10 text-brand-gold animate-pulse'}`}>
                                    <DatabaseIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white">{formatUBT(item.amountUbt, 0)} UBT</p>
                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{formatTimeAgo(item.createdAt)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-black text-gray-300">{formatUSD(item.amountUsd)}</p>
                                <p className={`text-[8px] font-black uppercase tracking-widest mt-1.5 ${item.status === 'VERIFIED' ? 'text-emerald-500' : 'text-brand-gold'}`}>{item.status}</p>
                            </div>
                        </div>
                    ))}
                    {myHistory.length === 0 && (
                        <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-[2rem] opacity-20">
                            <p className="text-[10px] font-black uppercase tracking-widest">No protocol dispatches found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
