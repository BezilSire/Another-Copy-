
import React, { useState } from 'react';
import { SellRequest, Admin } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { formatTimeAgo } from '../utils';

interface LiquidationOracleAdminProps {
    requests: SellRequest[];
    adminUser: Admin;
}

export const LiquidationOracleAdmin: React.FC<LiquidationOracleAdminProps> = ({ requests, adminUser }) => {
    const { addToast } = useToast();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [ecocashRef, setEcocashRef] = useState<Record<string, string>>({});

    const handleClaim = async (requestId: string) => {
        setProcessingId(requestId);
        try {
            await api.claimSellRequest(adminUser, requestId);
            addToast("Protocol claimed by Treasury.", "success");
        } catch (e: any) {
            console.error("Claim error:", e);
            addToast(`AUTHORIZATION FAILED: ${e.message || 'Protocol failure.'}`, "error");
        } finally {
            setProcessingId(null);
        }
    };

    const handleDispatch = async (requestId: string) => {
        const ref = ecocashRef[requestId];
        if (!ref?.trim()) {
            addToast("Reference code required for Treasury settlement.", "error");
            return;
        }
        setProcessingId(requestId);
        try {
            await api.dispatchSellPayment(adminUser, requestId, ref);
            addToast("Funds dispatched from Treasury. Awaiting member verify.", "success");
        } catch (e: any) {
            console.error("Dispatch error:", e);
            addToast(`SETTLEMENT FAILED: ${e.message || 'Protocol failure.'}`, "error");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="glass-card p-10 rounded-[3rem] border-white/5 animate-fade-in">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 gold-text">Treasury Liquidation Queue</h2>
            
            <div className="space-y-4">
                {requests.map(req => (
                    <div key={req.id} className="bg-slate-950/60 p-6 rounded-[2rem] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-red-500/20 transition-all">
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{req.userName}</span>
                                <span className="text-[9px] text-gray-600 font-mono">{formatTimeAgo(req.createdAt.toDate().toISOString())}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${req.status === 'PENDING' ? 'bg-yellow-900/20 text-yellow-500' : 'bg-blue-900/20 text-blue-400'}`}>
                                    {req.status}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-4">
                                <p className="text-3xl font-black text-white font-mono tracking-tighter">{req.amountUbt} UBT</p>
                                <p className="text-sm font-black text-red-500 font-mono">&rarr; ${req.amountUsd.toFixed(2)}</p>
                            </div>
                            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Ecocash Number</p>
                                    <p className="text-sm font-mono text-white select-all">{req.userPhone}</p>
                                </div>
                                {req.claimerName && (
                                    <div>
                                        <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Protocol Handler</p>
                                        <p className="text-sm font-black text-blue-400 uppercase">{req.claimerName} ({req.claimerRole})</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="w-full md:w-auto">
                            {req.status === 'PENDING' ? (
                                <button 
                                    onClick={() => handleClaim(req.id)}
                                    disabled={!!processingId}
                                    className="w-full px-8 py-4 bg-slate-900 border border-brand-gold/20 hover:border-brand-gold text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg disabled:opacity-50"
                                >
                                    {processingId === req.id ? <LoaderIcon className="h-4 w-4 animate-spin"/> : "Claim as Treasury"}
                                </button>
                            ) : req.status === 'CLAIMED' && req.claimerId === adminUser.id ? (
                                <div className="space-y-3">
                                    <input 
                                        type="text" 
                                        placeholder="TREASURY REF CODE"
                                        value={ecocashRef[req.id] || ''}
                                        onChange={e => setEcocashRef(prev => ({...prev, [req.id]: e.target.value.toUpperCase()}))}
                                        className="w-full bg-slate-950 border border-white/10 p-3 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                    <button 
                                        onClick={() => handleDispatch(req.id)}
                                        disabled={!!processingId}
                                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {processingId === req.id ? <LoaderIcon className="h-4 w-4 animate-spin"/> : "Settle & Notify"}
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 bg-white/5 rounded-2xl text-center">
                                    <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest">Protocol in progress...</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {requests.length === 0 && (
                    <div className="text-center py-20">
                        <LoaderIcon className="h-10 w-10 text-gray-800 mx-auto mb-4" />
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.4em]">No Liquidation Protocols Pending</p>
                    </div>
                )}
            </div>
        </div>
    );
};
