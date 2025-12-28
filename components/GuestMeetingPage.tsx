import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogoIcon } from './icons/LogoIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { VideoIcon } from './icons/VideoIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { VideoMeeting } from './VideoMeeting';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { api } from '../services/apiService';
import { Meeting } from '../types';

interface GuestMeetingPageProps {
  meetingId: string;
}

export const GuestMeetingPage: React.FC<GuestMeetingPageProps> = ({ meetingId }) => {
    const { currentUser, loginAnonymously, isProcessingAuth, firebaseUser } = useAuth();
    const [name, setName] = useState('');
    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [protocolError, setProtocolError] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(true);

    useEffect(() => {
        const validateLink = async () => {
            try {
                const m = await api.joinMeeting(meetingId);
                if (!m) setProtocolError("Meeting Node not found.");
                else if (m.expiresAt.toDate() < new Date()) setProtocolError("PROTOCOL_EXPIRED: stipulated time reached.");
                else setMeeting(m);
            } catch (e: any) {
                setProtocolError(e.message || "Protocol Handshake Failure.");
            } finally {
                setIsValidating(false);
            }
        };
        validateLink();
    }, [meetingId]);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        await loginAnonymously(name.trim());
    };

    if (isValidating) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center">
                 <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold opacity-30" />
                 <p className="label-caps !text-[8px] mt-4 opacity-40 tracking-[0.5em]">Validating_Handshake...</p>
            </div>
        );
    }

    if (protocolError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black font-sans text-center">
                <div className="module-frame glass-module p-10 sm:p-16 rounded-[4rem] border-red-500/20 shadow-premium max-w-md w-full relative">
                    <AlertTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 leading-none">Handshake Denied</h2>
                    <p className="text-sm text-gray-400 leading-loose uppercase font-black tracking-widest opacity-60">{protocolError}</p>
                    <button onClick={() => window.location.href = '/'} className="mt-10 w-full py-5 bg-white/5 border border-white/10 text-white font-black rounded-2xl uppercase tracking-widest text-[10px]">Return to Portal</button>
                </div>
            </div>
        );
    }

    if (firebaseUser?.isAnonymous && currentUser) {
        return <VideoMeeting user={currentUser} meetingId={meetingId} isHost={false} onEnd={() => window.location.href = '/'} />;
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden font-sans">
            <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
            <div className="module-frame glass-module p-10 sm:p-16 rounded-[4rem] border-white/10 shadow-premium max-w-md w-full relative animate-fade-in text-center">
                <div className="corner-tl opacity-30"></div><div className="corner-tr opacity-30"></div>
                <div className="w-24 h-24 bg-brand-gold/10 rounded-full border border-brand-gold/20 flex items-center justify-center mx-auto mb-10 shadow-glow-gold"><VideoIcon className="h-10 w-10 text-brand-gold" /></div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text leading-none mb-4">Guest Access</h2>
                <div className="space-y-1 mb-12">
                    <p className="label-caps !text-[9px] !text-emerald-500/80 !tracking-[0.4em]">Invited to Sovereign Meeting</p>
                    {meeting && <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">STIPULATED END: {meeting.expiresAt.toDate().toLocaleString()}</p>}
                </div>
                <form onSubmit={handleJoin} className="space-y-8 text-left">
                    <div className="space-y-3"><label className="label-caps !text-[9px] text-gray-500 pl-1">Identify Yourself</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="YOUR NAME" className="w-full bg-slate-900 border-2 border-white/10 rounded-2xl p-5 text-white font-bold uppercase tracking-widest focus:border-brand-gold outline-none transition-all" autoFocus required /></div>
                    <button type="submit" disabled={isProcessingAuth || !name.trim()} className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-xs shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-20">{isProcessingAuth ? <LoaderIcon className="h-5 w-5 animate-spin" /> : "Initiate P2P Handshake"}</button>
                </form>
            </div>
        </div>
    );
};