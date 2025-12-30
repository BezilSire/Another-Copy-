
import React, { useState, useEffect } from 'react';
import { User, Meeting } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { VideoIcon } from './icons/VideoIcon';
import { KeyIcon } from './icons/KeyIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { VideoMeeting } from './VideoMeeting';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ShareIcon } from './icons/ShareIcon';
import { FilePenIcon } from './icons/FilePenIcon';
// Add missing TrashIcon import
import { TrashIcon } from './icons/TrashIcon';
import { formatTimeAgo } from '../utils';

interface MeetingHubProps {
  user: User;
}

export const MeetingHub: React.FC<MeetingHubProps> = ({ user }) => {
    const [meetingIdInput, setMeetingIdInput] = useState('');
    const [meetingTitle, setMeetingTitle] = useState('');
    const [startDateTime, setStartDateTime] = useState(() => {
        return new Date().toISOString().slice(0, 16);
    });
    const [expiryDateTime, setExpiryDateTime] = useState(() => {
        const date = new Date();
        date.setHours(date.getHours() + 2);
        return date.toISOString().slice(0, 16);
    });
    const [isJoining, setIsJoining] = useState(false);
    const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
    const [generatedMeeting, setGeneratedMeeting] = useState<Meeting | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const { addToast } = useToast();

    // Check for an active session in storage on mount to prevent loss on refresh
    useEffect(() => {
        const savedMeetingId = sessionStorage.getItem('ugc_active_meeting_id');
        if (savedMeetingId && !generatedMeeting) {
            api.joinMeeting(savedMeetingId).then(m => {
                if (m && m.expiresAt.toDate() > new Date()) {
                    setGeneratedMeeting(m);
                } else {
                    sessionStorage.removeItem('ugc_active_meeting_id');
                }
            });
        }
    }, []);

    const handleCreate = async () => {
        const start = new Date(startDateTime);
        const expiresAt = new Date(expiryDateTime);
        
        if (expiresAt <= start) {
            addToast("Temporal Anchor Error: Finish time must be after start time.", "error");
            return;
        }

        if (expiresAt <= new Date()) {
            addToast("Temporal Anchor Error: Finish time must be in the future.", "error");
            return;
        }

        setIsJoining(true);
        try {
            const id = await api.createMeeting(user, meetingTitle || 'Sovereign Assembly', expiresAt);
            const m = await api.joinMeeting(id);
            if (m) {
                setGeneratedMeeting(m);
                sessionStorage.setItem('ugc_active_meeting_id', id);
                addToast("Meeting Node Initialized. This link is persistent until the finish time.", "success");
            }
        } catch (e) {
            console.error("Meeting creation error:", e);
            addToast("Failed to initialize meeting node.", "error");
        } finally {
            setIsJoining(false);
        }
    };

    const handleShare = async () => {
        if (!generatedMeeting) return;
        const link = `${window.location.origin}${window.location.pathname}?join=${generatedMeeting.id}`;
        const shareData = {
            title: `Sovereign Meeting: ${generatedMeeting.title}`,
            text: `Join the Sovereign Meeting "${generatedMeeting.title}" on the Ubuntium network.\nHandshake ID: ${generatedMeeting.id}`,
            url: link
        };

        if (navigator.share) {
            try { await navigator.share(shareData); } catch (e) {}
        } else {
            handleCopyLink();
        }
    };

    const handleCopyLink = () => {
        if (!generatedMeeting) return;
        const link = `${window.location.origin}${window.location.pathname}?join=${generatedMeeting.id}`;
        navigator.clipboard.writeText(link).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            addToast("Handshake link copied.", "info");
        });
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        const id = meetingIdInput.trim();
        if (!id) return;
        
        setIsJoining(true);
        try {
            const m = await api.joinMeeting(id);
            if (m) {
                if (m.expiresAt.toDate() <= new Date()) {
                    addToast("This meeting protocol has already expired.", "error");
                } else {
                    setActiveMeeting({ ...m, isHost: m.hostId === user.id } as any);
                    addToast("Handshake complete. Connecting to peer...", "success");
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

    if (activeMeeting) {
        return <VideoMeeting user={user} meetingId={activeMeeting.id} isHost={(activeMeeting as any).isHost} onEnd={() => setActiveMeeting(null)} />;
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
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] max-w-sm mx-auto leading-relaxed">Persistent Peer-to-Peer Communication.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="module-frame glass-module p-10 rounded-[3rem] border-white/5 hover:border-brand-gold/30 transition-all shadow-xl group flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="p-4 bg-brand-gold/10 rounded-2xl w-fit border border-brand-gold/20">
                            <ShieldCheckIcon className="h-6 w-6 text-brand-gold" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Host Node</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Anchor a persistent session</p>
                        </div>
                        {!generatedMeeting ? (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="label-caps !text-[9px] text-gray-400 flex items-center gap-2"><FilePenIcon className="h-3 w-3" /> stipulated Meeting Title</label>
                                    <input type="text" value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} placeholder="E.G. CIRCLE LEADERSHIP SYNC" className="w-full bg-slate-950 border-2 border-white/10 rounded-2xl p-4 text-white font-black uppercase text-xs tracking-widest focus:border-brand-gold outline-none transition-all" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="label-caps !text-[9px] text-gray-400 flex items-center gap-2"><ClockIcon className="h-3 w-3" /> Start Protocol</label>
                                        <input type="datetime-local" value={startDateTime} onChange={e => setStartDateTime(e.target.value)} className="w-full bg-slate-900 border-2 border-white/10 rounded-2xl p-4 text-white font-mono text-sm focus:border-brand-gold outline-none transition-all" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="label-caps !text-[9px] text-gray-400 flex items-center gap-2"><ClockIcon className="h-3 w-3" /> Finish Protocol</label>
                                        <input type="datetime-local" value={expiryDateTime} onChange={e => setExpiryDateTime(e.target.value)} className="w-full bg-slate-900 border-2 border-white/10 rounded-2xl p-4 text-white font-mono text-sm focus:border-brand-gold outline-none transition-all" />
                                    </div>
                                </div>
                                <button onClick={handleCreate} disabled={isJoining} className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[11px] shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-20">{isJoining ? <LoaderIcon className="h-4 w-4 animate-spin"/> : "Generate Secure Link"}</button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                <div className="p-6 bg-slate-900 border border-brand-gold/20 rounded-[2rem] space-y-4 shadow-inner">
                                    <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{generatedMeeting.title}</p>
                                    <div className="flex items-center gap-2 text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                        <ClockIcon className="h-3 w-3" /> 
                                        <span>Terminal expires {new Date(generatedMeeting.expiresAt.toDate()).toLocaleString()}</span>
                                    </div>
                                    <div className="pt-4 flex flex-col gap-3">
                                        <button onClick={handleShare} className="w-full py-4 bg-white/5 border border-white/10 rounded-xl text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all"><ShareIcon className="h-4 w-4 text-brand-gold"/>Distribute Handshake</button>
                                        <button onClick={handleCopyLink} className="w-full py-2 text-[8px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors">{isCopied ? "Identity Copied" : "Copy ID Node"}</button>
                                    </div>
                                </div>
                                <button onClick={() => setActiveMeeting({ ...generatedMeeting, isHost: true } as any)} className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl uppercase tracking-[0.4em] text-[11px] shadow-glow-matrix active:scale-95 transition-all">Enter Meeting Stage</button>
                                <button onClick={() => { setGeneratedMeeting(null); sessionStorage.removeItem('ugc_active_meeting_id'); }} className="w-full text-[9px] font-black text-gray-600 uppercase tracking-widest hover:text-white transition-colors">Clear Local Tracker</button>
                                <p className="text-[7px] text-gray-700 uppercase font-black text-center">Meeting remains active for others until the finish time.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="module-frame glass-module p-10 rounded-[3rem] border-white/5 hover:border-blue-500/30 transition-all shadow-xl flex flex-col justify-between">
                    <form onSubmit={handleJoin} className="space-y-8">
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-500/10 rounded-2xl w-fit border border-blue-500/20"><KeyIcon className="h-6 w-6 text-blue-400" /></div>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Join Protocol</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Enter Handshake Anchor ID</p>
                            </div>
                            <input type="text" maxLength={6} inputMode="numeric" value={meetingIdInput} onChange={e => setMeetingIdInput(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="w-full bg-black border-2 border-white/10 rounded-2xl p-6 text-white text-center font-mono text-4xl tracking-[0.5em] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
                        </div>
                        <button type="submit" disabled={isJoining || meetingIdInput.length < 6} className="w-full py-5 bg-white text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[11px] active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-20 shadow-xl">{isJoining ? <LoaderIcon className="h-4 w-4 animate-spin"/> : <>Join by ID <ArrowRightIcon className="h-4 w-4"/></>}</button>
                    </form>
                </div>
            </div>
        </div>
    );
};
