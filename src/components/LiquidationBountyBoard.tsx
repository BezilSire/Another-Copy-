import React, { useState } from 'react';
import { SellRequest, User } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { formatTimeAgo } from '../utils';
import { UsersIcon } from './icons/UsersIcon';

interface LiquidationBountyBoardProps {
    user: User;
    requests: SellRequest[];
}

export const LiquidationBountyBoard: React.FC<LiquidationBountyBoardProps> = ({ user, requests }) => {
    const { addToast } = useToast();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [ecocashRef, setEcocashRef] = useState<Record<string, string>>({});

    const handleClaim = async (requestId: string) => {
        setProcessingId(requestId);
        try {
            await api.claimSellRequest(user, requestId);
            addToast("Protocol claimed. Please dispatch funds to member.", "success");
        } catch (e)) {
            addToast("Claim failed.", "error");
        } finally {
            setProcessingId(null);
        }
    };

    const handleDispatch = async (requestId: string) => {
        const ref = ecocashRef[requestId];
        if (!ref?.trim()) {
            addToast("Ecocash Reference required for dispatch confirmation.", "error");
            return;
        }
        setProcessingId(requestId);
        try {
            await api.dispatchSellPayment(user, requestId, ref);
            addToast("Node notification dispatched. Awaiting member confirmation.", "success");
        } catch (e) {
            addToast("Dispatch failed.", "error");
        } finally {
            setProcessingId(null);
        }
    };

    const pendingRequests = requests.filter(r => r.status === 'PENDING');
    const myBounties = requests.filter(r => r.claimerId === user.id && r.status !== 'COMPLETED');

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text leading-none">Bounty Board</h2>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mt-3">Liquidation Facilitation Hub</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 flex gap-4 items-center">
                    <div className="text-right">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Available Rewards</p>
                        <p className="text-xl font-mono font-black text-green-400">{pendingRequests.length}</p>
                    </div>
                    <TrendingUpIcon className="h-8 w-8 text-brand-gold opacity-30" />
                </div>
            </div>

            {myBounties.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] pl-2">Active Facilitations</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {myBounties.map(req => (
                            <div key={req.id} className="glass-card p-8 rounded-[2.5rem] border-blue-500/20 space-y-6 animate-fade-in">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Member Node</p>
                                        <p className="text-lg font-black text-white uppercase">{req.userName}</p>
                                    </div>
                                    <div className="bg-blue-900/20 text-blue-400 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-800/30">
                                        {req.status}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-black text-gray-600 uppercase mb-1">To Ecocash</p>
                                        <p className="text-sm font-mono font-bold text-white">{req.userPhone}</p>
                                    </div>
                                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-black text-gray-600 uppercase mb-1">Pay Out (USD)</p>
                                        <p className="text-sm font-mono font-bold text-green-400">${req.amountUsd.toFixed(2)}</p>
                                    </div>
                                </div>

                                {req.status === 'CLAIMED' ? (
                                    <div className="space-y-4 pt-2">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Ecocash Reference ID</label>
                                            <input 
                                                type="text" 
                                                value={ecocashRef[req.id] || ''}
                                                onChange={e => setEcocashRef(prev => ({...prev, [req.id]: e.target.value.toUpperCase()}))}
                                                className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="REF CODE FROM SMS"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => handleDispatch(req.id)}
                                            disabled={processingId === req.id}
                                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg flex justify-center items-center gap-2"
                                        >
                                            {processingId === req.id ? <LoaderIcon className="h-4 w-4 animate-spin"/> : "Confirm Dispatch"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-blue-500/10 rounded-2xl text-center">
                                        <p className="text-[9px] text-blue-300 uppercase font-black tracking-widest animate-pulse">Awaiting Member Verification...</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-brand-gold uppercase tracking-[0.4em] pl-2">Liquidation Queue</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingRequests.map(req => (
                        <div key={req.id} className="glass-card p-8 rounded-[2.5rem] border-white/5 space-y-6 hover:border-brand-gold/20 transition-all group">
                             <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Protocol Bounty</p>
                                    <p className="text-2xl font-black text-white font-mono tracking-tighter">${req.amountUsd.toFixed(2)}</p>
                                </div>
                                <div className="bg-brand-gold/10 p-3 rounded-2xl border border-brand-gold/20 text-brand-gold">
                                    <DollarSignIcon className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Facilitation Reward</p>
                                <p className="text-sm font-black text-green-400 font-mono tracking-tighter">+{req.amountUbt} UBT Asset Transfer</p>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center">
                                        <UsersIcon className="h-4 w-4 text-gray-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-gray-60