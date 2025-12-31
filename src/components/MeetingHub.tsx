
import React, { useState, useEffect, useCallback } from 'react';
import { User, Meeting } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { VideoIcon } from './icons/VideoIcon';
import { KeyIcon } from './icons/KeyIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { VideoMeeting } from './VideoMeeting';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ShareIcon } from './icons/ShareIcon';
import { FilePenIcon } from './icons/FilePenIcon';
import { TrashIcon } from './icons/TrashIcon';

interface MeetingHubProps {
  user: User;
}

export const MeetingHub: React.FC<MeetingHubProps> = ({ user }) => {
    const [meetingIdInput, setMeetingIdInput] = useState('');
    const [meetingTitle, setMeetingTitle] = useState('');
    const [expiryDateTime, setExpiryDateTime] = useState(() => {
        const date = new Date();
        date.setHours(date.getHours() + 2);
        return date.toISOString().slice(0, 16);
    });
    const [isJoining, setIsJoining] = useState(false);
    const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
    const [hostedMeetings, setHostedMeetings] = useState<Meeting[]>([]);
    const { addToast } = useToast();

    // LAW: Persistent spectral scan for active nodes
    const fetchActiveNodes = useCallback(async () => {
        try {
            const nodes = await api.getHostActiveMeetings(user.id);
            setHostedMeetings(nodes);
        } catch (e) {
            console.error("Ledger sync error:", e);
        }
    }, [user.id]);

    useEffect(() => {
        fetchActiveNodes();
        const interval = setInterval(fetchActiveNodes, 30000); // Keep synced
        return () => clearInterval(interval);
    }, [fetchActiveNodes]);

    const handleCreate = async () => {
        const expiresAt = new Date(expiryDateTime);
        if (expiresAt <= new Date()) {
            addToast("Temporal Anchor Error: Finish time must be in the future.", "error");
            return;
        }

        setIsJoining(true);
        try {
            await api.createMeeting(user, meetingTitle || 'Sovereign Assembly', expiresAt);
            addToast("Meeting Node Anchored to Ledger.", "success");
            setMeetingTitle('');
            await fetchActiveNodes();
        } catch (e) {
            addToast("Failed to initialize meeting node.", "error");
        } finally {
            setIsJoining(false);
        }
    };

    const handleDecommission = async (id: string) => {
        if (!window.confirm("CRITICAL PROTOCOL: Decommission this meeting node permanently? This action is immutable.")) return;
        try {
            await api.deleteMeeting(id);
            addToast("Meeting node decommissioned.", "info");
            await fetchActiveNodes();
        } catch (e) {
            addToast("Failed to decommission node.", "error");
        }
    };

    const handleJoin = async (id: string) => {
        if (!id) return;
        setIsJoining(true);
        try {
            const m = await api.joinMeeting(id);
            if (m) {
                if (m.expiresAt.toDate() <= new Date()) {
                    addToast("This meeting protocol has expired.", "error");
                    await fetchActiveNodes();
                } else {
                    setActiveMeeting({ ...m, isHost: m.hostId === user.id } as any);
                    addToast("Handshake stabilized. Entering stage...", "success");
                }
            } else {
                addToast("Meeting Node not found.", "error");
            }
        } catch (e: any) {
            addToast(e.message || "Protocol error.", "error");
        } finally {
            setIsJoining(false);
        }
    };

    const handleShare = async (m: Meeting) => {
        const link = `${window.location.origin}${window.location.pathname}?join=${m.id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Sovereign Meeting: ${m.title}`,
                    text: `Join the Sovereign Meeting "${m.title}" on the Ubuntium network. Handshake ID: ${m.id}`,
                    url: link
                });
            } catch (e) {}
        } else {
            navigator.clipboard.writeText(link);
            addToast("Handshake link copied.", "info");
        }
    };

    if (activeMeeting) {
        return <VideoMeeting user={user} meetingId={activeMeeting.id} isHost={activeMeeting.hostId === user.id} onEnd={() => { setActiveMeeting(null); fetchActiveNodes(); }} />;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in font-sans pb-20 px-4">
             <div className="module-frame bg-slate-900/60 p-10 rounded-[3rem] border-white/5 shadow-premium overflow-hidden text-center relative">
                <div className="corner-tl opacity-20"></div><div className="corner-br opacity-20"></div>
                <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
                <div className="relative z-10 space-y-6">
                    <div className="p-5 bg-brand-gold/5 rounded-full w-24 h-24 mx-auto border border-brand-gold/20 shadow-glow-gold flex items-center justify-center">
                         <VideoIcon className="h-10 w-10 text-brand-gold" />
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter gold-text leading-none">Meeting Hub</h1>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] max-w-sm mx-auto leading-relaxed">Persistent Protocol Nodes. Re-enter until expiry.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* HOST PANEL */}
                <div className="module-frame glass-module p-10 rounded-[3rem] border-white/5 hover:border-brand-gold/30 transition-all shadow-xl space-y-8">
                    <div className="space-y-6">
                        <div className="p-4 bg-brand-gold/10 rounded-2xl w-fit border border-brand-gold/20">
                            <ShieldCheckIcon className="h-6 w-6 text-brand-gold" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Anchor Node</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Initialize a persistent session</p>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="label-caps !text-[9px] text-gray-400 flex items-center gap-2"><FilePenIcon className="h-3 w-3" /> Meeting Title</label>
                                <input type="text" value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} placeholder="E.G. CIRCLE SYNC" className="w-full bg-slate-950 border-2 border-white/10 rounded-2xl p-4 text-white font-black uppercase text-xs tracking-widest focus:border-brand-gold outline-none transition-all" />
                            </div>
                            <div className="space-y-3">
                                <label className="label-caps !text-[9px] text-gray-400 flex items-center gap-2"><ClockIcon className="h-3 w-3" /> Stipulated Expiry</label>
                                <input type="datetime-local" value={expiryDateTime} onChange={e => setExpiryDateTime(e.target.value)} className="w-full bg-slate-950 border-2 border-white/10 rounded-2xl p-4 text-white font-mono text-sm focus:border-brand-gold outline-none transition-all" />
                            </div>
                            <button onClick={handleCreate} disabled={isJoining} className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[11px] shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-20 cursor-pointer">
                                {isJoining ? <LoaderIcon className="h-4 w-4 animate-spin"/> : "Anchor Node Identity"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* JOIN PANEL */}
                <div className="module-frame glass-module p-10 rounded-[3rem] border-white/5 hover:border-blue-500/30 transition-all shadow-xl space-y-8">
                    <form onSubmit={(e) => { e.preventDefault(); handleJoin(meetingIdInput); }} className="space-y-8">
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-500/10 rounded-2xl w-fit border border-blue-500/20"><KeyIcon className="h-6 w-6 text-blue-400" /></div>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Enter Handshake</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Enter Direct Node ID</p>
                            </div>
                            <input type="text" maxLength={6} inputMode="numeric" value={meetingIdInput} onChange={e => setMeetingIdInput(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="w-full bg-black border-2 border-white/10 rounded-2xl p-6 text-white text-center font-mono text-4xl tracking-[0.5em] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
                        </div>
                        <button type="submit" disabled={isJoining || meetingIdInput.length < 6} className="w-full py-5 bg-white text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[11px] active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-20 shadow-xl cursor-pointer">
                            {isJoining ? <LoaderIcon className="h-4 w-4 animate-spin"/> : <>Index Handshake <ArrowRightIcon className="h-4 w-4"/></>}
                        </button>
                    </form>
                </div>
            </div>

            {/* PERSISTENT NODE LIST */}
            {hostedMeetings.length > 0 && (
                <div className="space-y-6 animate-fade-in pt-10">
                    <h2 className="label-caps !text-[11px] text-gray-400 pl-4">Active Persistent Nodes</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {hostedMeetings.map(m => (
                            <div key={m.id} className="module-frame bg-slate-900/80 border border-white/5 p-6 rounded-[2.5rem] space-y-6 hover:border-brand-gold/40 transition-all shadow-2xl">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest truncate mb-1">{m.title}</p>
                                        <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">ENDS: {m.expiresAt.toDate().toLocaleString()}</p>
                                    </div>
                                    <button onClick={() => handleDecommission(m.id)} className="p-2 text-gray-700 hover:text-red-500 transition-colors" title="Decommission Node"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => handleJoin(m.id)} className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-xl uppercase tracking-widest text-[9px] shadow-glow-matrix transition-all active:scale-95 cursor-pointer">Re-Enter</button>
                                    <button onClick={() => handleShare(m)} className="flex-1 py-4 bg-white/5 border border-white/10 text-white font-black rounded-xl uppercase tracking-widest text-[9px] hover:bg-white/10 transition-all cursor-pointer flex justify-center items-center gap-2">
                                        <ShareIcon className="h-3 w-3" /> Share
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
