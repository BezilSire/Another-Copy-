
import React, { useState } from 'react';
import { PendingUbtPurchase, Admin } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { formatTimeAgo } from '../utils';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';

interface AdminOracleTerminalProps {
    purchases: PendingUbtPurchase[];
    admin: Admin;
}

export const AdminOracleTerminal: React.FC<AdminOracleTerminalProps> = ({ purchases, admin }) => {
    const { addToast } = useToast();
    const [busyId, setBusyId] = useState<string | null>(null);
    const [sourceNode, setSourceNode] = useState<'FLOAT' | 'GENESIS'>('FLOAT');

    const handleSettleBridge = async (p: PendingUbtPurchase) => {
        if (!window.confirm(`AUTHORIZE SETTLEMENT: Transfer ${p.amountUbt} UBT to citizen ${p.userName}?`)) return;
        
        setBusyId(p.id);
        try {
            await api.approveUbtPurchase(admin, p, sourceNode);
            addToast(`HANDSHAKE_SETTLED via ${sourceNode}`, "success");
        } catch (e: any) {
            addToast(`SETTLEMENT_ABORTED: ${e.message}`, "error");
        } finally {
            setBusyId(null);
        }
    };

    const handleRejectBridge = async (id: string) => {
        if (!window.confirm("CRITICAL: Reject this block? This will blacklist the associated reference anchor.")) return;
        setBusyId(id);
        try {
            await api.rejectUbtPurchase(id);
            addToast("BLOCK_REJECTED", "info");
        } catch (e: any) {
            addToast("Protocol error rejecting block.", "error");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="bg-black border border-brand-gold/30 rounded-[3rem] overflow-hidden shadow-2xl font-mono text-[11px] animate-fade-in max-w-4xl mx-auto mb-20">
            <div className="bg-brand-gold/10 p-6 border-b border-brand-gold/20 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-gold/20 rounded-2xl border border-brand-gold/30 shadow-glow-gold">
                        <DatabaseIcon className="h-5 w-5 text-brand-gold" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.4em]">Oracle Terminal v5.0</h2>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Settlement Engine Active</p>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-gray-500 uppercase tracking-widest mb-2">Protocol Source Node</span>
                        <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5 shadow-inner">
                            <button onClick={() => setSourceNode('FLOAT')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sourceNode === 'FLOAT' ? 'bg-brand-gold text-slate-950' : 'text-gray-600'}`}>Liquidity</button>
                            <button onClick={() => setSourceNode('GENESIS')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sourceNode === 'GENESIS' ? 'bg-brand-gold text-slate-950' : 'text-gray-600'}`}>Treasury</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-8 min-h-[400px] bg-slate-950/40">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 font-black text-[9px] tracking-widest uppercase">Bridge_Ingress</span>
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
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-black/60 p-4 rounded-2xl border border-white/5 text-brand-gold font-bold tracking-[0.1em] text-[10px] truncate select-all">{p.ecocashRef || 'AWAITING_REF'}</div>
                                <button onClick={() => handleSettleBridge(p)} disabled={!!busyId} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all flex items-center gap-2">
                                    {busyId === p.id ? <LoaderIcon className="h-4 w-4 animate-spin" /> : "SETTLE"}
                                </button>
                                <button onClick={() => handleRejectBridge(p.id)} className="p-4 text-red-500 hover:text-white hover:bg-red-600 rounded-2xl transition-all">✕</button>
                            </div>
                        </div>
                    ))}
                    {purchases.length === 0 && (
                        <div className="text-center py-32 opacity-30">
                            <DatabaseIcon className="h-16 w-16 text-gray-800 mx-auto mb-6" />
                            <p className="label-caps !text-[12px] !tracking-[0.6em]">No Bridge Handshakes Pending</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
