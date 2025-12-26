import React, { useState } from 'react';
import { User, Meeting } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { VideoIcon } from './icons/VideoIcon';
import { KeyIcon } from './icons/KeyIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { VideoMeeting } from './VideoMeeting';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

interface MeetingHubProps {
  user: User;
}

export const MeetingHub: React.FC<MeetingHubProps> = ({ user }) => {
    const [meetingIdInput, setMeetingIdInput] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [activeMeeting, setActiveMeeting] = useState<{ id: string, isHost: boolean } | null>(null);
    const { addToast } = useToast();

    const handleCreate = async () => {
        setIsJoining(true);
        try {
            const id = await api.createMeeting(user);
            setActiveMeeting({ id, isHost: true });
            addToast("Meeting Node Initialized.", "success");
        } catch (e) {
            addToast("Failed to initialize meeting node.", "error");
        } finally {
            setIsJoining(false);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        const id = meetingIdInput.trim();
        if (!id) return;
        
        setIsJoining(true);
        try {
            const m = await api.joinMeeting(id);
            if (m) {
                setActiveMeeting({ id, isHost: false });
                addToast("Handshake complete. Connecting to peer...", "success");
            } else {
                addToast("Meeting Node not found.", "error");
            }
        } catch (e) {
            addToast("Protocol error.", "error");
        } finally {
            setIsJoining(false);
        }
    };

    if (activeMeeting) {
        return (
            <VideoMeeting 
                user={user} 
                meetingId={activeMeeting.id} 
                isHost={activeMeeting.isHost} 
                onEnd={() => setActiveMeeting(null)} 
            />
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in font-sans pb-20 px-4">
             <div className="module-frame bg-slate-900/60 p-10 rounded-[3rem] border-white/5 shadow-premium overflow-hidden text-center relative">
                <div className="corner-tl opacity-20"></div><div className="corner-br opacity-20"></div>
                <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
                
                <div className="relative z-10 space-y-6">
                    <div className="p-5 bg-blue-500/5 rounded-full w-24 h-24 mx-auto border border-blue-500/20 shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] flex items-center justify-center">
                         <VideoIcon className="h-10 w-10 text-blue-400" />
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter gold-text leading-none">Sovereign Comms</h1>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] max-w-sm mx-auto leading-relaxed">Encrypted Peer-to-Peer Video Communication. No data storage protocol.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="module-frame glass-module p-10 rounded-[3rem] border-white/5 hover:border-brand-gold/30 transition-all shadow-xl group flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="p-4 bg-brand-gold/10 rounded-2xl w-fit border border-brand-gold/20 shadow-glow-gold/10">
                            <ShieldCheckIcon className="h-6 w-6 text-brand-gold" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Host Node</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Generate unique handshake anchor</p>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed uppercase font-black tracking-widest opacity-60">
                            Create a secure channel and share the 6-digit ID with another citizen. Direct WebRTC P2P handshake will be used.
                        </p>
                    </div>
                    <button 
                        onClick={handleCreate}
                        disabled={isJoining}
                        className="mt-10 w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[11px] shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-20"
                    >
                        {isJoining ? <LoaderIcon className="h-4 w-4 animate-spin"/> : "Generate Meeting ID"}
                    </button>
                </div>

                <div className="module-frame glass-module p-10 rounded-[3rem] border-white/5 hover:border-blue-500/30 transition-all shadow-xl flex flex-col justify-between">
                    <form onSubmit={handleJoin} className="space-y-8">
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-500/10 rounded-2xl w-fit border border-blue-500/20">
                                <KeyIcon className="h-6 w-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Join Protocol</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Enter Peer Handshake Anchor</p>
                            </div>
                            <input 
                                type="text"
                                maxLength={6}
                                inputMode="numeric"
                                value={meetingIdInput}
                                onChange={e => setMeetingIdInput(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-full bg-black border-2 border-white/10 rounded-2xl p-6 text-white text-center font-mono text-4xl tracking-[0.5em] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={isJoining || meetingIdInput.length < 6}
                            className="w-full py-5 bg-white text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[11px] active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-20 shadow-xl"
                        >
                            {isJoining ? <LoaderIcon className="h-4 w-4 animate-spin"/> : <>Connect to Peer <ArrowRightIcon className="h-4 w-4"/></>}
                        </button>
                    </form>
                </div>
            </div>

            <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20">
                    <ShieldCheckIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-loose">
                        SOVEREIGN PRIVACY ALERT: Media streams stay local. Only handshake signals pass through the node. Terminal disconnect erases all temporary signaling anchors.
                    </p>
                </div>
            </div>
        </div>
    );
};
