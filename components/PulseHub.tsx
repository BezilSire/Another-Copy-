
import React, { useState, useEffect, useMemo } from 'react';
import { User, P2POffer, GlobalEconomy, CommunityValuePool, SellRequest, PendingUbtPurchase, AssetType } from '../types';
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
import { ConfirmationDialog } from './ConfirmationDialog';
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

const PulseChart: React.FC = () => (
    <div className="w-full h-24 relative overflow-hidden mt-2">
        <svg viewBox="0 0 400 100" className="w-full h-full opacity-30">
            <path 
                d="M0,80 Q50,70 100,85 T200,60 T300,40 T400,20 L400,100 L0,100 Z" 
                fill="url(#lineGradient)" 
            />
            <path 
                d="M0,80 Q50,70 100,85 T200,60 T300,40 T400,20" 
                fill="none" 
                stroke="#D4AF37" 
                strokeWidth="2" 
            />
            <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                </linearGradient>
            </defs>
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

    const [swapType, setSwapType] = useState<'BUY' | 'SELL'>('BUY');
    const [paymentMode, setPaymentMode] = useState<'FIAT' | 'CRYPTO'>('FIAT');
    const [cryptoAsset, setCryptoAsset] = useState<AssetType>('USDT');
    const [swapAmount, setSwapAmount] = useState('');
    const [isSwapping, setIsSwapping] = useState(false);
    
    // Bridge Flow
    const [bridgeStep, setBridgeStep] = useState<'input' | 'ussd' | 'crypto_deposit' | 'reference' | 'sync'>('input');
    const [ecocashRef, setEcocashRef] = useState('');
    const [activePurchaseId, setActivePurchaseId] = useState<string | null>(null);
    const [syncLogs, setSyncLogs] = useState<string[]>([]);
    const [isCopied, setIsCopied] = useState(false);

    const [showSellConfirmation, setShowSellConfirmation] = useState(false);
    const [mySellRequests, setMySellRequests] = useState<SellRequest[]>([]);
    const [requestToConfirmReceipt, setRequestToConfirmReceipt] = useState<SellRequest | null>(null);

    useEffect(() => {
        const unsubOffers = api.listenToP2POffers(setOffers, console.error);
        const unsubEcon = api.listenForGlobalEconomy(setEconomy, console.error);
        const unsubCvp = api.listenForCVP(user, setCvp, console.error);
        
        const unsubSell = onSnapshot(query(collection(db, 'sell_requests'), where('userId', '==', user.id)), s => {
            const data = s.docs.map(d => ({ id: d.id, ...d.data() } as SellRequest));
            setMySellRequests(data.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt)));
        });

        setIsLoading(false);
        return () => { unsubOffers(); unsubEcon(); unsubCvp(); unsubSell(); };
    }, [user.id]);

    useEffect(() => {
        if (!activePurchaseId) return;
        
        const unsub = onSnapshot(doc(db, 'pending_ubt_purchases', activePurchaseId), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as PendingUbtPurchase;
                if (data.status === 'VERIFIED') {
                    setSyncLogs(prev => [...prev, "> [SUCCESS] BLOCK VERIFIED BY NETWORK AUTHORITY.", "> [SUCCESS] ASSETS RELEASED FROM ESCROW TO NODE."]);
                    setTimeout(() => {
                        setActivePurchaseId(null);
                        setBridgeStep('input');
                        setSwapAmount('');
                        setEcocashRef('');
                        setSyncLogs([]);
                    }, 6000);
                } else if (data.status === 'REJECTED') {
                    setSyncLogs(prev => [...prev, "> [CRITICAL] HANDSHAKE REJECTED BY CONSENSUS.", "> [ERROR] REFERENCE ID INVALID OR DUPLICATE."]);
                    setTimeout(() => {
                        setActivePurchaseId(null);
                        setBridgeStep(data.payment_method === 'CRYPTO' ? 'crypto_deposit' : 'reference');
                        setSyncLogs([]);
                    }, 5000);
                } else if (data.status === 'AWAITING_CONFIRMATION') {
                    if (!syncLogs.includes("> [NETWORK] EVIDENCE DETECTED IN MEMPOOL...")) {
                        setSyncLogs(prev => [...prev, "> [NETWORK] EVIDENCE DETECTED IN MEMPOOL...", "> [PENDING] VERIFYING PROOF OF DEPOSIT..."]);
                    }
                }
            }
        });
        return () => unsub();
    }, [activePurchaseId, syncLogs]);

    const ubtPrice = economy?.ubt_to_usd_rate || 1.0;
    const estTotal = (parseFloat(swapAmount) || 0) * ubtPrice;
    const merchantCode = "031068";
    const ussdCommand = `*151*2*2*${merchantCode}*${Math.round(estTotal)}#`;

    const depositAddress = useMemo(() => {
        if (cryptoAsset === 'SOL') return economy?.system_sol_address || 'UBUNt1umSoLReserveNodeX1111111111111';
        if (cryptoAsset === 'USDT') return economy?.system_usdt_address || 'UBUNt1umUsdtReserveNodeX2222222222222';
        return economy?.system_usdc_address || 'UBUNt1umUsdcReserveNodeX3333333333333';
    }, [cryptoAsset, economy]);

    const handleSwapInitiate = async () => {
        const amt = parseFloat(swapAmount);
        if (isNaN(amt) || amt <= 0) {
            addToast("Enter a valid volume.", "error");
            return;
        }
        if (swapType === 'BUY') {
            if (paymentMode === 'FIAT') setBridgeStep('ussd');
            else setBridgeStep('crypto_deposit');
        } else {
            setShowSellConfirmation(true);
        }
    };

    const handleEcocashSubmit = async () => {
        if (!ecocashRef.trim()) {
            addToast("Reference code required.", "error");
            return;
        }
        setIsSwapping(true);
        setSyncLogs([
            "> INITIALIZING HANDSHAKE_BRIDGE...", 
            `> EVIDENCE_ANCHOR INDEXED: ${ecocashRef.toUpperCase()}`, 
            "> PLACING ASSETS INTO PROTOCOL ESCROW...",
            "> ASSETS SECURED. AWAITING NETWORK SETTLEMENT...", 
            "> STATUS: BROADCASTING PROOF TO GLOBAL NODES..."
        ]);
        try {
            const purchaseRef = await api.createPendingUbtPurchase(user, estTotal, parseFloat(swapAmount), ecocashRef.toUpperCase());
            setActivePurchaseId(purchaseRef.id);
            setBridgeStep('sync');
        } catch (e: any) {
            // FIX: Displaying actual protocol error instead of generic conflict message
            addToast(e.message || "Ledger sync failed.", "error");
            setBridgeStep('reference');
        } finally {
            setIsSwapping(false);
        }
    };

    const handleCryptoBridgeSubmit = async () => {
        setIsSwapping(true);
        setSyncLogs([
            "> ESTABLISHING QUANTUM BRIDGE...", 
            `> LISTENING FOR ${cryptoAsset} ON MAINNET...`, 
            `> TARGET_VALUE: ${estTotal.toFixed(2)} USD`,
            "> ASSETS PROVISIONED IN ESCROW.",
            "> AWAITING DEPOSIT CONFIRMATION... [LISTENING]"
        ]);
        try {
            const purchaseRef = await api.createPendingUbtPurchase(user, estTotal, parseFloat(swapAmount), undefined, cryptoAsset, depositAddress);
            setActivePurchaseId(purchaseRef.id);
            setBridgeStep('sync');
        } catch (e: any) {
            addToast("Bridge initialization failed.", "error");
            setBridgeStep('crypto_deposit');
        } finally {
            setIsSwapping(false);
        }
    };

    const handleFinalSell = async () => {
        const amt = parseFloat(swapAmount);
        if (isNaN(amt) || amt <= 0) return;
        setIsSwapping(true);
        try {
            await api.createSellRequest(user, amt, estTotal);
            addToast("Liquidation Protocol Initialized. Assets Escrowed.", "success");
            setShowSellConfirmation(false);
            setSwapAmount('');
        } catch (e) {
            addToast("Protocol failure.", "error");
        } finally {
            setIsSwapping(false);
        }
    };

    const handleCopyAddress = () => {
        navigator.clipboard.writeText(depositAddress).then(() => {
            setIsCopied(true);
            addToast("Deposit anchor copied.", "info");
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-24 px-4 font-sans">
            
            {/* TERMINAL HEADER */}
            <div className="glass-card rounded-[2.5rem] p-8 border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-gold/[0.03] to-transparent pointer-events-none"></div>
                <div className="flex-1 space-y-2 text-center md:text-left z-10">
                    <p className="label-caps !text-[10px] text-brand-gold/60 !tracking-[0.4em]">Global Index Pulse</p>
                    <div className="flex items-baseline justify-center md:justify-start gap-4">
                        <h1 className="text-6xl font-black text-white tracking-tighter gold-text">${ubtPrice.toFixed(4)}</h1>
                        <span className="text-emerald-400 font-mono text-sm font-bold animate-pulse">+2.1% Sync</span>
                    </div>
                    <PulseChart />
                </div>
                
                <div className="grid grid-cols-2 gap-4 z-10 w-full md:w-auto">
                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 text-center min-w-[140px]">
                        <p className="label-caps !text-[8px] text-gray-500 mb-1">CVP Reserve</p>
                        <p className="text-xl font-black text-white font-mono tracking-tighter">${cvp?.total_usd_value.toLocaleString() || '15,000'}</p>
                    </div>
                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 text-center min-w-[140px]">
                        <p className="label-caps !text-[8px] text-gray-500 mb-1">Supply Mirror</p>
                        <p className="text-xl font-black text-white font-mono tracking-tighter">15.0M UBT</p>
                    </div>
                </div>
            </div>

            {/* Hub Selector */}
            <div className="flex bg-slate-950/80 p-1.5 rounded-[2rem] border border-white/5 shadow-2xl w-full sm:max-w-md mx-auto">
                <button 
                    onClick={() => setView('swap')} 
                    className={`flex-1 py-4 rounded-[1.8rem] text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${view === 'swap' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Liquidity Bridge
                </button>
                <button 
                    onClick={() => setView('p2p')} 
                    className={`flex-1 py-4 rounded-[1.8rem] text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${view === 'p2p' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Social Bazaar
                </button>
            </div>

            {view === 'swap' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8 module-frame bg-slate-950/60 p-8 sm:p-12 rounded-[3.5rem] border-white/5 shadow-premium space-y-10 relative overflow-hidden">
                        <div className="corner-tl opacity-20"></div><div className="corner-tr opacity-20"></div>
                        
                        {bridgeStep === 'input' ? (
                            <div className="space-y-10 animate-fade-in">
                                <div className="flex flex-col sm:flex-row justify-between items-center border-b border-white/5 pb-8 gap-6">
                                    <div className="text-center sm:text-left">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Protocol Acquisition</h2>
                                        <p className="label-caps !text-[8px] mt-1">Node Asset Settlement</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="flex bg-black/60 p-1 rounded-xl border border-white/5">
                                            <button onClick={() => setSwapType('BUY')} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${swapType === 'BUY' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500'}`}>Acquire</button>
                                            <button onClick={() => setSwapType('SELL')} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${swapType === 'SELL' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'}`}>Liquidate</button>
                                        </div>
                                        {swapType === 'BUY' && (
                                            <div className="flex bg-black/60 p-1 rounded-xl border border-white/5">
                                                <button onClick={() => setPaymentMode('FIAT')} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${paymentMode === 'FIAT' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}>Fiat</button>
                                                <button onClick={() => setPaymentMode('CRYPTO')} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${paymentMode === 'CRYPTO' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500'}`}>Crypto</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 focus-within:border-brand-gold/30 transition-all shadow-inner">
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="label-caps !text-[10px]">Volume Required</label>
                                            <span className="text-[10px] font-bold text-gray-600 font-mono">NODE BALANCE: {(user.ubtBalance || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="number" 
                                                value={swapAmount}
                                                onChange={e => setSwapAmount(e.target.value)}
                                                className="bg-transparent border-none text-6xl font-black font-mono text-white focus:outline-none w-full placeholder-gray-900 tracking-tighter" 
                                                placeholder="0.00"
                                            />
                                            <span className="text-2xl font-black text-brand-gold font-mono tracking-tighter">UBT</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-center -my-10 relative z-20">
                                        <div className="p-3 bg-slate-900 rounded-full border border-white/10 shadow-glow-gold">
                                            <TrendingUpIcon className={`h-6 w-6 text-brand-gold transition-transform duration-500 ${swapType === 'SELL' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>

                                    <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 shadow-inner">
                                        <label className="label-caps !text-[10px] mb-4 block">Calculated Stake</label>
                                        <div className="flex justify-between items-center">
                                            <p className="text-6xl font-black font-mono text-white tracking-tighter leading-none">${estTotal.toFixed(2)}</p>
                                            <span className="text-xl font-black text-gray-700 font-mono tracking-widest uppercase">{paymentMode === 'FIAT' ? 'USD' : cryptoAsset}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-brand-gold/5 rounded-3xl border border-brand-gold/10 flex items-start gap-4">
                                    <ShieldCheckIcon className="h-5 w-5 text-brand-gold shrink-0 mt-1" />
                                    <p className="text-[9px] text-brand-gold uppercase font-black tracking-widest leading-loose">
                                        Protocol Escrow: Assets will be allocated to your node but held in verification-lock until proof of settlement is indexed.
                                    </p>
                                </div>

                                <button 
                                    onClick={handleSwapInitiate}
                                    disabled={isSwapping || !swapAmount}
                                    className={`w-full py-7 font-black rounded-3xl transition-all active:scale-95 shadow-glow-gold disabled:opacity-20 uppercase tracking-[0.4em] text-xs flex justify-center items-center gap-3 ${swapType === 'SELL' ? 'bg-red-600 text-white' : 'bg-brand-gold text-slate-950'}`}
                                >
                                    {isSwapping ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <>Initiate Signed Handshake <ShieldCheckIcon className="h-5 w-5"/></>}
                                </button>
                            </div>
                        ) : bridgeStep === 'ussd' ? (
                            <div className="space-y-10 animate-fade-in text-center py-10">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text">Settlement Command</h2>
                                    <p className="label-caps !text-gray-500">Executing Fiat Bridge</p>
                                </div>
                                <div className="bg-black/60 p-10 rounded-[3rem] border border-brand-gold/30 shadow-inner">
                                     <p className="text-[11px] font-black text-gray-600 uppercase tracking-[0.4em] mb-6">Payment Instruction</p>
                                     <p className="text-4xl font-black text-white font-mono tracking-tighter break-all">{ussdCommand}</p>
                                </div>
                                <div className="space-y-4 max-w-sm mx-auto">
                                    <a 
                                        href={`tel:${ussdCommand}`}
                                        onClick={() => setBridgeStep('reference')}
                                        className="w-full block py-6 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.3em] text-xs shadow-glow-gold active:scale-95 transition-all"
                                    >
                                        Execute USSD Pulse
                                    </a>
                                    <button onClick={() => setBridgeStep('input')} className="text-[9px] text-gray-600 font-black uppercase tracking-widest hover:text-white transition-colors">Abort & Return</button>
                                </div>
                                <p className="text-[9px] text-gray-500 uppercase leading-loose max-w-xs mx-auto">Dial the command above. Once Ecocash confirms, return here to index your proof-of-payment.</p>
                            </div>
                        ) : bridgeStep === 'reference' ? (
                            <div className="space-y-10 animate-fade-in text-center py-10">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text">Index Evidence</h2>
                                    <p className="label-caps !text-gray-500">Anchoring Handshake to Ledger</p>
                                </div>
                                <div className="space-y-6 max-w-md mx-auto">
                                    <p className="text-xs text-gray-400 uppercase font-black leading-loose">
                                        Enter the Reference ID from your Ecocash SMS to verify the settlement and release assets from escrow.
                                    </p>
                                    <input 
                                        type="text" 
                                        value={ecocashRef}
                                        onChange={e => setEcocashRef(e.target.value.toUpperCase())}
                                        className="w-full bg-black border border-white/10 p-6 rounded-3xl text-white font-mono text-center text-3xl font-black tracking-widest focus:outline-none focus:ring-1 focus:ring-brand-gold"
                                        placeholder="REF_XXXXXX"
                                        autoFocus
                                    />
                                    <button 
                                        onClick={handleEcocashSubmit}
                                        disabled={isSwapping || !ecocashRef}
                                        className="w-full py-6 bg-emerald-600 text-white font-black rounded-3xl uppercase tracking-[0.3em] text-xs shadow-glow-matrix active:scale-95 transition-all flex justify-center items-center gap-3"
                                    >
                                        {isSwapping ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <>Verify & Finalize Bridge</>}
                                    </button>
                                    <button onClick={() => setBridgeStep('ussd')} className="text-[9px] text-gray-600 font-black uppercase tracking-widest hover:text-white transition-colors">Back to USSD</button>
                                </div>
                            </div>
                        ) : bridgeStep === 'crypto_deposit' ? (
                            <div className="space-y-10 animate-fade-in text-center py-10">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text">Quantum Anchor</h2>
                                    <p className="label-caps !text-gray-500">Depositing {cryptoAsset} Stake</p>
                                </div>

                                <div className="bg-black/60 p-8 rounded-[3rem] border border-purple-500/30 shadow-inner space-y-6">
                                     <div>
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Deposit Destination</p>
                                        <div className="flex items-center gap-3 justify-center">
                                            <p className="text-sm font-mono font-bold text-white break-all select-all">{depositAddress}</p>
                                            <button onClick={handleCopyAddress} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white">
                                                {isCopied ? <ClipboardCheckIcon className="h-4 w-4 text-emerald-500" /> : <ClipboardIcon className="h-4 w-4" />}
                                            </button>
                                        </div>
                                     </div>
                                     <div className="pt-4 border-t border-white/5">
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Target Stake</p>
                                        <p className="text-3xl font-black text-white font-mono">{estTotal.toFixed(2)} {cryptoAsset}</p>
                                     </div>
                                </div>

                                <div className="space-y-4 max-w-sm mx-auto">
                                    <button 
                                        onClick={handleCryptoBridgeSubmit}
                                        className="w-full py-6 bg-purple-600 text-white font-black rounded-3xl uppercase tracking-[0.3em] text-xs shadow-glow-matrix active:scale-95 transition-all"
                                    >
                                        Initialize On-Chain Watcher
                                    </button>
                                    <button onClick={() => setBridgeStep('input')} className="text-[9px] text-gray-600 font-black uppercase tracking-widest hover:text-white transition-colors">Abort Bridge</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-12 animate-fade-in py-10 flex flex-col items-center">
                                <div className="relative">
                                    <div className="w-32 h-32 bg-brand-gold/5 rounded-full border border-brand-gold/20 flex items-center justify-center animate-pulse">
                                        <LogoIcon className="h-16 w-16 text-brand-gold animate-spin-slow" />
                                    </div>
                                    <div className="absolute inset-0 border border-brand-gold/20 rounded-full animate-ping"></div>
                                </div>
                                
                                <div className="w-full max-w-md bg-black border border-white/10 rounded-[2rem] p-8 font-mono text-[10px] text-brand-gold/80 space-y-3 shadow-inner h-64 overflow-y-auto no-scrollbar">
                                    {syncLogs.map((log, i) => <div key={i} className="animate-fade-in">{log}</div>)}
                                    <div className="w-2 h-4 bg-brand-gold animate-terminal-cursor shadow-glow-gold"></div>
                                </div>
                                
                                <div className="text-center space-y-4">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em]">Network Synchronization: Active</p>
                                    <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-full border border-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Awaiting Confirmation...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="glass-card p-8 rounded-[3rem] border-white/5 bg-slate-900/40 min-h-[500px]">
                            <h3 className="label-caps !text-[10px] mb-8 flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                                Bridge Activity
                            </h3>
                            <div className="space-y-4">
                                {mySellRequests.map(req => (
                                    <div key={req.id} className="p-5 bg-black/40 rounded-2xl border border-white/5 space-y-4 group hover:border-brand-gold/20 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xl font-black text-white font-mono tracking-tighter leading-none">{req.amountUbt} UBT</p>
                                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-2">Value: ${req.amountUsd.toFixed(2)}</p>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${req.status === 'PENDING' ? 'bg-yellow-900/20 text-yellow-500 border border-yellow-800/30' : 'bg-emerald-900/20 text-emerald-400 border border-emerald-800/30'}`}>
                                                {req.status}
                                            </span>
                                        </div>
                                        {req.status === 'DISPATCHED' && (
                                            <div className="pt-2 animate-fade-in space-y-3">
                                                <p className="text-[9px] text-emerald-400 uppercase font-black tracking-widest leading-loose">Payout Initiated. Index SMS reference to release assets.</p>
                                                <div className="p-3 bg-black rounded-xl border border-white/5 data-mono text-xs text-white break-all">{req.ecocashRef}</div>
                                                <button onClick={() => setRequestToConfirmReceipt(req)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Release Assets</button>
                                            </div>
                                        )}
                                        {req.status === 'PENDING' && (
                                             <button onClick={() => api.cancelSellRequest(user, req.id)} className="w-full py-2 text-[8px] text-gray-700 hover:text-red-500 font-black uppercase tracking-[0.3em] transition-colors">Abort Bridge</button>
                                        )}
                                    </div>
                                ))}
                                {mySellRequests.length === 0 && (
                                    <div className="py-20 text-center opacity-30">
                                        <DatabaseIcon className="h-8 w-8 mx-auto mb-4" />
                                        <p className="label-caps !text-[8px]">No Protocols Logged</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in space-y-6">
                    <div className="flex justify-between items-center px-4">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Bazaar Stream</h2>
                        <button className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                             <PlusIcon className="h-4 w-4 text-brand-gold" /> Post Ad
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {offers.map(offer => (
                            <div key={offer.id} className="module-frame bg-slate-900/60 p-6 rounded-[2.5rem] border-white/5 hover:border-brand-gold/20 transition-all flex flex-col gap-6 relative group shadow-xl">
                                <div className="corner-tl opacity-20"></div>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-800 rounded-xl border border-white/10"><UsersIcon className="h-5 w-5 text-gray-500" /></div>
                                        <div>
                                            <p className="text-[11px] font-black text-white uppercase tracking-tight">{offer.sellerName}</p>
                                            <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest">{formatTimeAgo(offer.createdAt.toDate().toISOString())}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black tracking-[0.2em] uppercase ${offer.type === 'SELL' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                        {offer.type}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-4xl font-black text-white font-mono tracking-tighter leading-none">{offer.amount} <span className="text-sm text-gray-700">UBT</span></p>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Rate: ${offer.pricePerUnit.toFixed(4)} / UNIT</p>
                                </div>

                                <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                                    <div>
                                        <p className="text-[8px] font-black text-gray-700 uppercase tracking-[0.3em] mb-1">Method</p>
                                        <p className="text-xs font-black text-brand-gold uppercase tracking-widest">{offer.paymentMethod}</p>
                                    </div>
                                    <div className="text-right">
                                         <p className="text-[8px] font-black text-gray-700 uppercase tracking-[0.3em] mb-1">Total</p>
                                         <p className="text-lg font-black text-white font-mono tracking-tighter">${offer.totalPrice.toFixed(2)}</p>
                                    </div>
                                </div>

                                <button 
                                    className="w-full py-4 bg-slate-800 hover:bg-brand-gold hover:text-slate-950 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
                                >
                                    Take Offer
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <ConfirmationDialog 
                isOpen={showSellConfirmation}
                onClose={() => setShowSellConfirmation(false)}
                onConfirm={handleFinalSell}
                title="Protocol Authorization"
                message={`Verify liquidation of ${swapAmount} UBT. Assets will be placed in protocol escrow until settlement evidence is confirmed.`}
                confirmButtonText="Authorize Dispatch"
            />

            <ConfirmationDialog 
                isOpen={!!requestToConfirmReceipt}
                onClose={() => setRequestToConfirmReceipt(null)}
                onConfirm={async () => {
                    if (!requestToConfirmReceipt) return;
                    setIsSwapping(true);
                    try {
                        await api.completeSellRequest(user, requestToConfirmReceipt);
                        addToast("Ledger Settled. Assets Released.", "success");
                        setRequestToConfirmReceipt(null);
                    } catch (e) {
                        addToast("Action failed.", "error");
                    } finally {
                        setIsSwapping(false);
                    }
                }}
                title="Verify Settlement"
                message={`Confirm receipt of $${requestToConfirmReceipt?.amountUsd.toFixed(2)} via Ecocash. This releasing assets from protocol escrow to target node.`}
                confirmButtonText="Release Assets"
            />
        </div>
    );
};
