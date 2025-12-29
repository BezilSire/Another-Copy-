
import React, { useState, useEffect } from 'react';
import { User, Candidate, GovernanceTier } from '../types';
import { api } from '../services/apiService';
import { cryptoService } from '../services/cryptoService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { UsersIcon } from './icons/UsersIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { ShareIcon } from './icons/ShareIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { HeartIcon } from './icons/HeartIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import { InfoIcon } from './icons/InfoIcon';

export const GovernancePage: React.FC<{ user: User }> = ({ user }) => {
    const [view, setView] = useState<'browse' | 'apply' | 'charter'>('browse');
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    const [form, setForm] = useState({
        tier: 'CITY' as GovernanceTier,
        manifesto: '',
        workLinks: '',
        socialLinks: '',
        cvUrl: ''
    });

    useEffect(() => {
        const unsub = api.listenForCandidates(setCandidates);
        setIsLoading(false);
        return () => unsub();
    }, []);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        const balance = user.ubtBalance || 0;
        if (balance < 2) {
            addToast("ELIGIBILITY_FAIL: Minimum 2 $UBT stake required to apply for office.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.applyForExecutive({
                userId: user.id,
                name: user.name,
                circle: user.circle,
                ...form
            });
            addToast("Candidacy Anchored. Mandate Protocol Initiated.", "success");
            setView('browse');
        } catch (e: any) {
            addToast(e.message || "Protocol Failure.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVote = async (candidateId: string) => {
        if ((user.ubtBalance || 0) <= 0) {
            addToast("VOTE_RESTRICTED: Hold $UBT to participate in state governance.", "error");
            return;
        }
        try {
            await api.voteForCandidate(candidateId, user.id);
            addToast("Signed Ballot Ledgered Successfully.", "success");
        } catch (e: any) {
            addToast(e.message || "Vote failed.", "error");
        }
    };

    const handleDelete = async (candidateId: string) => {
        if (!window.confirm("PROTOCOL_WARNING: Permanently withdraw candidacy from the ledger? This action is immutable.")) return;
        try {
            await api.deleteCandidate(candidateId);
            addToast("Candidacy Purged Successfully.", "info");
        } catch (e) {
            addToast("Deletion Failed.", "error");
        }
    };

    const handleShare = (candidate: Candidate) => {
        const url = `${window.location.origin}${window.location.pathname}?action=vote&candidate=${candidate.id}`;
        if (navigator.share) {
            navigator.share({
                title: `Support ${candidate.name} for Genesis Council`,
                text: `Cast your signed ballot for ${candidate.name} in the Ubuntium Network State.`,
                url
            });
        } else {
            navigator.clipboard.writeText(url);
            addToast("Share link copied to node buffer.", "info");
        }
    };

    const renderLink = (url: string, label: string) => {
        if (!url) return null;
        let finalUrl = url.trim();
        if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = 'https://' + finalUrl;
        }
        return (
            <a 
                href={finalUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-brand-gold hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5"
            >
                <ExternalLinkIcon className="h-3 w-3" />
                {label}
            </a>
        );
    };

    return (
        <div className="space-y-10 animate-fade-in font-sans pb-32">
            {/* GOVERNANCE HUD */}
            <div className="module-frame bg-slate-950 p-10 rounded-[3.5rem] border-brand-gold/20 shadow-premium text-center relative overflow-hidden">
                <div className="corner-tl"></div><div className="corner-br"></div>
                <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
                
                <div className="relative z-10 space-y-6">
                    <div className="p-4 bg-brand-gold/10 rounded-2xl w-fit mx-auto border border-brand-gold/30 shadow-glow-gold">
                        <ScaleIcon className="h-10 w-10 text-brand-gold" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter gold-text leading-none">The Genesis Council</h1>
                    <p className="label-caps !text-[10px] !text-gray-500 !tracking-[0.4em] max-w-lg mx-auto leading-relaxed">
                        Sovereign Leadership & Resource Management Protocol
                    </p>
                    
                    <div className="flex flex-wrap justify-center bg-black/40 p-1.5 rounded-2xl border border-white/5 w-fit mx-auto shadow-inner gap-1">
                        <button onClick={() => setView('charter')} className={`px-6 sm:px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === 'charter' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-500 hover:text-gray-300'}`}>Protocol Charter</button>
                        <button onClick={() => setView('browse')} className={`px-6 sm:px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === 'browse' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-500 hover:text-gray-300'}`}>Mandate Pulse</button>
                        <button onClick={() => setView('apply')} className={`px-6 sm:px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === 'apply' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-600 hover:text-gray-300'}`}>File Candidacy</button>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="py-20 text-center"><LoaderIcon className="h-10 w-10 animate-spin text-brand-gold mx-auto opacity-40"/></div>
            ) : view === 'charter' ? (
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in px-4">
                    <div className="module-frame glass-module p-10 rounded-[3rem] border-white/10 space-y-8">
                        <div className="flex items-center gap-5 border-b border-white/5 pb-8">
                            <div className="p-3 bg-brand-gold/10 rounded-xl text-brand-gold"><ShieldCheckIcon className="h-6 w-6"/></div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">The State Mandate</h3>
                        </div>
                        
                        <p className="text-gray-300 text-base leading-relaxed font-medium">
                            Ubuntium is the world's first <strong className="text-white">Network State</strong> governed by proof of contribution. Every circle steward chosen during this cycle ascends to the <strong className="text-brand-gold">Genesis Council</strong>—the highest administrative body responsible for running the affairs of our collective.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-white/[0.03] rounded-[2rem] border border-white/5 space-y-4">
                                <div className="flex items-center gap-3 text-emerald-400">
                                    <DatabaseIcon className="h-5 w-5"/>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Resource Allocation</span>
                                </div>
                                <p className="text-xs text-gray-400 leading-loose">
                                    The Genesis Council direct the distribution of state assets. They fund circle-led projects, manage food supply chains, and anchor healthcare infrastructure across the global spectrum.
                                </p>
                            </div>
                            <div className="p-6 bg-white/[0.03] rounded-[2rem] border border-white/5 space-y-4">
                                <div className="flex items-center gap-3 text-blue-400">
                                    <GlobeIcon className="h-5 w-5"/>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Semi-Annual Conclaves</span>
                                </div>
                                <p className="text-xs text-gray-400 leading-loose">
                                    The Council convenes <strong className="text-white">twice annually</strong> at locations chosen by high-tier subscribers. These summits serve as the heartbeat of the state, where resources are balanced and new mandates are signed.
                                </p>
                            </div>
                        </div>

                        <div className="p-8 bg-brand-gold/5 rounded-[2.5rem] border border-brand-gold/20 flex items-start gap-6">
                            <div className="p-3 bg-brand-gold rounded-xl text-slate-950 shadow-glow-gold flex-shrink-0">
                                <ScaleIcon className="h-6 w-6" />
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-lg font-black text-white uppercase tracking-tight">The Formal Swearing-In</h4>
                                <p className="text-xs text-gray-400 leading-loose uppercase font-bold tracking-widest opacity-80">
                                    Leadership is a sacred trust. Once the voting process closes, mandated candidates will be summoned to a formal <strong className="text-white">Swearing-In Event</strong>. At this ceremony, your circle representation is officially anchored to the ledger.
                                </p>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/5 text-center">
                            <button onClick={() => setView('browse')} className="px-12 py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all">Review the Candidates</button>
                        </div>
                    </div>
                </div>
            ) : view === 'apply' ? (
                <div className="module-frame glass-module p-10 rounded-[3rem] border-white/10 shadow-2xl max-w-3xl mx-auto animate-fade-in">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 border-b border-white/5 pb-6 flex items-center gap-4">
                        <DatabaseIcon className="h-6 w-6 text-brand-gold" />
                        Executive Registration
                    </h3>
                    <form onSubmit={handleApply} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="label-caps !text-[9px] text-gray-500 pl-1">Governance Tier</label>
                                <select 
                                    value={form.tier} 
                                    onChange={e => setForm({...form, tier: e.target.value as GovernanceTier})}
                                    className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl text-white font-black text-xs uppercase tracking-widest outline-none appearance-none shadow-inner"
                                >
                                    <option value="CITY">CIRCLE STEWARD (Local Representation)</option>
                                    <option value="NATIONAL">NATIONAL ASSEMBLY (National Delegate)</option>
                                    <option value="GLOBAL">GENESIS HIGH COUNCIL (Global Oversight)</option>
                                </select>
                            </div>
                             <div className="space-y-3">
                                <label className="label-caps !text-[9px] text-gray-500 pl-1">Public Portfolio (CV/BIO URL)</label>
                                <input 
                                    type="url" 
                                    value={form.cvUrl} 
                                    onChange={e => setForm({...form, cvUrl: e.target.value})}
                                    className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl text-white font-bold text-xs" 
                                    placeholder="https://drive.google.com/..."
                                    required 
                                />
                                <div className="flex items-start gap-2 p-3 bg-brand-gold/5 rounded-xl border border-brand-gold/20">
                                    <InfoIcon className="h-4 w-4 text-brand-gold flex-shrink-0 mt-0.5" />
                                    <p className="text-[8px] text-brand-gold uppercase font-black tracking-widest leading-relaxed">
                                        RECOMENDATION: Upload your CV to Google Drive and set visibility to "Anyone with the link" before pasting the URL here.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="label-caps !text-[9px] text-gray-500 pl-1">Executive Manifesto</label>
                            <textarea 
                                value={form.manifesto} 
                                onChange={e => setForm({...form, manifesto: e.target.value})}
                                rows={6} 
                                className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl text-white text-sm leading-relaxed" 
                                placeholder="Detail your plan for local resource management, food security, and healthcare nodes in your circle..."
                                required 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="label-caps !text-[9px] text-gray-500 pl-1">Previous Work/Proof (URL)</label>
                                <input type="url" value={form.workLinks} onChange={e => setForm({...form, workLinks: e.target.value})} className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl text-white font-bold text-xs" placeholder="https://..." />
                            </div>
                             <div className="space-y-3">
                                <label className="label-caps !text-[9px] text-gray-500 pl-1">Social ID link (X/LinkedIn)</label>
                                <input type="url" value={form.socialLinks} onChange={e => setForm({...form, socialLinks: e.target.value})} className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl text-white font-bold text-xs" placeholder="https://..." />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full py-6 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[11px] shadow-glow-gold active:scale-95 transition-all"
                        >
                            {isSubmitting ? "Anchoring Application..." : "Anchor State Candidacy"}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in px-4">
                    {candidates.map(candidate => (
                        <div key={candidate.id} className={`module-frame glass-module p-8 rounded-[3rem] border-2 transition-all duration-500 group relative overflow-hidden ${candidate.status === 'mandated' ? 'border-emerald-500/40 bg-emerald-950/10 shadow-glow-matrix' : 'border-white/5 hover:border-brand-gold/30'}`}>
                             <div className="absolute top-0 right-0 p-6 opacity-10">
                                {candidate.tier === 'GLOBAL' ? <GlobeIcon className="h-16 w-16" /> : <UsersIcon className="h-16 w-16" />}
                             </div>

                             {candidate.userId === user.id && (
                                 <button 
                                    onClick={() => handleDelete(candidate.id)}
                                    className="absolute top-8 left-8 p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all z-20"
                                    title="Withdraw Candidacy"
                                 >
                                    <TrashIcon className="h-4 w-4" />
                                 </button>
                             )}
                             
                             <div className="flex items-center gap-6 mb-8 mt-4 sm:mt-0">
                                <div className="w-16 h-16 rounded-2xl bg-slate-950 flex items-center justify-center border border-white/10 shadow-inner">
                                    <span className="text-2xl font-black text-white">{candidate.name.charAt(0)}</span>
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-white uppercase tracking-tight">{candidate.name}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="px-2 py-0.5 bg-brand-gold/20 text-brand-gold rounded text-[8px] font-black uppercase tracking-widest">{candidate.tier}</span>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{candidate.circle}</p>
                                    </div>
                                </div>
                             </div>

                             <div className="bg-black/40 p-6 rounded-2xl border border-white/5 mb-6">
                                <p className="text-xs text-gray-300 leading-relaxed italic line-clamp-4">"{candidate.manifesto}"</p>
                             </div>

                             <div className="flex flex-wrap gap-2 mb-8">
                                {renderLink(candidate.cvUrl, "Portfolio")}
                                {candidate.workLinks && renderLink(candidate.workLinks, "Proof")}
                                {candidate.socialLinks && renderLink(candidate.socialLinks, "Identity")}
                             </div>

                             <div className="grid grid-cols-2 gap-4 mb-10">
                                <div className="text-center p-4 bg-slate-950 rounded-2xl border border-white/5">
                                    <p className="text-[8px] text-gray-600 font-black uppercase mb-1 tracking-widest">Mandate Threshold</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <p className={`text-3xl font-black font-mono ${candidate.voteCount >= 20 ? 'text-emerald-500' : 'text-white'}`}>{candidate.voteCount}</p>
                                        <span className="text-gray-700 text-sm">/ 20</span>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center items-center">
                                    <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-white/5">
                                        <div className={`h-full transition-all duration-1000 ${candidate.status === 'mandated' ? 'bg-emerald-500 shadow-glow-matrix' : 'bg-brand-gold'}`} style={{ width: `${Math.min(100, (candidate.voteCount / 20) * 100)}%` }}></div>
                                    </div>
                                    <p className="text-[8px] text-gray-600 font-black uppercase mt-3 tracking-widest">{candidate.status === 'mandated' ? 'MANDATE_ACHIEVED' : 'SYNCING_CONSENSUS'}</p>
                                </div>
                             </div>

                             <div className="flex gap-4">
                                <button 
                                    onClick={() => handleVote(candidate.id)}
                                    disabled={candidate.votes.includes(user.id)}
                                    className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-lg transition-all active:scale-95 ${candidate.votes.includes(user.id) ? 'bg-emerald-900/40 text-emerald-500 border border-emerald-500/20' : 'bg-brand-gold text-slate-950 hover:bg-brand-gold-light'}`}
                                >
                                    {candidate.votes.includes(user.id) ? "Signed Ballot Ledgered" : "Authorize Vote Signature"}
                                </button>
                                <button onClick={() => handleShare(candidate)} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-all group">
                                    <ShareIcon className="h-5 w-5 group-hover:scale-110 transition-all" />
                                </button>
                             </div>
                        </div>
                    ))}
                    {candidates.length === 0 && (
                        <div className="col-span-full py-40 text-center opacity-30">
                            <UsersIcon className="h-16 w-16 mx-auto mb-6 text-gray-800" />
                            <p className="label-caps !text-[12px] !tracking-[0.6em]">No Candidates Indexed</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
