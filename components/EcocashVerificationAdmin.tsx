
import React from 'react';
import { PendingUbtPurchase, Admin } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { formatTimeAgo } from '../utils';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { GlobeIcon } from './icons/GlobeIcon';

interface BridgeVerificationAdminProps {
    purchases: PendingUbtPurchase[];
    adminUser: Admin;
}

export const BridgeVerificationAdmin: React.FC<BridgeVerificationAdminProps> = ({ purchases, adminUser }) => {
    const { addToast } = useToast();
    const [processingId, setProcessingId] = React.useState<string | null>(null);

    const handleApprove = async (purchase: PendingUbtPurchase) => {
        const methodLabel = purchase.payment_method === 'CRYPTO' ? `${purchase.cryptoAsset} On-chain` : 'Ecocash Handshake';
        if (!window.confirm(`Settle ${methodLabel}? Release ${purchase.amountUbt} UBT to node ${purchase.userName}?`)) return;
        setProcessingId(purchase.id);
        try {
            // FIX: Added 'FLOAT' as default sourceVaultId to satisfy 3-argument signature
            await api.approveUbtPurchase(adminUser, purchase, 'FLOAT');
            addToast("Ledger Settled. Assets Distributed.", "success");
        } catch (e) {
            addToast("Protocol failure.", "error");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!window.confirm("Reject Block? This reference ID will be blacklisted.")) return;
        setProcessingId(id);
        try {
            await api.rejectUbtPurchase(id);
            addToast("Block Rejected.", "info");
        } catch (e) {
            addToast("Error rejecting.", "error");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="module-frame glass-module p-10 rounded-[3.5rem] border-white/10 shadow-premium animate-fade-in relative overflow-hidden">
            <div className="corner-tl"></div><div className="corner-tr"></div>
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <DatabaseIcon className="h-32 w-32 text-brand-gold" />
            </div>
            
            <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8 relative z-10">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text leading-none">Settlement Bridge</h2>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] mt-3">Awaiting Authority Verification</p>
                </div>
                <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{purchases.length} PENDING BLOCKS</span>
                </div>
            </div>
            
            <div className="space-y-6 relative z-10">
                {purchases.map(purchase => (
                    <div key={purchase.id} className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/5 flex flex-col lg:flex-row justify-between items-center gap-10 group hover:border-brand-gold/30 transition-all shadow-xl">
                        <div className="flex-1 space-y-6 w-full lg:w-auto">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-gray-600 group-hover:text-brand-gold transition-colors">
                                    {purchase.payment_method === 'CRYPTO' ? <GlobeIcon className="h-6 w-6" /> : <ShieldCheckIcon className="h-6 w-6" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-black text-white uppercase tracking-tight truncate">{purchase.userName}</p>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${purchase.payment_method === 'CRYPTO' ? 'bg-purple-900/40 text-purple-400 border border-purple-800/30' : 'bg-blue-900/40 text-blue-400 border border-blue-800/30'}`}>
                                            {purchase.payment_method === 'CRYPTO' ? purchase.cryptoAsset : 'Ecocash'}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-1">{formatTimeAgo(purchase.createdAt.toDate().toISOString())}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6 border-t border-white/5 pt-6">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Quantum Volume</p>
                                    <p className="text-3xl font-black text-white font-mono tracking-tighter">{purchase.amountUbt} <span className="text-sm text-gray-700">UBT</span></p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Target Value</p>
                                    <p className="text-3xl font-black text-emerald-500 font-mono tracking-tighter">${purchase.amountUsd.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-black rounded-2xl border border-white/5 shadow-inner">
                                <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">
                                    {purchase.payment_method === 'CRYPTO' ? 'Deposit Anchor Identity' : 'Ecocash Reference Anchor'}
                                </p>
                                <p className="text-lg font-mono text-brand-gold font-bold break-all select-all tracking-widest">
                                    {purchase.payment_method === 'CRYPTO' ? purchase.cryptoAddress : purchase.ecocashRef}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 w-full lg:w-64">
                            <button 
                                onClick={() => handleApprove(purchase)}
                                disabled={!!processingId}
                                className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] transition-all active:scale-95 shadow-glow-gold flex items-center justify-center gap-3"
                            >
                                {processingId === purchase.id ? <LoaderIcon className="h-5 w-5 animate-spin"/> : <>Settle Handshake</>}
                            </button>
                            <button 
                                onClick={() => handleReject(purchase.id)}
                                disabled={!!processingId}
                                className="w-full py-4 bg-red-950/20 text-red-500 hover:text-red-400 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all border border-red-900/30"
                            >
                                Reject Block
                            </button>
                        </div>
                    </div>
                ))}
                {purchases.length === 0 && (
                    <div className="text-center py-32 opacity-30">
                        <DatabaseIcon className="h-16 w-16 text-gray-800 mx-auto mb-6" />
                        <p className="label-caps !text-[12px] !tracking-[0.6em]">No Handshakes Pending Validation</p>
                    </div>
                )}
            </div>
        </div>
    );
};
