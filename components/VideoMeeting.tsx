import React, { useState, useEffect, useRef } from 'react';
import { User, Meeting, ParticipantStatus, RTCSignal, ICESignal } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { MicIcon } from './icons/MicIcon';
import { MicOffIcon } from './icons/MicOffIcon';
import { VideoIcon } from './icons/VideoIcon';
import { VideoOffIcon } from './icons/VideoOffIcon';
import { PhoneOffIcon } from './icons/PhoneOffIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LogoIcon } from './icons/LogoIcon';
import { UserMinusIcon } from './icons/UserMinusIcon';
import { ClockIcon } from './icons/ClockIcon';

const servers = {
    iceServers: [
        { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    ],
    iceCandidatePoolSize: 10,
};

interface VideoMeetingProps {
    user: User;
    meetingId: string;
    isHost: boolean;
    onEnd: () => void;
}

const ParticipantTile: React.FC<{ 
    participant: ParticipantStatus; 
    stream?: MediaStream; 
    isLocal?: boolean;
    isHost?: boolean;
    onRevoke?: () => void;
}> = ({ participant, stream, isLocal, isHost, onRevoke }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className={`relative aspect-video bg-slate-900 rounded-[2rem] overflow-hidden border-2 transition-all duration-500 ${participant.isSpeaking ? 'border-emerald-500 shadow-glow-matrix' : 'border-white/5'}`}>
            {participant.isVideoOn ? (
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted={isLocal} 
                    className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700" 
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
                    <div className="w-20 h-20 bg-brand-gold/5 rounded-full flex items-center justify-center border border-brand-gold/10">
                        <LogoIcon className="h-10 w-10 text-brand-gold opacity-20" />
                    </div>
                    <p className="label-caps !text-[8px] text-gray-600 mt-4 tracking-widest uppercase">Privacy_Active</p>
                </div>
            )}
            
            <div className="absolute bottom-6 left-6 flex items-center gap-3 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10">
                <div className={`w-1.5 h-1.5 rounded-full ${participant.isMicOn ? 'bg-emerald-500 shadow-glow-matrix' : 'bg-red-500'}`}></div>
                <p className="text-[10px] font-black text-white uppercase tracking-widest">
                    {participant.name} {isLocal && '(YOU)'}
                </p>
            </div>

            {isHost && !isLocal && (
                <button 
                    onClick={onRevoke}
                    className="absolute top-6 right-6 p-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl border border-red-500/30 transition-all"
                >
                    <UserMinusIcon className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};

export const VideoMeeting: React.FC<VideoMeetingProps> = ({ user, meetingId, isHost, onEnd }) => {
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [participants, setParticipants] = useState<{ [uid: string]: ParticipantStatus }>({});
    const [remoteStreams, setRemoteStreams] = useState<{ [uid: string]: MediaStream }>({});
    const [timeLeft, setTimeLeft] = useState('00:00:00');
    const [meetingTitle, setMeetingTitle] = useState('Assembly');

    const pcs = useRef<{ [uid: string]: RTCPeerConnection }>({});
    const localStreamRef = useRef<MediaStream | null>(null);
    const initializedRef = useRef(false);
    // Fix: Track join time locally for stable mesh decision logic
    const joinedAtRef = useRef(Date.now());
    const { addToast } = useToast();

    useEffect(() => {
        let timer: number;
        const fetchMeta = async () => {
            const m = await api.joinMeeting(meetingId);
            if (m) {
                setMeetingTitle(m.title);
                timer = window.setInterval(() => {
                    const diff = m.expiresAt.toDate().getTime() - Date.now();
                    if (diff <= 0) {
                        handleManualEnd();
                    } else {
                        const h = Math.floor(diff / 3600000);
                        const m = Math.floor((diff % 3600000) / 60000);
                        const s = Math.floor((diff % 60000) / 1000);
                        setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
                    }
                }, 1000);
            }
        };
        fetchMeta();
        return () => clearInterval(timer);
    }, [meetingId]);

    const createPeerConnection = (targetUid: string) => {
        if (pcs.current[targetUid]) return pcs.current[targetUid];

        const pc = new RTCPeerConnection(servers);
        pcs.current[targetUid] = pc;

        localStreamRef.current?.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
        });

        pc.ontrack = (event) => {
            setRemoteStreams(prev => ({ ...prev, [targetUid]: event.streams[0] }));
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                api.addIceCandidate(meetingId, {
                    candidate: JSON.stringify(event.candidate),
                    sdpMLineIndex: event.candidate.sdpMLineIndex || 0,
                    sdpMid: event.candidate.sdpMid || '',
                    from: user.id,
                    to: targetUid,
                    timestamp: Date.now()
                });
            }
        };

        return pc;
    };

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const init = async () => {
            try {
                localStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                
                // 1. Announce Presence
                await api.updateParticipantStatus(meetingId, user.id, {
                    uid: user.id,
                    name: user.name,
                    joinedAt: joinedAtRef.current,
                    isMicOn: true,
                    isVideoOn: true,
                    isSpeaking: false,
                    role: user.role
                });

                // 2. Listen for other nodes
                api.listenForMeetingSignals(meetingId, async (m) => {
                    if (m.kickedParticipantId === user.id) {
                        addToast("PROTOCOL_BREACH: Assembly entry revoked.", "error");
                        handleManualEnd();
                        return;
                    }
                    setParticipants(m.participants || {});
                    
                    // Cleanup dead peers
                    Object.keys(pcs.current).forEach(uid => {
                        if (!m.participants?.[uid]) {
                            pcs.current[uid].close();
                            delete pcs.current[uid];
                            setRemoteStreams(prev => {
                                const next = { ...prev };
                                delete next[uid];
                                return next;
                            });
                        }
                    });

                    // Auto-handshake with older nodes (Mesh)
                    (Object.values(m.participants || {}) as ParticipantStatus[]).forEach(async (p) => {
                        // Fix: Added null check for p
                        if (p && p.uid !== user.id && p.joinedAt < (m.participants[user.id]?.joinedAt || 0) && !pcs.current[p.uid]) {
                            const pc = createPeerConnection(p.uid);
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            api.addSignal(meetingId, { type: 'offer', sdp: offer.sdp!, from: user.id, to: p.uid, timestamp: Date.now() });
                        }
                    });
                });

                // 3. Listen for Incoming Handshakes
                api.listenForSignals(meetingId, user.id, async (signal) => {
                    const pc = createPeerConnection(signal.from);
                    if (signal.type === 'offer') {
                        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        api.addSignal(meetingId, { type: 'answer', sdp: answer.sdp!, from: user.id, to: signal.from, timestamp: Date.now() });
                    } else if (signal.type === 'answer') {
                        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
                    }
                });

                // 4. Listen for ICE
                api.listenForIce(meetingId, user.id, async (ice) => {
                    const pc = pcs.current[ice.from];
                    if (pc) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(ice.candidate)));
                        } catch (e) {}
                    }
                });

            } catch (e) {
                addToast("Media Access Denied. Check permissions.", "error");
                onEnd();
            }
        };

        init();
        return () => {
            api.updateParticipantStatus(meetingId, user.id, null);
            (Object.values(pcs.current) as RTCPeerConnection[]).forEach(pc => pc.close());
            localStreamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, [meetingId]);

    const handleManualEnd = async () => {
        await api.updateParticipantStatus(meetingId, user.id, null);
        onEnd();
    };

    const toggleMic = () => {
        if (localStreamRef.current) {
            const track = localStreamRef.current.getAudioTracks()[0];
            track.enabled = !track.enabled;
            setIsMicOn(track.enabled);
            api.updateParticipantStatus(meetingId, user.id, { ...participants[user.id], isMicOn: track.enabled, joinedAt: joinedAtRef.current });
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const track = localStreamRef.current.getVideoTracks()[0];
            track.enabled = !track.enabled;
            setIsVideoOn(track.enabled);
            api.updateParticipantStatus(meetingId, user.id, { ...participants[user.id], isVideoOn: track.enabled, joinedAt: joinedAtRef.current });
        }
    };

    const handleKick = (uid: string) => {
        if (isHost) api.updateMeetingSignal(meetingId, { kickedParticipantId: uid });
    };

    const assemblyList = (Object.values(participants) as ParticipantStatus[])
        .filter(p => p !== null) // Fix: Added null filter
        .sort((a, b) => a.joinedAt - b.joinedAt);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans animate-fade-in overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex justify-between items-center z-50">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-brand-gold/10 rounded-xl border border-brand-gold/20 shadow-glow-gold">
                        <ShieldCheckIcon className="h-6 w-6 text-brand-gold" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.3em]">{meetingTitle}</h2>
                        <p className="text-[8px] text-emerald-500 uppercase tracking-widest mt-0.5">{assemblyList.length} Active Nodes</p>
                    </div>
                </div>
                <div className="px-5 py-2.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-3">
                    <ClockIcon className="h-3 w-3 text-brand-gold" />
                    <span className="text-[11px] font-black text-white font-mono tracking-widest">{timeLeft}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-12">
                <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
                    {/* Render self first */}
                    {participants[user.id] && (
                        <ParticipantTile 
                            participant={participants[user.id]} 
                            stream={localStreamRef.current!} 
                            isLocal 
                        />
                    )}
                    {/* Render others */}
                    {assemblyList.filter(p => p.uid !== user.id).map(p => (
                        <ParticipantTile 
                            key={p.uid} 
                            participant={p} 
                            stream={remoteStreams[p.uid]} 
                            isHost={isHost}
                            onRevoke={() => handleKick(p.uid)}
                        />
                    ))}
                    
                    {assemblyList.length === 1 && (
                        <div className="col-span-full py-32 text-center animate-pulse">
                            <LoaderIcon className="h-12 w-12 text-brand-gold mx-auto mb-6 opacity-30 animate-spin" />
                            <p className="label-caps !text-gray-600 !tracking-[0.6em]">Scanning for Assembly Peers...</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-10 bg-slate-900/95 backdrop-blur-3xl border-t border-white/5 flex justify-center items-center gap-6 sm:gap-10 z-50">
                <ControlBtn onClick={toggleMic} active={isMicOn} activeIcon={<MicIcon/>} inactiveIcon={<MicOffIcon/>} color="blue" />
                <button 
                    onClick={handleManualEnd}
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] active:scale-90 transition-all border-4 border-red-900/30"
                >
                    <PhoneOffIcon className="h-8 w-8" />
                </button>
                <ControlBtn onClick={toggleVideo} active={isVideoOn} activeIcon={<VideoIcon/>} inactiveIcon={<VideoOffIcon/>} color="gold" />
            </div>
        </div>
    );
};

const ControlBtn: React.FC<{ onClick: () => void, active: boolean, activeIcon: React.ReactNode, inactiveIcon: React.ReactNode, color: 'blue' | 'gold' }> = ({ onClick, active, activeIcon, inactiveIcon, color }) => (
    <button 
        onClick={onClick}
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-3xl flex items-center justify-center transition-all border-2 active:scale-90 shadow-xl
            ${active 
                ? 'bg-slate-800 border-white/10 text-white hover:bg-slate-700 shadow-inner' 
                : color === 'blue' ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-blue-900/30' : 'bg-brand-gold/20 border-brand-gold text-brand-gold shadow-glow-gold/30'}
        `}
    >
        {active ? activeIcon : inactiveIcon}
    </button>
);