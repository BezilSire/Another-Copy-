
import React, { useState, useEffect } from 'react';
import { User, CitizenResource, Dispute } from '../types';
import { api } from '../services/apiService';
import { cryptoService } from '../services/cryptoService';
import { useToast } from '../contexts/ToastContext';
import { GlobeIcon } from './icons/GlobeIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { InfoIcon } from './icons/InfoIcon';

export const StateRegistry: React.FC<{ user: User }> = ({ user }) => {
    const [view, setView] = useState<'resources' | 'justice'>('resources');
    const [resources, setResources] = useState<CitizenResource[]>([]);
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        const unsubRes = api.listenToResources(user.circle, setResources);
        const unsubJustice = api.listenToTribunals((data) => {
            setDisputes(data);
            setIsLoading(false);
        });
        return () => { unsubRes(); unsubJustice(); };
    }, [user.circle]);

    const handleJuryVote = async (disputeId: string, vote: 'claimant' | 'respondent') => {
        if (!user.credibility_score || user.credibility_score < 150) {
            addToast("AUTHORIZATION DENIED: Reputation > 150 required for Tribunal signatures.", "error");
            return;
        }
        
        try {
            const timestamp = Date.now();
            const nonce = cryptoService.generateNonce();
            const payload = `JUSTICE:${disputeId}:${vote.toUpperCase()}:${timestamp}:${nonce}`;
            const signature = cryptoService.signTransaction(payload);

            await api.castJuryVote(disputeId, user.id, vote, signature);
            addToast("Judicial Handshake Signed & Buffered.", "success");
        } catch (e: any) {
            addToast(e.message || "Signing aborted.", "error");
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex bg-slate-950/80 p-1.5 rounded-[2rem] border border-white/5 shadow-2xl w-full sm:max-w-md mx-auto">
                <button 
                    onClick={() => setView('resources')} 
                    className={`flex-1 py-4 rounded-[1.8rem] text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${view === 'resources' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-600 hover:text-gray-300'}`}
                >
                    Physical Commons
                </button>
                <button 
                    onClick={() => setView('justice')} 
                    className={`flex-1 py-4 rounded-[1.8rem] text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${view === 'justice' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-600 hover:text-gray-300'}`}
                >
                    Justice Hub
                </button>
            </div>

            <div className="max-w-2xl mx-auto bg-slate-950/60 p-6 rounded-3xl border border-white/5 flex gap-4 items-start shadow-inner">
                <InfoIcon className="h-4 w-4 text-brand-gold flex-shrink-0 mt-1" />
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest leading-loose">
                    {view === 'resources' 
                        ? 'The Physical Commons tracks tangible assets like land, water nodes, and energy grids owned collectively by your Circle. This data is verified via IoT anchors and peer witness.' 
                        : 'The Justice Hub handles social friction and protocol breaches. Verified citizens act as jurors to sign consensus on state disputes.'}
                </p>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold opacity-50" />
                    <p className="label-caps !text-[10px]">Syncing State Ledger...</p>
                </div>
            ) : view === 'resources' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {resources.map(res => (
                        <div key={res.id} className="module-frame glass-module p-8 rounded-[2.5rem] border-white/5 hover:border-brand-gold/30 transition-all shadow-xl group">
                            <div className="corner-tl opacity-20"></div>
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-xl bg-black border border-white/10 ${res.status === 'OPTIMAL' ? 'text-emerald-500' : 'text-orange-500'}`}>
                                    <GlobeIcon className="h-6 w-6" />
                                </div>
                                <span className={`px-3 py-1 rounded-lg text-[8px] font-black tracking-widest ${res.status === 'OPTIMAL' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20' : 'bg-orange-950/20 text-orange-400 border border-orange-500/20'}`}>
                                    {res.status}
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-1">{res.name}</h3>
                            <p className="label-caps !text-[8px] text-gray-500 mb-6">{res.location}</p>
                            
                            <div className="space-y-4 border-t border-white/5 pt-6">
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span className="text-gray-600 uppercase">Operating Load</span>
                                    <span className="text-white font-mono">{res.capacity}</span>
                                </div>
                                <div className="w-full bg-black h-1.5 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ${res.status === 'OPTIMAL' ? 'bg-emerald-500 shadow-glow-matrix w-[85%]' : 'bg-orange-500 w-[30%]'}`}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {resources.length === 0 && (
                        <div className="col-span-full py-32 text-center module-frame rounded-[3rem] border-white/5 opacity-30">
                            <DatabaseIcon className="h-16 w-16 mx-auto mb-6 text-gray-800" />
                            <p className="label-caps !text-[12px] !tracking-[0.6em]">No Shared Assets Registered</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {disputes.map(dispute => (
                        <div key={dispute.id} className="module-frame glass-module p-8 sm:p-10 rounded-[3rem] border-red-500/20 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <ScaleIcon className="h-32 w-32 text-red-500" />
                            </div>
                            <div className="flex flex-col md:flex-row justify-between gap-10 relative z-10">
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-red-500/10 rounded-lg text-red-500 border border-red-500/20">
                                            <ShieldCheckIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Active State Tribunal Case</h3>
                                            <p className="label-caps !text-[8px] text-gray-500">Node Signature Verification Active</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-400 leading-loose italic">"{dispute.reason}"</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-black rounded-2xl border border-white/5">
                                            <p className="label-caps !text-[8px] mb-1">Claimant</p>
                                            <p className="text-white font-bold uppercase">{dispute.claimantName}</p>
                                        </div>
                                        <div className="p-4 bg-black rounded-2xl border border-white/5">
                                            <p className="label-caps !text-[8px] mb-1">Respondent</p>
                                            <p className="text-white font-bold uppercase">{dispute.respondentName}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="w-full md:w-80 flex flex-col gap-4">
                                    <div className="p-6 bg-slate-900 rounded-[2rem] border border-white/5 text-center">
                                        <p className="label-caps !text-[8px] text-gray-600 mb-4">Peer Consensus</p>
                                        <div className="flex justify-around items-center">
                                            <div className="text-center">
                                                <p className="text-2xl font-black text-emerald-500 font-mono">{dispute.votesForClaimant}</p>
                                                <p className="text-[7px] font-black text-gray-500 uppercase mt-1">Uphold</p>
                                            </div>
                                            <div className="h-8 w-px bg-white/10"></div>
                                            <div className="text-center">
                                                <p className="text-2xl font-black text-red-500 font-mono">{dispute.votesForRespondent}</p>
                                                <p className="text-[7px] font-black text-gray-500 uppercase mt-1">Dismiss</p>
                                            </div>
                                        </div>
                                    </div>
                                    {!dispute.juryIds.includes(user.id) ? (
                                        <>
                                            <button 
                                                onClick={() => handleJuryVote(dispute.id, 'claimant')}
                                                className="w-full py-4 bg-white/5 hover:bg-emerald-600 hover:text-white border border-white/10 text-gray-400 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Authorize: Uphold Claim
                                            </button>
                                            <button 
                                                onClick={() => handleJuryVote(dispute.id, 'respondent')}
                                                className="w-full py-4 bg-white/5 hover:bg-red-600 hover:text-white border border-white/10 text-gray-400 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Authorize: Dismiss Case
                                            </button>
                                        </>
                                    ) : (
                                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                                            <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Handshake Verified</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {disputes.length === 0 && (
                        <div className="py-40 text-center opacity-30">
                            <ScaleIcon className="h-16 w-16 mx-auto mb-6 text-gray-800" />
                            <p className="label-caps !text-[12px] !tracking-[0.6em]">Justice Prevails</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
