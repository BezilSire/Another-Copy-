
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogoIcon } from './icons/LogoIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { VideoIcon } from './icons/VideoIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { VideoMeeting } from './VideoMeeting';

interface GuestMeetingPageProps {
  meetingId: string;
}

export const GuestMeetingPage: React.FC<GuestMeetingPageProps> = ({ meetingId }) => {
    const { currentUser, loginAnonymously, isProcessingAuth, firebaseUser } = useAuth();
    const [name, setName] = useState('');

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        await loginAnonymously(name.trim());
    };

    if (firebaseUser?.isAnonymous && currentUser) {
        return (
            <VideoMeeting 
                user={currentUser} 
                meetingId={meetingId} 
                isHost={false} 
                onEnd={() => window.location.href = '/'} 
            />
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden font-sans">
            <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
            
            <div className="module-frame glass-module p-10 sm:p-16 rounded-[4rem] border-white/10 shadow-premium max-w-md w-full relative animate-fade-in text-center">
                <div className="corner-tl"></div><div className="corner-tr"></div><div className="corner-bl"></div><div className="corner-br"></div>
                
                <div className="w-24 h-24 bg-brand-gold/10 rounded-full border border-brand-gold/20 flex items-center justify-center mx-auto mb-10 shadow-glow-gold">
                    <VideoIcon className="h-10 w-10 text-brand-gold" />
                </div>

                <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text leading-none mb-4">Guest Access</h2>
                <p className="label-caps !text-[9px] !text-emerald-500/80 mb-12 !tracking-[0.4em]">Invited to Sovereign Meeting</p>

                <form onSubmit={handleJoin} className="space-y-8">
                    <div className="space-y-3 text-left">
                        <label className="label-caps !text-[9px] text-gray-500 pl-1">Identify Yourself</label>
                        <input 
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="YOUR NAME"
                            className="w-full bg-slate-900 border-2 border-white/10 rounded-2xl p-5 text-white font-bold uppercase tracking-widest focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 transition-all outline-none"
                            autoFocus
                            required
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={isProcessingAuth || !name.trim()}
                        className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-xs shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-20"
                    >
                        {isProcessingAuth ? <LoaderIcon className="h-5 w-5 animate-spin" /> : "Initiate P2P Handshake"}
                    </button>
                </form>

                <div className="mt-12 pt-10 border-t border-white/5 flex items-center gap-4 text-left">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-gray-500">
                        <ShieldCheckIcon className="h-5 w-5" />
                    </div>
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest leading-loose">
                        SECURE_PROTOCOL: This session is temporary. No media data is stored. Disconnecting will purge your guest signature.
                    </p>
                </div>
            </div>

            <div className="absolute bottom-8 opacity-20 flex items-center gap-3 grayscale">
                 <LogoIcon className="h-8 w-8 text-brand-gold" />
                 <span className="text-[10px] font-black text-white uppercase tracking-[0.6em]">Powered by Ubuntium_Core</span>
            </div>
        </div>
    );
};
