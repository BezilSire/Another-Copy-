
import React, { useState } from 'react';
import { PendingUbtPurchase, SellRequest, Admin } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { formatTimeAgo } from '../utils';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { PhoneIcon } from './icons/PhoneIcon';

interface AdminOracleTerminalProps {
    purchases: PendingUbtPurchase[];
    liquidations: SellRequest[];
    admin: Admin;
}

export const AdminOracleTerminal: React.FC<AdminOracleTerminalProps> = ({ purchases, liquidations, admin }) => {
    const { addToast } = useToast();
    const [busyId, setBusyId] = useState<string | null>(null);
    const [sourceNode, setSourceNode] = useState<'FLOAT' | 'GENESIS'>('FLOAT');

    const handleSettleBridge = async (p: PendingUbtPurchase) => {
        const rate = (p.amountUsd / p.amountUbt).toFixed(6);
        if (!window.confirm(`AUTHORIZE SETTLEMENT: Release ${p.amountUbt} UBT to ${p.userName}? WARNING: This will force a Global Price Jump to $${rate}.`)) return;
        
        setBusyId(p.id);
        try {
            await api.approveUbtPurchase(admin, p, sourceNode);
            addToast(`SETTLEMENT_SUCCESS: Global Equilibrium re-anchored at $${rate}.`, "success");
        } catch (e: any) {
            addToast(`SETTLEMENT_ABORTED: ${e.message}`, "error");
        } finally {
            setBusyId(null);
        }
    };

    const handleRejectBridge = async (id: string) => {
        if (!window.confirm("CRITICAL: Reject this block?")) return;
        setBusyId(id);
        try {
            await api.rejectUbtPurchase(id);
            addToast("BLOCK_REJECTED", "info");
        } catch (e: any) {
            addToast("Protocol error.", "error");
        } finally {
            setBusyId(null);
        }
    };

    const handleLiquidation = async (req: SellRequest) => {
        if (req.status === 'PENDING') {
            setBusyId(req.id);
            try {
                await api.claimSellRequest(admin, req.id);
                addToast("LIQUIDATION_CLAIMED", "success");
            } finally {
                setBusyId(null);
            }
        } else if (req.status === 'CLAIMED' || req.status === 'DISPATCHED') {
            const ref = req.ecocashRef || prompt("ENTER SETTLEMENT EVIDENCE REF:");
            if (!ref) return;
            setBusyId(req.id);
            try {
                if (!req.ecocashRef) await api.dispatchSellPayment(admin, req.id, ref);
                await api.completeSellRequest(admin, req);
                addToast("LIQUIDATION_FINALIZED", "success");
            } finally {
                setBusyId(null);
            }
        }
    };

    return (
        <div className="bg-black border border-brand-gold/30 rounded-[3rem] overflow-hidden shadow-2xl font-mono text-[11px] animate-fade-in max-w-6xl mx-auto mb-20">
            {/* TERMINAL HEADER */}
            <div className="bg-brand-gold/10 p-6 border-b border-brand-gold/20 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-gold/20 rounded-2xl border border-brand-gold/30 shadow-glow-gold">
                        <DatabaseIcon className="h-5 w-5 text-brand-gold" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.4em]">Oracle Authority v5.0</h2>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Native Protocol Settlement</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-8">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-gray-500 uppercase tracking-widest mb-2">Protocol Distribution Source</span>
                        <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5 shadow-inner">
                            <button onClick={() => setSourceNode('FLOAT')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sourceNode === 'FLOAT' ? 'bg-brand-gold text-slate-950' : 'text-gray-600'}`}>Liquidity</button>
                            <button onClick={() => setSourceNode('GENESIS')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sourceNode === 'GENESIS' ? 'bg-brand-gold text-slate-950' : 'text-gray-600'}`}>Treasury</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-white/10 min-h-[600px] bg-slate-950/40">
                {/* INGRESS QUEUE */}
                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] no-scrollbar">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 font-black text-[9px] tracking-widest uppercase">Bridge_Ingress_Settlement</span>
                        <span className="text-gray-600 font-bold">{purchases.length} PENDING</span>
                    </div>

                    <div className="space-y-4">
                        {purchases.map(p => (
                            <div key={p.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.04] transition-all flex flex-col gap-6 relative group">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-brand-gold/40 group-hover:text-brand-gold transition-colors"><ShieldCheckIcon className="h-6 w-6" /></div>
                                        <div>
                                            <p className="text-white font-black uppercase text-sm tracking-tight">{p.userName}</p>
                                            <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-1">{formatTimeAgo(p.createdAt.toDate().toISOString())}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-emerald-500 font-black text-xl font-mono tracking-tighter leading-none">{p.amountUbt} UBT</p>
                                        <p className="text-gray-600 text-[10px] font-bold mt-1.5 tracking-widest">${p.amountUsd.toFixed(2)} USD</p>
                                        <p className="text-[8px] text-emerald-400 font-black mt-1">@ ${(p.amountUsd / p.amountUbt).toFixed(6)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-black/60 p-4 rounded-2xl border border-white/5 text-brand-gold font-bold tracking-[0.1em] text-[10px] truncate select-all">{p.ecocashRef || 'AWAITING_REFERENCE'}</div>
                                    <button onClick={() => handleSettleBridge(p)} disabled={!!busyId} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all flex items-center gap-2">
                                        {busyId === p.id ? <LoaderIcon className="h-4 w-4 animate-spin" /> : "SETTLE & MOVE PRICE"}
                                    </button>
                                    <button onClick={() => handleRejectBridge(p.id)} className="p-4 text-red-500 hover:text-white hover:bg-red-600 rounded-2xl transition-all">✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* EGRESS QUEUE */}
                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] no-scrollbar bg-white/[0.01]">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <span className="px-3 py-1 bg-red-500/10 text-red-500 rounded border border-red-500/20 font-black text-[9px] tracking-widest uppercase">Liquidation_Egress_Bazaar</span>
                        <span className="text-gray-600 font-bold">{liquidations.filter(r => r.status !== 'COMPLETED').length} REQS</span>
                    </div>

                    <div className="space-y-4">
                        {liquidations.filter(r => r.status !== 'COMPLETED').map(req => (
                            <div key={req.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-red-500/5 transition-all flex flex-col gap-6 group relative">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-red-500/40 group-hover:text-red-500 transition-colors"><DollarSignIcon className="h-6 w-6" /></div>
                                        <div>
                                            <p className="text-white font-black uppercase text-sm tracking-tight">{req.userName}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <PhoneIcon className="h-3 w-3 text-blue-400" />
                                                <p className="text-[10px] text-blue-400 font-bold font-mono tracking-widest">{req.userPhone}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-red-500 font-black text-xl font-mono tracking-tighter leading-none">{req.amountUbt} UBT</p>
                                        <p className="text-white text-[10px] font-black mt-1.5 tracking-widest">${req.amountUsd.toFixed(2)} USD</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Status: <span className="text-brand-gold">{req.status}</span></div>
                                    <button onClick={() => handleLiquidation(req)} disabled={!!busyId} className={`px-10 py-4 font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95 ${req.status === 'PENDING' ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-600 text-white hover:bg-red-500'}`}>
                                        {busyId === req.id ? <LoaderIcon className="h-4 w-4 animate-spin" /> : req.status === 'PENDING' ? "CLAIM" : "SETTLE"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
