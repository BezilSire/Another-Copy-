
import React, { useState } from 'react';
import { PendingUbtPurchase, Admin } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { formatTimeAgo } from '../utils';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface AdminOracleTerminalProps {
    purchases: PendingUbtPurchase[];
    admin: Admin;
}

export const AdminOracleTerminal: React.FC<AdminOracleTerminalProps> = ({ purchases, admin }) => {
    const { addToast } = useToast();
    const [busyId, setBusyId] = useState<string | null>(null);
    const [sourceNode, setSourceNode] = useState<'FLOAT' | 'GENESIS'>('FLOAT');

    const handleSettleBridge = async (p: PendingUbtPurchase) => {
        if (!window.confirm(`AUTHORIZE SETTLEMENT: Transfer ${p.amountUbt} UBT from ${sourceNode} Node to citizen ${p.userName}?`)) return;
        
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
        if (!window.confirm("CRITICAL: Reject this block? This will blacklist the associated reference anchor and expunge it from the active queue.")) return;
        
        setBusyId(id);
        try {
            await api.rejectUbtPurchase(id);
            addToast("BLOCK_EXPUNGED: Rejection finalized.", "info");
        } catch (e: any) {
            console.error("Rejection error:", e);
            addToast("PROTOCOL_ERROR: Rejection sequence failed.", "error");
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
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.4em]">Oracle Terminal v5.1</h2>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Sovereign Settlement Engine</p>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-gray-500 uppercase tracking-widest mb-2">Internal Liquid Node</span>
                        <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5 shadow-inner">
                            <button onClick={() => setSourceNode('FLOAT')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sourceNode === 'FLOAT' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-600'}`}>Float</button>
                            <button onClick={() => setSourceNode('GENESIS')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sourceNode === 'GENESIS' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-600'}`}>Genesis</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-8 min-h-[400px] bg-slate-950/40">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="font-black text-[9px] text-gray-400 tracking-widest uppercase">Awaiting_Manual_Sovereign_Handshake</span>
                    </div>
                    <span className="text-gray-600 font-bold tracking-widest">{purchases.length} PENDING</span>
                </div>

                <div className="space-y-6">
                    {purchases.map(p => (
                        <div key={p.id} className={`p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col gap-8 relative group overflow-hidden ${busyId === p.id ? 'bg-white/5 border-brand-gold/40' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                            
                            {/* Header Section */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-brand-gold/40 group-hover:text-brand-gold transition-colors shadow-inner">
                                        <ShieldCheckIcon className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <p className="text-white font-black uppercase text-base tracking-tight leading-none mb-2">{p.userName}</p>
                                        <div className="flex items-center gap-3">
                                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{formatTimeAgo(p.createdAt.toDate().toISOString())}</p>
                                            <span className="text-[8px] text-emerald-500/50 px-2 py-0.5 rounded border border-emerald-500/20">PEER_SYNCED</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-emerald-500 font-black text-3xl font-mono tracking-tighter leading-none">{p.amountUbt} <span className="text-xs">UBT</span></p>
                                    <p className="text-gray-500 text-[10px] font-black mt-3 tracking-[0.2em]">VALUATION: ${p.amountUsd.toFixed(2)} USD</p>
                                </div>
                            </div>

                            {/* Anchor Section */}
                            <div className="p-6 bg-black/60 rounded-[1.5rem] border border-white/5 shadow-inner relative group/anchor">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.3em]">External Settlement Reference</p>
                                    <p className="text-[8px] text-brand-gold/40 font-black uppercase tracking-widest group-hover/anchor:text-brand-gold transition-colors">Immutable Anchor</p>
                                </div>
                                <p className="text-xl font-mono text-brand-gold font-black break-all select-all tracking-widest text-center py-2 uppercase">
                                    {p.ecocashRef || p.cryptoAddress || 'NULL_REFERENCE'}
                                </p>
                            </div>

                            {/* Authority Actions */}
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <button 
                                    onClick={() => handleSettleBridge(p)} 
                                    disabled={!!busyId} 
                                    className="flex-1 w-full py-5 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-20 disabled:grayscale"
                                >
                                    {busyId === p.id ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <><ShieldCheckIcon className="h-5 w-5"/> Authorize Settlement</>}
                                </button>
                                
                                <button 
                                    onClick={() => handleRejectBridge(p.id)}
                                    disabled={!!busyId}
                                    className="w-full sm:w-auto px-10 py-5 bg-red-950/20 hover:bg-red-600 text-red-500 hover:text-white font-black rounded-2xl uppercase tracking-widest text-[9px] border border-red-900/30 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-20"
                                >
                                    {busyId === p.id ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <><XCircleIcon className="h-4 w-4" /> Reject block</>}
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {purchases.length === 0 && (
                        <div className="text-center py-40 animate-pulse">
                            <DatabaseIcon className="h-16 w-16 text-gray-800 mx-auto mb-6" />
                            <p className="label-caps !text-[12px] !tracking-[0.6em] text-gray-700">No Bridge Handshakes Indexed</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 bg-brand-gold/5 border-t border-brand-gold/10 text-center">
                 <p className="text-[8px] text-gray-600 uppercase font-black tracking-[0.5em] leading-loose">
                    Oracle Access Level 5 &bull; ROOT_AUTH_ENABLED &bull; SYNC_FREQUENCY 8000ms
                 </p>
            </div>
        </div>
    );
};
