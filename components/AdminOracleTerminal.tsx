
import React, { useState } from 'react';
import { PendingUbtPurchase, SellRequest, Admin } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { formatTimeAgo } from '../utils';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { GlobeIcon } from './icons/GlobeIcon';

interface AdminOracleTerminalProps {
    purchases: PendingUbtPurchase[];
    liquidations: SellRequest[];
    admin: Admin;
}

export const AdminOracleTerminal: React.FC<AdminOracleTerminalProps> = ({ purchases, liquidations, admin }) => {
    const { addToast } = useToast();
    const [busyId, setBusyId] = useState<string | null>(null);

    const handleSettleBridge = async (p: PendingUbtPurchase) => {
        if (!window.confirm(`SETTLE HANDSHAKE: Release ${p.amountUbt} UBT to ${p.userName}?`)) return;
        setBusyId(p.id);
        try {
            await api.approveUbtPurchase(admin, p);
            addToast(`BLOCK_${p.id.substring(0,8)}: SETTLED`, "success");
        } catch (e: any) {
            addToast(`FAIL: ${e.message}`, "error");
        } finally {
            setBusyId(null);
        }
    };

    const handleRejectBridge = async (id: string) => {
        setBusyId(id);
        try {
            await api.rejectUbtPurchase(id);
            addToast("BLOCK REJECTED", "info");
        } finally {
            setBusyId(null);
        }
    };

    const handleLiquidation = async (req: SellRequest) => {
        if (req.status === 'PENDING') {
            setBusyId(req.id);
            try {
                await api.claimSellRequest(admin, req.id);
                addToast("LIQUIDATION CLAIMED", "success");
            } finally {
                setBusyId(null);
            }
        } else if (req.status === 'CLAIMED' || req.status === 'DISPATCHED') {
            const ref = req.ecocashRef || prompt("ENTER SETTLEMENT REFERENCE:");
            if (!ref) return;
            setBusyId(req.id);
            try {
                if (!req.ecocashRef) await api.dispatchSellPayment(admin, req.id, ref);
                await api.completeSellRequest(admin, req);
                addToast("LIQUIDATION FINALIZED", "success");
            } finally {
                setBusyId(null);
            }
        }
    };

    return (
        <div className="bg-black border border-brand-gold/30 rounded-3xl overflow-hidden shadow-2xl font-mono text-[11px] animate-fade-in max-w-6xl mx-auto">
            {/* TERMINAL HEADER */}
            <div className="bg-brand-gold/10 p-5 border-b border-brand-gold/20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <DatabaseIcon className="h-4 w-4 text-brand-gold" />
                    <h2 className="text-xs font-black text-white uppercase tracking-[0.4em]">Identity Oracle Terminal v4.0</h2>
                </div>
                <div className="flex gap-6 items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-gray-500">CONSENSUS_READY</span>
                    </div>
                    <span className="text-brand-gold opacity-60">AUTH: {admin.name.toUpperCase()}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-white/10 min-h-[600px]">
                
                {/* BRIDGE - BUYING UBT */}
                <div className="p-6 space-y-6 bg-slate-950/40">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 font-black">BRIDGE_INGRESS</span>
                        <span className="text-gray-600">{purchases.length} REQS</span>
                    </div>

                    <div className="space-y-3">
                        {purchases.map(p => (
                            <div key={p.id} className="p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/[0.08] transition-all flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-white font-black uppercase text-sm">{p.userName}</p>
                                        <p className="text-[9px] text-gray-500 mt-1">{formatTimeAgo(p.createdAt.toDate().toISOString())}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-emerald-500 font-black text-sm">{p.amountUbt} UBT</p>
                                        <p className="text-gray-500 text-[10px]">${p.amountUsd.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-black/60 p-3 rounded-lg border border-white/5 text-brand-gold font-bold tracking-widest text-[10px] truncate select-all">
                                        {p.ecocashRef || p.cryptoAddress}
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleSettleBridge(p)}
                                            disabled={!!busyId}
                                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg uppercase disabled:opacity-20 shadow-lg"
                                        >
                                            {busyId === p.id ? "SYNC..." : "SETTLE"}
                                        </button>
                                        <button 
                                            onClick={() => handleRejectBridge(p.id)}
                                            disabled={!!busyId}
                                            className="p-3 bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {purchases.length === 0 && <div className="py-20 text-center text-gray-700 uppercase tracking-widest opacity-20">Ingress Idle</div>}
                    </div>
                </div>

                {/* LIQUIDATION - SELLING UBT */}
                <div className="p-6 space-y-6 bg-slate-900/20">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <span className="px-3 py-1 bg-red-500/10 text-red-500 rounded border border-red-500/20 font-black">LIQUIDATION_EGRESS</span>
                        <span className="text-gray-600">{liquidations.filter(r => r.status !== 'COMPLETED').length} REQS</span>
                    </div>

                    <div className="space-y-3">
                        {liquidations.filter(r => r.status !== 'COMPLETED').map(req => (
                            <div key={req.id} className="p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-red-500/5 transition-all flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-white font-black uppercase text-sm">{req.userName}</p>
                                        <p className="text-[10px] text-blue-400 font-bold mt-1">{req.userPhone}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-red-500 font-black text-sm">{req.amountUbt} UBT</p>
                                        <p className="text-white text-[10px] font-black">${req.amountUsd.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
                                        Status: <span className={req.status === 'PENDING' ? 'text-yellow-500' : 'text-blue-400'}>{req.status}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleLiquidation(req)}
                                        disabled={!!busyId}
                                        className={`px-8 py-3 font-black rounded-lg uppercase shadow-lg transition-all ${req.status === 'PENDING' ? 'bg-slate-800 text-white' : 'bg-red-600 text-white hover:bg-red-500'}`}
                                    >
                                        {busyId === req.id ? "SYNC..." : req.status === 'PENDING' ? "CLAIM" : "SETTLE"}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {liquidations.filter(r => r.status !== 'COMPLETED').length === 0 && <div className="py-20 text-center text-gray-700 uppercase tracking-widest opacity-20">Egress Idle</div>}
                    </div>
                </div>

            </div>

            <div className="bg-black p-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-[8px] text-gray-700 uppercase tracking-[0.5em]">Ledger State: Immutable</span>
                <div className="flex items-center gap-4">
                    <GlobeIcon className="h-3 w-3 text-gray-700" />
                    <span className="text-[8px] text-gray-700 uppercase tracking-[0.5em]">Network Mainnet v4.0.1</span>
                </div>
            </div>
        </div>
    );
};
