
import React, { useState, useEffect, useMemo } from 'react';
import { User, GlobalEconomy, PendingUbtPurchase, UbtTransaction, TreasuryVault } from '../types';
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
import { OracleHUD } from './OracleHUD';
import { InfoIcon } from './icons/InfoIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ArrowDownLeftIcon } from './icons/ArrowDownLeftIcon';

interface PulseHubProps {
    user: User;
}

const getMillis = (val: any): number => {
    const d = safeDate(val);
    return d ? d.getTime() : 0;
};

// Helper for formatted currency
const formatCurrency = (val: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(val);
};

export const PulseHub: React.FC<PulseHubProps> = ({ user }) => {
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [ledger, setLedger] = useState<UbtTransaction[]>([]);
    const [usdInput, setUsdInput] = useState('');
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
        api.getPublicLedger(50).then(setLedger);
        const unsubBuy = onSnapshot(query(collection(db, 'pending_ubt_purchases'), where('userId', '==', user.id), limit(10)), s => {
            const buyData = s.docs.map(d => ({ ...d.data(), id: d.id } as any));
            setMyHistory(buyData.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt)));
        });
        return () => { unsubEcon(); unsubVaults(); unsubBuy(); };
    }, [user.id]);

    const metrics = useMemo(() => {
        const floatVault = vaults.find(v => v.id === 'FLOAT');
        const circulating = floatVault?.balance || 0;
        const price = economy?.ubt_to_usd_rate || 0.001;
        return { circulating, price, marketCap: circulating * price };
    }, [vaults, economy]);

    // Derived: How much UBT the user gets for their USD input
    const ubtOutput = useMemo(() => {
        const val = parseFloat(usdInput);
        if (isNaN(val) || val <= 0) return 0;
        return val / metrics.price;
    }, [usdInput, metrics.price]);

    const merchantCode = "031068";
    // Dialer strings must NOT have commas
    const ussdString = `*151*2*2*${merchantCode}*${(parseFloat(usdInput) || 0).toFixed(2)}#`;

    const initiateHandshake = async () => {
        const valUsd = parseFloat(usdInput);
        if (!valUsd || valUsd < 1) return addToast("Minimum entry is $1.00 USD.", "error");
        setIsProcessing(true);
        try {
            const purchaseDoc = await api.createPendingUbtPurchase(user, valUsd, ubtOutput);
            setLastPurchaseId(purchaseDoc.id);
            setHandshakeState('escrow');
            // Dialing protocol (encoded for browser safety)
            window.location.href = `tel:${ussdString.replace(/#/g, '%23')}`;
            addToast("Handshake Dispatched.", "success");
        } catch (e) {
            addToast("Protocol Link Interrupted.", "error");
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
            addToast("State Update Buffered.", "success");
            setHandshakeState('input');
            setUsdInput('');
            setEcocashRef('');
        } catch (e) {
            addToast("Anchor Failed.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-8 animate-fade-in pb-32 px-4 font-sans">
            
            {/* COMPACT ORACLE STATUS */}
            <OracleHUD user={user} />

            {/* MARKET METRICS GRID */}
            <div className="grid grid-cols-3 gap-3">
                <MetricTile label="Price" value={`$${metrics.price.toFixed(4)}`} color="text-brand-gold" />
                <MetricTile label="Circ. Float" value={formatCurrency(metrics.circulating, 0)} color="text-white" />
                <MetricTile label="Network Cap" value={`$${formatCurrency(metrics.marketCap, 0)}`} color="text-emerald-500" />
            </div>

            {/* MAIN EXCHANGE CARD */}
            <div className="module-frame bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-premium overflow-hidden">
                <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <TrendingUpIcon className="h-5 w-5 text-brand-gold" />
                        Asset Acquisition
                    </h2>
                </div>

                <div className="p-8 space-y-6">
                    {handshakeState === 'input' ? (
                        <div className="space-y-6 animate-fade-in">
                            {/* YOU PAY (USD) */}
                            <div className="bg-black/40 p-6 rounded-3xl border border-white/5 space-y-2 group focus-within:border-brand-gold/30 transition-all">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">You Pay</p>
                                <div className="flex items-center justify-between">
                                    <input 
                                        type="number"
                                        inputMode="decimal"
                                        value={usdInput}
                                        onChange={e => setUsdInput(e.target.value)}
                                        placeholder="0.00"
                                        className="bg-transparent border-none text-4xl font-black text-white focus:outline-none w-full placeholder-gray-800"
                                    />
                                    <span className="text-xl font-black text-white ml-4">USD</span>
                                </div>
                            </div>

                            {/* DIVIDER ICON */}
                            <div className="flex justify-center -my-3 relative z-10">
                                <div className="p-3 bg-slate-900 rounded-2xl border border-white/10 text-brand-gold shadow-xl">
                                    <ArrowDownLeftIcon className="h-5 w-5" />
                                </div>
                            </div>

                            {/* YOU RECEIVE (UBT) */}
                            <div className="bg-black/40 p-6 rounded-3xl border border-white/5 space-y-2">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">You Receive</p>
                                <div className="flex items-center justify-between">
                                    <p className={`text-4xl font-black ${ubtOutput > 0 ? 'text-emerald-500' : 'text-gray-800'}`}>
                                        {formatCurrency(ubtOutput, 2)}
                                    </p>
                                    <span className="text-xl font-black text-brand-gold ml-4">UBT</span>
                                </div>
                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-2">
                                    Estimated output at current Oracle parity
                                </p>
                            </div>

                            <button 
                                onClick={initiateHandshake}
                                disabled={isProcessing || !usdInput || parseFloat(usdInput) < 1}
                                className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-[1.8rem] shadow-glow-gold active:scale-95 transition-all uppercase tracking-[0.4em] text-[11px] flex justify-center items-center gap-3 disabled:opacity-30"
                            >
                                {isProcessing ? <LoaderIcon className="h-5 w-5 animate-spin"/> : "Initiate Settlement"}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in text-center">
                            <div className="p-6 bg-emerald-950/20 border border-emerald-500/20 rounded-3xl">
                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-4">Dial Sequence Authorized</p>
                                <p className="text-4xl font-black text-white font-mono tracking-tighter leading-none">{ussdString}</p>
                                <div className="flex justify-center gap-4 mt-6">
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(ussdString);
                                            setIsCopied(true);
                                            setTimeout(() => setIsCopied(false), 2000);
                                        }}
                                        className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all"
                                    >
                                        {isCopied ? "Copied" : "Copy Sequence"}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 text-left">
                                <label className="label-caps !text-[9px] text-gray-500 ml-1">Ecocash Reference Anchor</label>
                                <input 
                                    type="text"
                                    value={ecocashRef}
                                    onChange={e => setEcocashRef(e.target.value.toUpperCase())}
                                    placeholder="PASTE_REF_HERE"
                                    className="w-full bg-black border border-white/10 p-5 rounded-2xl text-white font-mono text-center text-xl tracking-[0.4em] focus:border-brand-gold outline-none"
                                />
                                <p className="text-[8px] text-gray-600 text-center uppercase font-black tracking-widest px-4 leading-relaxed">
                                    Enter the alphanumeric Reference ID from your confirmation SMS to complete the block.
                                </p>
                            </div>

                            <button 
                                onClick={finalizeHandshake}
                                disabled={isProcessing || !ecocashRef}
                                className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-3xl shadow-glow-gold active:scale-95 transition-all uppercase tracking-[0.4em] text-[11px]"
                            >
                                {isProcessing ? <LoaderIcon className="h-5 w-5 animate-spin"/> : "Finalize Anchor"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* TRACE HISTORY */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-glow-matrix"></div>
                    <h3 className="label-caps !text-[11px] text-gray-500">Node Ingress Ledger</h3>
                </div>

                <div className="space-y-3">
                    {myHistory.map(item => (
                        <div key={item.id} className="module-frame bg-slate-900/40 p-5 rounded-[1.8rem] border border-white/5 flex justify-between items-center group transition-all hover:border-white/10">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl border border-white/5 ${item.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand-gold/10 text-brand-gold animate-pulse'}`}>
                                    <DatabaseIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white leading-none mb-1">{item.amountUbt.toLocaleString()} UBT</p>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{formatTimeAgo(item.createdAt)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-black text-gray-400 font-mono">${formatCurrency(item.amountUsd)}</p>
                                <p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${item.status === 'VERIFIED' ? 'text-emerald-500' : 'text-brand-gold'}`}>{item.status}</p>
                            </div>
                        </div>
                    ))}
                    {myHistory.length === 0 && (
                        <div className="py-20 text-center opacity-20">
                            <DatabaseIcon className="h-12 w-12 mx-auto mb-4" />
                            <p className="label-caps !text-[10px] tracking-[0.5em]">No_Events_Indexed</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MetricTile = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="module-frame bg-slate-900/60 p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center">
        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1.5">{label}</p>
        <p className={`text-sm font-black font-mono tracking-tight ${color}`}>{value}</p>
    </div>
);
