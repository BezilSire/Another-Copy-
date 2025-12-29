
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
                         <button onClick={onDemote} className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-500 hover:text-white rounded-xl border border-blue-500/30 transition-all" title="Move to Assembly">↓</button>
                    ) : (
                         <button onClick={onPromote} className="p-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-xl border border-emerald-500/30 transition-all" title="Invite to Stage">↑</button>
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
    }, [meetingId]);

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
                // 1. Announce Presence
                // FIX: Added missing properties 'isRequestingStage' and 'isOnStage' to satisfy ParticipantStatus interface
                await api.updateParticipantStatus(meetingId, user.id, {
                    uid: user.id, 
                    name: user.name, 
                    joinedAt: joinedAtRef.current,
                    isMicOn: true, 
                    isVideoOn: true, 
                    isSpeaking: false,
                    isRequestingStage: false, 
                    isOnStage: isHost, 
                    role: user.role
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
                    const pc = createPeerConnection(