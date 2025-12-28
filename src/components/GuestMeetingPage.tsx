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

export const GuestMeetingPage: React.FC<GuestMeetingPageProps> = ({ meetingId: initialMeetingId }) => {
    const { currentUser, loginAnonymously, isProcessingAuth, firebaseUser, logout } = useAuth();
    const [name, setName] = useState('');
    const [meetingIdInput, setMeetingIdInput] = useState(initialMeetingId);
    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [protocolError, setProtocolError] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        if (initialMeetingId) validateLink(initialMeetingId);
    }, [initialMeetingId]);

    const validateLink = async (id: string) => {
        setIsValidating(true);
        setProtocolError(null);
        try {
            const m = await api.joinMeeting(id);
            if (!m) setProtocolError("Meeting Node not found.");
            else if (m.expiresAt.toDate() < new Date()) setProtocolError("PROTOCOL_EXPIRED: stipulated time reached.");
            else {
                setMeeting(m);
                // If we are already signed in anonymously, just join the meeting by triggering a refresh or state change
                if (firebaseUser?.isAnonymous) {
                   window.location.search = `?join=${id}`;
                }
            }
        } catch (e: any) {
            setProtocolError(e.message || "Protocol Handshake Failure.");
        } finally {
            setIsValidating(false);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !meetingIdInput.trim()) return;
        
        // If not authenticated, login anonymously first
        if (!firebaseUser) {
            await loginAnonymously(name.trim());
        }
        
        validateLink(meetingIdInput.trim());
    };

    if (isValidating) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center">
                 <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold opacity-30" />
                 <p className="label-caps !text-[8px] mt-4 opacity-40 tracking-[0.5em]">Validating_Handshake...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden font-sans">
            <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
            
            <div className="module-frame glass-module p-10 sm:p-16 rounded-[4rem] border-white/10 shadow-premium max-w-md w-full relative animate-fade-in text-center">
                <div className="corner-tl opacity-30"></div><div className="corner-tr opacity-30"></div>
                
                <div className="w-24 h-24 bg-brand-gold/10 rounded-full border border-brand-gold/20 flex items-center justify-center mx-auto mb-10 shadow-glow-gold">
                    <VideoIcon className="h-10 w-10 text-brand-gold" />
                </div>

                <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text leading-none mb-4">Handshake Terminal</h2>
                <p className="label-caps !text-[9px] !text-emerald-500/80 mb-12 !tracking-[0.4em]">Sovereign Peer Ingress</p>

                {protocolError && (
                    <div className="mb-8 p-4 bg-red-950/20 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest leading-loose">
                         {protocolError}
                    </div>
                )}

                <form onSubmit={handleJoin} className="space-y-6">
                    {!firebaseUser && (
                        <div className="space-y-3 text-left">
                            <label className="label-caps !text-[9px] text-gray-500 pl-1">Protocol Identifier (Name)</label>
                            <input 
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="YOUR NAME"
                                className="w-full bg-slate-900 border-2 border-white/10 rounded-2xl p-5 text-white font-bold uppercase tracking-widest focus:border-brand-gold outline-none transition-all"
                                required
                            />
                        </div>
                    )}
                    
                    <div className="space-y-3 text-left">
                        <label className="label-caps !text-[9px] text-gray-500 pl-1">Meeting Anchor ID</label>
                        <input 
                            type="text"
                            maxLength={6}
                            value={meetingIdInput}
                            onChange={e => setMeetingIdInput(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            className="w-full bg-slate-900 border-2 border-white/10 rounded-2xl p-5 text-white font-mono text-center text-4xl tracking-[0.5em] focus:border-brand-gold outline-none transition-all"
                            required
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={isProcessingAuth || isValidating}
                        className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-xs shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-20"
                    >
                        {isProcessingAuth ? <LoaderIcon className="h-5 w-5 animate-spin" /> : "Request Entry Signature"}
                    </button>
                </form>

                <div className="mt-12 pt-8 border-t border-white/5 flex flex-col gap-4">
                     <button onClick={() => window.location.href = '/'} className="text-[10px] font-black text-white hover:text-brand-gold uppercase tracking-[0.3em] transition-colors">Citizen Login</button>
                     {firebaseUser?.isAnonymous && (
                         <button onClick={() => logout().then(() => window.location.reload())} className="text-[9px] font-black text-gray-600 hover:text-red-500 uppercase tracking-widest transition-colors">Terminate Guest Session</button>
                     )}
                </div>
            </div>
        </div>
    );
};