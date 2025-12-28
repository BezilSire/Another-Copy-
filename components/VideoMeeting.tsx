
import React, { useState, useEffect, useRef } from 'react';
import { User, Meeting, ParticipantStatus } from '../types';
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

export const VideoMeeting: React.FC<VideoMeetingProps> = ({ user, meetingId, isHost, onEnd }) => {
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [remoteParticipants, setRemoteParticipants] = useState<{ [uid: string]: ParticipantStatus }>({});
    const [remoteConnected, setRemoteConnected] = useState(false);
    const [isLocalExpanded, setIsLocalExpanded] = useState(false);
    const [meetingTitle, setMeetingTitle] = useState('Sovereign Meeting');
    const [timeLeft, setTimeLeft] = useState('00:00:00');
    
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pc = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const analyser = useRef<AnalyserNode | null>(null);
    const initializedRef = useRef(false);
    const { addToast } = useToast();

    // Fix: Added explicit type casting to resolve 'unknown' property access errors
    const remoteParticipant = Object.values(remoteParticipants)[0] as ParticipantStatus | undefined;

    useEffect(() => {
        if (isVideoOn && localVideoRef.current && localStream.current) {
            localVideoRef.current.srcObject = localStream.current;
        }
    }, [isVideoOn, isLocalExpanded]);

    useEffect(() => {
        let expiryDate: Date | null = null;
        const fetchMeta = async () => {
            try {
                const m = await api.joinMeeting(meetingId);
                if (m) {
                    setMeetingTitle(m.title);
                    expiryDate = m.expiresAt.toDate();
                    
                    // If we are joining an existing meeting, we need to clear previous signaling state
                    // if it was stale, but the WebRTC standard handles most of this.
                }
            } catch (e) {}
        };
        fetchMeta();

        const timer = setInterval(() => {
            if (!expiryDate) return;
            const diff = expiryDate.getTime() - Date.now();
            if (diff <= 0) {
                clearInterval(timer);
                addToast("STIPULATED_TIME_ELAPSED: Handshake terminated.", "info");
                handleManualEnd();
                return;
            }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(timer);
    }, [meetingId, addToast]);

    const stopProtocol = async () => {
        // Remove self from participants list in DB so others see we left
        try {
            await api.updateMeetingSignal(meetingId, { [`participants.${user.id}`]: null } as any);
        } catch (e) {}

        if (localStream.current) {
            localStream.current.getTracks().forEach(track => track.stop());
            localStream.current = null;
        }
        if (pc.current) {
            pc.current.ontrack = null;
            pc.current.onicecandidate = null;
            pc.current.close();
            pc.current = null;
        }
        if (audioContext.current) {
            audioContext.current.close();
            audioContext.current = null;
        }
    };

    // Voice Activity Detection
    useEffect(() => {
        if (!localStream.current || !isMicOn) return;
        try {
            audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyser.current = audioContext.current.createAnalyser();
            const source = audioContext.current.createMediaStreamSource(localStream.current);
            source.connect(analyser.current);
            analyser.current.fftSize = 256;
            const bufferLength = analyser.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            let currentSpeakingState = false;

            const checkVolume = () => {
                if (!analyser.current) return;
                analyser.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                const isNowSpeaking = average > 35;
                if (isNowSpeaking !== currentSpeakingState) {
                    currentSpeakingState = isNowSpeaking;
                    setIsSpeaking(isNowSpeaking);
                    api.updateParticipantStatus(meetingId, user.id, {
                        uid: user.id,
                        name: user.name,
                        isVideoOn,
                        isMicOn,
                        isSpeaking: isNowSpeaking,
                        role: user.role
                    });
                }
                requestAnimationFrame(checkVolume);
            };
            checkVolume();
        } catch (e) {
            console.error("Audio analyser failed", e);
        }
    }, [isMicOn, isVideoOn, meetingId, user.id, user.name, user.role, isSpeaking]);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const startCall = async () => {
            try {
                localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;

                pc.current = new RTCPeerConnection(servers);
                localStream.current.getTracks().forEach(track => {
                    pc.current?.addTrack(track, localStream.current!);
                });

                pc.current.ontrack = (event) => {
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                        setRemoteConnected(true);
                    }
                };

                pc.current.onicecandidate = (event) => {
                    if (event.candidate) {
                        api.addIceCandidate(meetingId, isHost ? 'caller' : 'callee', event.candidate.toJSON());
                    }
                };

                const unsub = api.listenForMeetingSignals(meetingId, async (m) => {
                    if (m.kickedParticipantId === user.id) {
                        addToast("PROTOCOL_BREACH: Access revoked by host.", "error");
                        handleManualEnd();
                        return;
                    }
                    
                    setRemoteParticipants(Object.fromEntries(
                        Object.entries(m.participants || {}).filter(([uid, data]) => uid !== user.id && data !== null)
                    ));

                    if (isHost) {
                        if (m.answer && !pc.current?.currentRemoteDescription) {
                            await pc.current?.setRemoteDescription(new RTCSessionDescription(m.answer));
                        }
                    } else {
                        if (m.offer && !pc.current?.currentRemoteDescription) {
                            await pc.current?.setRemoteDescription(new RTCSessionDescription(m.offer));
                            const answer = await pc.current?.createAnswer();
                            await pc.current?.setLocalDescription(answer!);
                            await api.updateMeetingSignal(meetingId, { answer: { type: answer?.type, sdp: answer?.sdp } });
                        }
                    }
                });

                if (isHost) {
                    const offer = await pc.current.createOffer();
                    await pc.current.setLocalDescription(offer);
                    await api.updateMeetingSignal(meetingId, { offer: { type: offer.type, sdp: offer.sdp } });
                    api.listenForIceCandidates(meetingId, 'callee', (c) => pc.current?.addIceCandidate(new RTCIceCandidate(c)));
                } else {
                    api.listenForIceCandidates(meetingId, 'caller', (c) => pc.current?.addIceCandidate(new RTCIceCandidate(c)));
                    // Add self to participants
                    api.updateParticipantStatus(meetingId, user.id, {
                        uid: user.id,
                        name: user.name,
                        isVideoOn: true,
                        isMicOn: true,
                        isSpeaking: false,
                        role: user.role
                    });
                }
                return () => unsub();
            } catch (e) {
                console.error("WebRTC Protocol failure:", e);
                addToast("Media handshake failed. Ensure camera/mic permissions.", "error");
                onEnd();
            }
        };

        startCall();
        return () => { stopProtocol(); };
    }, [meetingId, isHost, user.id, addToast, onEnd, user.name, user.role]);

    const toggleMic = () => {
        if (localStream.current) {
            const track = localStream.current.getAudioTracks()[0];
            track.enabled = !track.enabled;
            setIsMicOn(track.enabled);
            api.updateParticipantStatus(meetingId, user.id, {
                uid: user.id,
                name: user.name,
                isVideoOn,
                isMicOn: track.enabled,
                isSpeaking,
                role: user.role
            });
        }
    };

    const toggleVideo = () => {
        if (localStream.current) {
            const track = localStream.current.getVideoTracks()[0];
            track.enabled = !track.enabled;
            setIsVideoOn(track.enabled);
            api.updateParticipantStatus(meetingId, user.id, {
                uid: user.id,
                name: user.name,
                isVideoOn: track.enabled,
                isMicOn,
                isSpeaking,
                role: user.role
            });
        }
    };

    const handleKickPeer = async (uid: string) => {
        if (!isHost) return;
        try {
            await api.updateMeetingSignal(meetingId, { kickedParticipantId: uid });
            addToast("Peer revoked.", "info");
        } catch(e) {}
    };

    const handleManualEnd = async () => {
        await stopProtocol();
        onEnd();
    };

    const renderMainStage = () => {
        const showingRemoteOnMain = !isLocalExpanded;
        const targetIsVideoOn = showingRemoteOnMain ? (remoteParticipant?.isVideoOn ?? true) : isVideoOn;
        const targetRef = showingRemoteOnMain ? remoteVideoRef : localVideoRef;
        const targetSpeaking = showingRemoteOnMain ? remoteParticipant?.isSpeaking : isSpeaking;
        const targetLabel = showingRemoteOnMain ? (remoteParticipant?.name || 'Awaiting Peer...') : `${user.name} (YOU)`;

        return (
            <div 
                onClick={() => isLocalExpanded && setIsLocalExpanded(false)}
                className={`w-full h-full relative rounded-[3rem] overflow-hidden bg-slate-900 border-4 transition-all duration-500 group shadow-2xl ${isLocalExpanded ? 'cursor-zoom-out' : ''} ${targetSpeaking ? 'border-emerald-500/50 shadow-glow-matrix' : 'border-white/5'}`}
            >
                {targetIsVideoOn ? (
                    <video ref={targetRef} autoPlay playsInline muted={!showingRemoteOnMain} className="w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 animate-fade-in">
                        <div className="w-40 h-40 bg-brand-gold/5 rounded-full flex items-center justify-center border border-brand-gold/10">
                            <LogoIcon className="h-24 w-24 text-brand-gold opacity-20" />
                        </div>
                        <p className="label-caps !text-[10px] !text-gray-600 mt-8 !tracking-[0.5em]">Identity_Privacy_Active</p>
                    </div>
                )}
                
                {showingRemoteOnMain && !remoteConnected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-20">
                        <LoaderIcon className="h-12 w-12 animate-spin text-brand-gold opacity-30" />
                        <p className="label-caps !text-[10px] !text-gray-500 animate-pulse mt-6 tracking-[0.5em]">Establishing_Handshake...</p>
                    </div>
                )}

                <div className="absolute top-10 left-10 flex items-center gap-4 z-30">
                    <div className={`px-5 py-2.5 backdrop-blur-md rounded-2xl border ${!showingRemoteOnMain && isHost ? 'bg-brand-gold text-slate-950 border-brand-gold/30' : 'bg-black/60 text-white border-white/10'}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest">{targetLabel}</p>
                    </div>
                    {isHost && showingRemoteOnMain && remoteConnected && remoteParticipant && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleKickPeer(remoteParticipant.uid); }}
                            className="p-2.5 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl border border-red-500/30 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <UserMinusIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderPiP = () => {
        const showingLocalOnPiP = !isLocalExpanded;
        const targetIsVideoOn = showingLocalOnPiP ? isVideoOn : (remoteParticipant?.isVideoOn ?? true);
        const targetRef = showingLocalOnPiP ? localVideoRef : remoteVideoRef;
        const targetSpeaking = showingLocalOnPiP ? isSpeaking : remoteParticipant?.isSpeaking;
        const targetMicOn = showingLocalOnPiP ? isMicOn : (remoteParticipant?.isMicOn ?? true);

        return (
            <div 
                onClick={() => !isLocalExpanded && setIsLocalExpanded(true)}
                className={`absolute bottom-28 right-10 sm:bottom-12 sm:right-12 w-32 h-44 sm:w-48 sm:h-64 rounded-3xl overflow-hidden border-2 transition-all duration-300 shadow-glow-gold z-40 bg-slate-800 cursor-zoom-in ${targetSpeaking ? 'border-emerald-500 scale-105 shadow-glow-matrix' : 'border-brand-gold/40 hover:border-brand-gold'}`}
            >
                {targetIsVideoOn ? (
                    <video ref={targetRef} autoPlay playsInline muted={showingLocalOnPiP} className="w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                        <LogoIcon className="h-10 w-10 text-brand-gold opacity-30" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${targetMicOn ? 'bg-emerald-500 animate-pulse shadow-glow-matrix' : 'bg-red-500 shadow-glow-red'}`}></div>
                    <p className="text-[8px] font-black text-white uppercase tracking-widest">
                        {showingLocalOnPiP ? 'YOU' : remoteParticipant?.name || 'PEER'}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans animate-fade-in select-none overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex justify-between items-center z-50">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-brand-gold/10 rounded-xl border border-brand-gold/20 shadow-glow-gold">
                        <ShieldCheckIcon className="h-6 w-6 text-brand-gold" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] truncate max-w-[150px] sm:max-w-none">{meetingTitle}</h2>
                        <p className="text-[8px] text-emerald-500 uppercase tracking-widest mt-0.5">Anchor_ID: {meetingId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-5 py-2.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-3">
                        <ClockIcon className="h-3 w-3 text-brand-gold" />
                        <span className="text-[11px] font-black text-white font-mono tracking-widest">{timeLeft}</span>
                    </div>
                    {isSpeaking && (
                        <div className="hidden sm:flex px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 animate-pulse">
                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">TRANSMITTING...</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 relative bg-slate-950 overflow-hidden p-4 sm:p-8">
                {renderMainStage()}
                {renderPiP()}
            </div>

            <div className="p-8 sm:p-10 bg-slate-900/95 backdrop-blur-3xl border-t border-white/5 flex justify-center items-center gap-6 sm:gap-10 z-50">
                <ControlBtn onClick={toggleMic} active={isMicOn} activeIcon={<MicIcon/>} inactiveIcon={<MicOffIcon/>} color="blue" />
                <button 
                    onClick={handleManualEnd}
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] active:scale-90 transition-all border-4 border-red-900/30"
                    title="Terminate Handshake"
                >
                    <PhoneOffIcon className="h-8 w-8" />
                </button>
                <ControlBtn onClick={toggleVideo} active={isVideoOn} activeIcon={<VideoIcon/>} inactiveIcon={<VideoOffIcon/>} color="gold" />
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none text-center">
                <p className="text-[7px] font-black text-gray-500 uppercase tracking-[0.6em] whitespace-nowrap">P2P Encryption & bull; SOVEREIGN ASSEMBLY</p>
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
