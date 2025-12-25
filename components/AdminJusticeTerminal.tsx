import React, { useState } from 'react';
import { Admin, Report, User } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { ScaleIcon } from './icons/ScaleIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { formatTimeAgo } from '../utils';

export const AdminJusticeTerminal: React.FC<{ admin: Admin; reports: Report[] }> = ({ admin, reports }) => {
    const [busyId, setBusyId] = useState<string | null>(null);
    const { addToast } = useToast();

    const handleEscalate = async (report: Report) => {
        if (!window.confirm(`Initiate Tribunal against ${report.reportedUserName}? This will open the case for public Citizen Jury voting.`)) return;
        
        setBusyId(report.id);
        try {
            // Fetch users to construct full dispute object
            const respondent = await api.getPublicUserProfile(report.reportedUserId);
            if (!respondent) throw new Error("Respondent node offline.");

            await api.initiateDispute(
                admin, 
                respondent as User, 
                report.reason, 
                report.details || "No additional testimony provided."
            );
            
            // Mark report as resolved since it's now a formal dispute
            await api.reportUser(admin, respondent as User, "DISPUTE_OPENED", "Formal tribunal session initialized.");
            
            addToast("TRIBUNAL INITIALIZED: Handshake Escrow Active.", "success");
        } catch (e: any) {
            addToast(`ESCALATION FAILED: ${e.message}`, "error");
        } finally {
            setBusyId(null);
        }
    };

    const pendingReports = reports.filter(r => r.status === 'new');

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-fade-in font-sans pb-20">
            <div className="module-frame bg-slate-950 p-10 rounded-[3.5rem] border-white/10 shadow-premium relative overflow-hidden">
                <div className="corner-tl"></div><div className="corner-tr"></div>
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <ScaleIcon className="h-40 w-40 text-red-500" />
                </div>
                
                <div className="flex justify-between items-center mb-12 border-b border-white/5 pb-8 relative z-10">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text leading-none">Judicial Docket</h2>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] mt-3">Active State Complaints Index</p>
                    </div>
                    <div className="flex items-center gap-3 bg-red-950/20 px-6 py-3 rounded-2xl border border-red-500/20">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-glow-matrix"></div>
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">{pendingReports.length} ANOMALIES DETECTED</span>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    {pendingReports.map(report => (
                        <div key={report.id} className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/5 flex flex-col lg:flex-row justify-between items-center gap-10 group hover:border-red-500/30 transition-all shadow-xl">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center text-red-500/40 group-hover:text-red-500 transition-colors">
                                        <AlertTriangleIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Offense Anchor:</p>
                                            <span className="px-2 py-0.5 bg-red-900/30 text-red-400 rounded text-[9px] font-black uppercase tracking-widest">{report.reason}</span>
                                        </div>
                                        <p className="text-xl font-black text-white uppercase tracking-tight mt-1">{report.reportedUserName}</p>
                                    </div>
                                </div>
                                <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                                    <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.3em] mb-2">Complaint Narrative</p>
                                    <p className="text-gray-300 text-sm leading-relaxed italic">"{report.details || 'No textual evidence provided.'}"</p>
                                </div>
                                <div className="flex items-center gap-6 pl-2">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Reporter:</p>
                                        <span className="text-[10px] font-bold text-white uppercase">{report.reporterName}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] text-gray-600 font-mono">
                                        <span>SYNCED:</span>
                                        <span>{formatTimeAgo(report.date)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full lg:w-64 space-y-3">
                                <button 
                                    onClick={() => handleEscalate(report)}
                                    disabled={!!busyId}
                                    className="w-full py-5 bg-white text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] transition-all active:scale-95 shadow-lg flex justify-center items-center gap-3 disabled:opacity-20"
                                >
                                    {busyId === report.id ? <LoaderIcon className="h-4 w-4 animate-spin"/> : <>Initialize Tribunal</>}
                                </button>
                                <button className="w-full py-3 text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors">Dismiss Complaint</button>
                            </div>
                        </div>
                    ))}
                    {pendingReports.length === 0 && (
                        <div className="py-32 text-center opacity-30">
                            <ShieldCheckIcon className="h-16 w-16 text-gray-800 mx-auto mb-6" />
                            <p className="label-caps !text-[12px] !tracking-[0.6em]">Consensus Achieved: State Quiet</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-10 bg-brand-gold/5 rounded-[3.5rem] border border-brand-gold/10 flex items-start gap-8">
                <div className="p-4 bg-brand-gold rounded-2xl text-slate-950 shadow-glow-gold shrink-0">
                    <ScaleIcon className="h-8 w-8" />
                </div>
                <div className="space-y-3">
                    <h4 className="text-xl font-black text-white uppercase tracking-tighter">Judicial Doctrine</h4>
                    <p className="text-xs text-gray-400 leading-relaxed uppercase font-black tracking-widest opacity-80">
                        Admin escalation converts a private report into a public State Tribunal. High-reputation citizens will be summoned to sign their verdicts. Once a threshold of 10 signed peer-vouches or peer-ousts is reached, the state will execute the consensus.
                    </p>
                </div>
            </div>
        </div>
    );
};