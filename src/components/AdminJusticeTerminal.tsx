
import React, { useState } from 'react';
import { Admin, Report, User } from '../types';
import { api } from '../services/apiService';
import { getChatBotResponse } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';
import { ScaleIcon } from './icons/ScaleIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { SparkleIcon } from './icons/SparkleIcon';
import { formatTimeAgo } from '../utils';

export const AdminJusticeTerminal: React.FC<{ admin: Admin; reports: Report[] }> = ({ admin, reports }) => {
    const [busyId, setBusyId] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<Record<string, any>>({});
    const { addToast } = useToast();

    const handleAiAnalyze = async (report: Report) => {
        setBusyId(`ai-${report.id}`);
        try {
            const prompt = `Act as the Sovereign Justice Oracle. Analyze this report: 
            Reason: ${report.reason}. 
            Details: ${report.details}. 
            Identify if this is a likely 'Social Attack', 'Fairness Breach', or 'Technical Anomaly'. 
            Provide a 1-sentence verdict and a Risk Score (1-100).`;
            const response = await getChatBotResponse(prompt);
            setAiAnalysis(prev => ({ ...prev, [report.id]: response }));
            addToast("Oracle Testimony Indexed.", "success");
        } catch (e) {
            addToast("Oracle Link Failure.", "error");
        } finally {
            setBusyId(null);
        }
    };

    const handleEscalate = async (report: Report) => {
        if (!window.confirm(`Initiate Tribunal against ${report.reportedUserName}?`)) return;
        setBusyId(report.id);
        try {
            const respondent = await api.getPublicUserProfile(report.reportedUserId);
            if (!respondent) throw new Error("Respondent node offline.");
            await api.initiateDispute(admin, respondent as User, report.reason, report.details || "No testimony provided.");
            addToast("TRIBUNAL_OPENED", "success");
        } catch (e: any) {
            addToast(`FAILED: ${e.message}`, "error");
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
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">{pendingReports.length} ANOMALIES</span>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    {pendingReports.map(report => (
                        <div key={report.id} className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-8 group hover:border-red-500/30 transition-all shadow-xl">
                            <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center text-red-500/40 group-hover:text-red-500 transition-colors">
                                        <AlertTriangleIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xl font-black text-white uppercase tracking-tight">{report.reportedUserName}</p>
                                        <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-1">ID: {report.reportedUserId.substring(0,12)}...</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-red-900/30 text-red-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/20">{report.reason}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5">
                                    <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.3em] mb-3">Evidence Log</p>
                                    <p className="text-gray-300 text-sm leading-relaxed italic">"{report.details || 'No textual evidence provided.'}"</p>
                                </div>
                                
                                <div className="bg-emerald-950/5 p-6 rounded-[2rem] border border-brand-gold/10 relative overflow-hidden">
                                    <p className="text-[8px] text-brand-gold font-black uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                                        <SparkleIcon className="h-3 w-3" /> AI Oracle Analysis
                                    </p>
                                    {aiAnalysis[report.id] ? (
                                        <p className="text-emerald-400 text-xs leading-relaxed font-black uppercase tracking-tight animate-fade-in">{aiAnalysis[report.id]}</p>
                                    ) : (
                                        <button 
                                            onClick={() => handleAiAnalyze(report)}
                                            disabled={busyId === `ai-${report.id}`}
                                            className="w-full h-20 flex items-center justify-center border border-white/5 rounded-xl hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-brand-gold"
                                        >
                                            {busyId === `ai-${report.id}` ? <LoaderIcon className="h-4 w-4 animate-spin"/> : "Request Oracle Testimony"}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button 
                                    onClick={() => handleEscalate(report)}
                                    disabled={!!busyId}
                                    className="flex-1 py-5 bg-white text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] transition-all active:scale-95 shadow-lg flex justify-center items-center gap-3 disabled:opacity-20"
                                >
                                    {busyId === report.id ? <LoaderIcon className="h-4 w-4 animate-spin"/> : <>Initialize Public Tribunal</>}
                                </button>
                                <button className="px-10 py-5 text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors border border-white/5 rounded-2xl">Dismiss</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
