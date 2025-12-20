
import React from 'react';
import { PendingUbtPurchase, Admin } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { formatTimeAgo } from '../utils';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface EcocashVerificationAdminProps {
    purchases: PendingUbtPurchase[];
    adminUser: Admin;
}

export const EcocashVerificationAdmin: React.FC<EcocashVerificationAdminProps> = ({ purchases, adminUser }) => {
    const { addToast } = useToast();
    const [processingId, setProcessingId] = React.useState<string | null>(null);

    const handleApprove = async (purchase: PendingUbtPurchase) => {
        if (!window.confirm(`Verify and release ${purchase.amountUbt} UBT to ${purchase.userName}?`)) return;
        setProcessingId(purchase.id);
        try {
            await api.approveUbtPurchase(adminUser, purchase);
            addToast("Liquidity released to node.", "success");
        } catch (e) {
            addToast("Protocol failure.", "error");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!window.confirm("Reject this handshake? Reference code will be marked as invalid.")) return;
        setProcessingId(id);
        try {
            await api.rejectUbtPurchase(id);
            addToast("Handshake rejected.", "info");
        } catch (e) {
            addToast("Error rejecting.", "error");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="glass-card p-10 rounded-[3rem] border-white/5 animate-fade-in">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 gold-text">Awaiting Ledger Settlement</h2>
            
            <div className="space-y-4">
                {purchases.map(purchase => (
                    <div key={purchase.id} className="bg-slate-950/60 p-6 rounded-[2rem] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-brand-gold/20 transition-all">
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{purchase.userName}</span>
                                <span className="text-[9px] text-gray-600 font-mono">{formatTimeAgo(purchase.createdAt.toDate().toISOString())}</span>
                            </div>
                            <div className="flex items-baseline gap-4">
                                <p className="text-3xl font-black text-white font-mono tracking-tighter">{purchase.amountUbt} UBT</p>
                                <p className="text-sm font-black text-green-500 font-mono">&approx; ${purchase.amountUsd.toFixed(2)}</p>
                            </div>
                            <div className="pt-2">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Ecocash Reference Proof</p>
                                <p className="text-lg font-mono text-white select-all">{purchase.ecocashRef}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto">
                            <button 
                                onClick={() => handleApprove(purchase)}
                                disabled={!!processingId}
                                className="flex-1 md:flex-none px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                            >
                                {processingId === purchase.id ? <LoaderIcon className="h-4 w-4 animate-spin"/> : <><ShieldCheckIcon className="h-4 w-4"/> Verify & Release</>}
                            </button>
                            <button 
                                onClick={() => handleReject(purchase.id)}
                                disabled={!!processingId}
                                className="px-5 py-4 bg-red-950/20 text-red-500 hover:text-red-400 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all border border-red-900/30"
                            >
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                ))}
                {purchases.length === 0 && (
                    <div className="text-center py-20">
                        <LoaderIcon className="h-10 w-10 text-gray-800 mx-auto mb-4" />
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.4em]">No Handshakes Pending Validation</p>
                    </div>
                )}
            </div>
        </div>
    );
};
