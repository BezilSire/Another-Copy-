
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { ArrowUpRightIcon } from './icons/ArrowUpRightIcon';
import { HandIcon } from './icons/HandIcon';
import { XCircleIcon } from './icons/XCircleIcon';

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
    onPromote?: () => void;
    onDemote?: () => void;
    onRevoke?: () => void;
    size?: 'large' | 'small';
}> = ({ participant, stream, isLocal, isHost, onPromote, onDemote, onRevoke, size = 'large' }) => {
    
    const videoRef = useCallback((node: HTMLVideoElement | null) => {
        if (node && stream && participant.isVideoOn) {
            node.srcObject = stream;
            node.play().catch(e => console.debug("Autoplay interrupted:", e));
        }
    }, [stream, participant.isVideoOn]);

    return (
        <div className={`relative bg-slate-900 rounded-[2rem] overflow-hidden border-2 transition-all duration-500 ${size === 'large' ? 'aspect-video' : 'aspect-square'} ${participant.isSpeaking ? 'border-emerald-500 shadow-glow-matrix scale-[1.02]' : 'border-white/5'}`}>
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
                    <div className="w-16 h-16 bg-brand-gold/5 rounded-full flex items-center justify-center border border-brand-gold/10">
                        <LogoIcon className="h-8 w-8 text-brand-gold opacity-20" />
                    </div>
                </div>
            )}
            
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
                    <div className={`w-1 h-1 rounded-full flex-shrink-0 ${participant.isMicOn ? 'bg-emerald-500 shadow-glow-matrix' : 'bg-red-500'}`}></div>
                    <p className="text-[8px] font-black text-white uppercase tracking-widest truncate">
                        {participant.name}
                    </p>
                </div>
                {participant.isRequestingStage && !participant.isOnStage && (
                     <div className="bg-yellow-500 p-1.5 rounded-lg shadow-lg animate-bounce">
                        <HandIcon className="h-3 w-3 text-black" />
                    </div>
                )}
            </div>

            {isHost && !isLocal && (
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <button onClick={onRevoke} className="p-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl border border-red-500/30 transition-all" title="Remove Node"><UserMinusIcon className="h-3 w-3" /></button>
                    {participant.isOnStage ? (
                         <button onClick={onDemote} className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-500 hover:text-white rounded-xl border border-red-500/30 transition-all" title="Move to Assembly">↓</button>
                    ) : (
                         <button onClick={onPromote} className="p-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-xl border border-red-500/30 transition-all" title="Invite to Stage">↑</button>
                    )}
                </div>
            )}
        </div>
    );
};

export const VideoMeeting: React.FC<VideoMeetingProps> = ({ user, meetingId, isHost, onEnd }) => {
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [participants, setParticipants] = useState<{ [uid: string]: ParticipantStatus }>({});
    const [remoteStreams, setRemoteStreams] = useState<{ [uid: string]: MediaStream }>({});
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [timeLeft, setTimeLeft] = useState('00:00:00');
    const [meetingTitle, setMeetingTitle] = useState('Sovereign Assembly');

    const pcs = useRef<{ [uid: string]: RTCPeerConnection }>({});
    const initializedRef = useRef(false);
    const joinedAtRef = useRef(Date.now());
    const { addToast } = useToast();

    // Protocol Shutdown (Individual Exit)
    const handleManualEnd = useCallback(async () => { 
        await api.updateParticipantStatus(meetingId, user.id, null); 
        onEnd(); 
    }, [meetingId, user.id, onEnd]);

    // Decommission Protocol (Early Finish for All)
    const handleDecommission = useCallback(async () => {
        if (!isHost) return;
        if (!window.confirm("CRITICAL PROTOCOL: Terminate meeting for all peers? This action is immutable.")) return;
        try {
            await api.deleteMeeting(meetingId);
            onEnd();
        } catch (e) {
            addToast("Decommission failed.", "error");
        }
    }, [isHost, meetingId, onEnd, addToast]);

    useEffect(() => {
        let timer: number;
        const fetchMeta = async () => {
            const m = await api.joinMeeting(meetingId);
            if (m) {
                setMeetingTitle(m.title);
                timer = window.setInterval(() => {
                    const diff = m.expiresAt.toDate().getTime() - Date.now();
                    if (diff <= 0) handleManualEnd();
                    else {
                        const h = Math.floor(diff / 3600000);
                        const min = Math.floor((diff % 3600000) / 60000);
                        const s = Math.floor((diff % 60000) / 1000);
                        setTimeLeft(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
                    }
                }, 1000);
            }
        };
        fetchMeta();
        return () => clearInterval(timer);
    }, [meetingId, handleManualEnd]);

    const createPeerConnection = (targetUid: string, stream: MediaStream) => {
        if (pcs.current[targetUid]) return pcs.current[targetUid];
        const pc = new RTCPeerConnection(servers);
        pcs.current[targetUid] = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.ontrack = (event) => setRemoteStreams(prev => ({ ...prev, [targetUid]: event.streams[0] }));
        pc.onicecandidate = (event) => {
            if (event.candidate) api.addIceCandidate(meetingId, { candidate: JSON.stringify(event.candidate), sdpMLineIndex: event.candidate.sdpMLineIndex || 0, sdpMid: event.candidate.sdpMid || '', from: user.id, to: targetUid, timestamp: Date.now() });
        };
        return pc;
    };

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
                await api.updateParticipantStatus(meetingId, user.id, {
                    uid: user.id, name: user.name, joinedAt: joinedAtRef.current,
                    isMicOn: true, isVideoOn: true, isSpeaking: false,
                    isRequestingStage: false, isOnStage: isHost, role: user.role
                });
                api.listenForMeetingSignals(meetingId, async (m) => {
                    if (m.kickedParticipantId === user.id) { onEnd(); return; }
                    setParticipants(m.participants || {});
                    Object.keys(pcs.current).forEach(uid => { if (!m.participants?.[uid]) { pcs.current[uid].close(); delete pcs.current[uid]; setRemoteStreams(prev => { const n = { ...prev }; delete n[uid]; return n; }); } });
                    (Object.values(m.participants || {}) as ParticipantStatus[]).forEach(async (p) => {
                        if (p && p.uid !== user.id && p.joinedAt < (m.participants[user.id]?.joinedAt || 0) && !pcs.current[p.uid]) {
                            const pc = createPeerConnection(p.uid, stream);
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            api.addSignal(meetingId, { type: 'offer', sdp: offer.sdp!, from: user.id, to: p.uid, timestamp: Date.now() });
                        }
                    });
                });
                api.listenForSignals(meetingId, user.id, async (signal) => {
                    const pc = createPeerConnection(signal.from, stream);
                    if (signal.type === 'offer') {
                        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        api.addSignal(meetingId, { type: 'answer', sdp: answer.sdp!, from: user.id, to: signal.from, timestamp: Date.now() });
                    } else if (signal.type === 'answer') await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
                });
                api.listenForIce(meetingId, user.id, async (ice) => {
                    const pc = pcs.current[ice.from];
                    if (pc) try { await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(ice.candidate))); } catch (e) {}
                });
            } catch (e) { addToast("Media Access Denied. Verify permissions.", "error"); onEnd(); }
        };
        init();
        return () => {
            api.updateParticipantStatus(meetingId, user.id, null);
            (Object.values(pcs.current) as RTCPeerConnection[]).forEach(pc => pc.close());
            localStream?.getTracks().forEach(t => t.stop());
        };
    }, [meetingId]);

    const toggleMic = () => { if (localStream) { const t = localStream.getAudioTracks()[0]; t.enabled = !t.enabled; setIsMicOn(t.enabled); api.updateParticipantStatus(meetingId, user.id, { ...participants[user.id], isMicOn: t.enabled }); } };
    const toggleVideo = () => { if (localStream) { const t = localStream.getVideoTracks()[0]; t.enabled = !t.enabled; setIsVideoOn(t.enabled); api.updateParticipantStatus(meetingId, user.id, { ...participants[user.id], isVideoOn: t.enabled }); } };
    const toggleHand = () => { const s = !isHandRaised; setIsHandRaised(s); api.updateParticipantStatus(meetingId, user.id, { ...participants[user.id], isRequestingStage: s }); };

    const manageStage = (uid: string, stage: boolean) => {
        if (!isHost) return;
        const target = participants[uid];
        if (target) api.updateParticipantStatus(meetingId, uid, { ...target, isOnStage: stage, isRequestingStage: false });
    };

    const handleKick = (uid: string) => { if (isHost) api.updateMeetingSignal(meetingId, { kickedParticipantId: uid }); };

    const assemblyList = (Object.values(participants) as ParticipantStatus[]).filter(p => p && p.uid).sort((a, b) => a.joinedAt - b.joinedAt);
    const stageNodes = assemblyList.filter(p => p.isOnStage);
    const assemblyNodes = assemblyList.filter(p => !p.isOnStage);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans animate-fade-in overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex justify-between items-center z-50">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-brand-gold/10 rounded-xl border border-brand-gold/20 shadow-glow-gold"><ShieldCheckIcon className="h-6 w-6 text-brand-gold" /></div>
                    <div><h2 className="text-sm font-black text-white uppercase tracking-[0.3em]">{meetingTitle}</h2><p className="text-[8px] text-emerald-500 uppercase tracking-widest mt-0.5">{assemblyList.length} Nodes Online</p></div>
                </div>
                <div className="px-5 py-2.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-3"><ClockIcon className="h-3 w-3 text-brand-gold" /><span className="text-[11px] font-black text-white font-mono tracking-widest">{timeLeft}</span></div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-12 space-y-12">
                <div className="max-w-7xl mx-auto space-y-6">
                    <p className="label-caps !text-[9px] text-gray-500 !tracking-[0.4em] px-4">Primary Stage (Max 5 Nodes)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stageNodes.map(p => (
                            <ParticipantTile 
                                key={p.uid} 
                                participant={p} 
                                stream={p.uid === user.id ? localStream! : remoteStreams[p.uid]} 
                                isLocal={p.uid === user.id} 
                                isHost={isHost} 
                                onDemote={() => manageStage(p.uid, false)} 
                                onRevoke={() => handleKick(p.uid)}
                            />
                        ))}
                    </div>
                </div>

                {assemblyNodes.length > 0 && (
                    <div className="max-w-7xl mx-auto space-y-6 border-t border-white/5 pt-12">
                        <p className="label-caps !text-[9px] text-gray-500 !tracking-[0.4em] px-4">Assembly Tray</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                            {assemblyNodes.map(p => (
                                <ParticipantTile 
                                    key={p.uid} 
                                    size="small"
                                    participant={p} 
                                    stream={p.uid === user.id ? localStream! : remoteStreams[p.uid]} 
                                    isLocal={p.uid === user.id} 
                                    isHost={isHost} 
                                    onPromote={() => manageStage(p.uid, true)} 
                                    onRevoke={() => handleKick(p.uid)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-8 bg-slate-900/95 backdrop-blur-3xl border-t border-white/5 flex justify-center items-center gap-4 sm:gap-8 z-50">
                <ControlBtn onClick={toggleMic} active={isMicOn} activeIcon={<MicIcon/>} inactiveIcon={<MicOffIcon/>} color="blue" />
                <ControlBtn onClick={toggleVideo} active={isVideoOn} activeIcon={<VideoIcon/>} inactiveIcon={<VideoOffIcon/>} color="gold" />
                <button 
                    onClick={toggleHand}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-3xl flex items-center justify-center transition-all border-2 active:scale-90 shadow-xl
                        ${isHandRaised ? 'bg-yellow-500 border-yellow-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-slate-800 border-white/10 text-gray-400 hover:text-white'}
                    `}
                >
                    <HandIcon className="h-6 w-6" />
                </button>
                <div className="flex flex-col items-center gap-2">
                    <button 
                        onClick={handleManualEnd}
                        className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-700 hover:bg-slate-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all border-4 border-slate-600/30"
                    >
                        <XCircleIcon className="h-8 w-8" />
                    </button>
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Leave Stage</span>
                </div>
                {isHost && (
                    <div className="flex flex-col items-center gap-2">
                        <button 
                            onClick={handleDecommission}
                            className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] active:scale-90 transition-all border-4 border-red-900/30"
                        >
                            <PhoneOffIcon className="h-8 w-8" />
                        </button>
                        <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Decommission</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const ControlBtn: React.FC<{ onClick: () => void, active: boolean, activeIcon: React.ReactNode, inactiveIcon: React.ReactNode, color: 'blue' | 'gold' }> = ({ onClick, active, activeIcon, inactiveIcon, color }) => (
    <button onClick={onClick} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-3xl flex items-center justify-center transition-all border-2 active:scale-90 shadow-xl ${active ? 'bg-slate-800 border-white/10 text-white hover:bg-slate-700 shadow-inner' : color === 'blue' ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-blue-900/30' : 'bg-brand-gold/20 border-brand-gold text-brand-gold shadow-glow-gold/30'}`}>{active ? activeIcon : inactiveIcon}</button>
);
