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
    const [remoteStatus, setRemoteStatus] = useState<ParticipantStatus>({ isVideoOn: true, isMicOn: true, isSpeaking: false });
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

    // Re-attach hardware streams whenever video state or stage layout changes
    useEffect(() => {
        if (isVideoOn && localVideoRef.current && localStream.current) {
            localVideoRef.current.srcObject = localStream.current;
        }
    }, [isVideoOn, isLocalExpanded]);

    // Temporal Countdown Protocol
    useEffect(() => {
        let expiryDate: Date | null = null;
        const fetchMeta = async () => {
            try {
                const m = await api.joinMeeting(meetingId);
                if (m) {
                    setMeetingTitle(m.title);
                    expiryDate = m.expiresAt.toDate();
                }
            } catch (e) {}
        };
        fetchMeta();

        const timer = setInterval(() => {
            if (!expiryDate) return;
            const diff = expiryDate.getTime() - Date.now();
            if (diff <= 0) {
                clearInterval(timer);
                addToast("PROTOCOL_EXPIRED: stipulated time reached.", "info");
                handleManualEnd();
                return;
            }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(timer);
    }, [meetingId]);

    const stopProtocol = async () => {
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
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };

    // Acoustic Pulse Detection
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
            let lastUpdate = 0;
            let currentSpeakingState = false;

            const checkVolume = () => {
                if (!analyser.current) return;
                analyser.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                const isNowSpeaking = average > 35;
                if (isNowSpeaking !== currentSpeakingState) {
                    currentSpeakingState = isNowSpeaking;
                    setIsSpeaking(isNowSpeaking);
                    const now = Date.now();
                    if (now - lastUpdate > 500) {
                        api.updateMeetingSignal(meetingId, {
                            [isHost ? 'callerStatus' : 'calleeStatus']: { isVideoOn, isMicOn, isSpeaking: isNowSpeaking }
                        });
                        lastUpdate = now;
                    }
                }
                requestAnimationFrame(checkVolume);
            };
            checkVolume();
        } catch (e) {
            console.error("Audio detection failure", e);
        }
    }, [isMicOn, isVideoOn, meetingId, isHost]);

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
                        addToast("AUTHORITY_SIGNAL: Protocol terminated by Host.", "error");
                        handleManualEnd();
                        return;
                    }
                    if (isHost) {
                        if (m.answer && !pc.current?.currentRemoteDescription) {
                            await pc.current?.setRemoteDescription(new RTCSessionDescription(m.answer));
                        }
                        if (m.calleeStatus) setRemoteStatus(m.calleeStatus);
                    } else {
                        if (m.offer && !pc.current?.currentRemoteDescription) {
                            await pc.current?.setRemoteDescription(new RTCSessionDescription(m.offer));
                            const answer = await pc.current?.createAnswer();
                            await pc.current?.setLocalDescription(answer);
                            await api.updateMeetingSignal(meetingId, { answer: { type: answer?.type, sdp: answer?.sdp } });
                        }
                        if (m.callerStatus) setRemoteStatus(m.callerStatus);
                    }
                });

                if (isHost) {
                    const offer = await pc.current.createOffer();
                    await pc.current.setLocalDescription(offer);
                    await api.updateMeetingSignal(meetingId, { 
                        offer: { type: offer.type, sdp: offer.sdp },
                        callerStatus: { isVideoOn: true, isMicOn: true, isSpeaking: false }
                    });
                    api.listenForIceCandidates(meetingId, 'callee', (c) => pc.current?.addIceCandidate(new RTCIceCandidate(c)));
                } else {
                    await api.updateMeetingSignal(meetingId, { calleeStatus: { isVideoOn: true, isMicOn: true, isSpeaking: false } });
                    api.listenForIceCandidates(meetingId, 'caller', (c) => pc.current?.addIceCandidate(new RTCIceCandidate(c)));
                }
                return () => unsub();
            } catch (e) {
                console.error("WebRTC Handshake Failure:", e);
                addToast("Identity sync failed.", "error");
                onEnd();
            }
        };

        startCall();
        return () => { stopProtocol(); };
    }, [meetingId, isHost, user.id]);

    const toggleMic = () => {
        if (localStream.current) {
            const track = localStream.current.getAudioTracks()[0];
            track.enabled = !track.enabled;
            setIsMicOn(track.enabled);
            api.updateMeetingSignal(meetingId, {
                [isHost ? 'callerStatus' : 'calleeStatus']: { isVideoOn, isMicOn: track.enabled, isSpeaking: false }
            });
        }
    };

    const toggleVideo = () => {
        if (localStream.current) {
            const track = localStream.current.getVideoTracks()[0];
            track.enabled = !track.enabled;
            setIsVideoOn(track.enabled);
            api.updateMeetingSignal(meetingId, {
                [isHost ? 'callerStatus' : 'calleeStatus']: { isVideoOn: track.enabled, isMicOn, isSpeaking }
            });
        }
    };

    const handleKickPeer = async () => {
        if (!isHost) return;
        try {
            await api.updateMeetingSignal(meetingId, { kickedParticipantId: 'GUEST_ID_PLACEHOLDER' });
            addToast("Peer node purged.", "info");
        } catch(e) {}
    };

    const handleManualEnd = async () => {
        await stopProtocol();
        onEnd();
    };

    const renderMainStage = () => {
        const showingRemoteOnMain = !isLocalExpanded;
        const targetIsVideoOn = showingRemoteOnMain ? remoteStatus.isVideoOn : isVideoOn;
        const targetRef = showingRemoteOnMain ? remoteVideoRef : localVideoRef;
        const targetSpeaking = showingRemoteOnMain ? remoteStatus.isSpeaking : isSpeaking;
        const targetLabel = showingRemoteOnMain ? (isHost ? 'Guest Citizen' : 'Meeting Host') : 'Sovereign Identity (YOU)';

        return (
            <div 
                onClick={() => isLocalExpanded && setIsLocalExpanded(false)}
                className={`w-full h-full relative rounded-[3rem] overflow-hidden bg-slate-900 border-4 transition-all duration-500 group shadow-2xl ${isLocalExpanded ? 'cursor-zoom-out' : ''} ${targetSpeaking ? 'border-emerald-500/50 shadow-glow-matrix' : 'border-white/5'}`}
            >
                {targetIsVideoOn ? (
                    <video ref={targetRef} autoPlay playsInline muted={!showingRemoteOnMain} className="w-full h-full object-cover grayscale-[10%]" />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 animate-fade-in">
                        <LogoIcon className="h-24 w-24 text-brand-gold opacity-20 animate-pulse-soft" />
                        <p className="label-caps !text-[10px] !text-gray-600 mt-6 !tracking-[0.5em]">Identity_Proxy_Active</p>
                    </div>
                )}
                
                {showingRemoteOnMain && !remoteConnected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20">
                        <LoaderIcon className="h-12 w-12 animate-spin text-brand-gold opacity-30" />
                        <p className="label-caps !text-[10px] !text-gray-500 animate-pulse mt-6 tracking-[0.5em]">Establishing_Handshake...</p>
                    </div>
                )}

                <div className="absolute top-10 left-10 flex items-center gap-4 z-30">
                    <div className={`px-4 py-2 backdrop-blur-md rounded-xl border ${!showingRemoteOnMain && isHost ? 'bg-brand-gold text-slate-950 border-brand-gold/30' : 'bg-black/60 text-white border-white/10'}`}>
                        <p className="text-[9px] font-black uppercase tracking-widest">{targetLabel}</p>
                    </div>
                    {isHost && showingRemoteOnMain && remoteConnected && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleKickPeer(); }}
                            className="p-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl border border-red-500/30 transition-all opacity-0 group-hover:opacity-100"
                            title="Purge Node"
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
        const targetIsVideoOn = showingLocalOnPiP ? isVideoOn : remoteStatus.isVideoOn;
        const targetRef = showingLocalOnPiP ? localVideoRef : remoteVideoRef;
        const targetSpeaking = showingLocalOnPiP ? isSpeaking : remoteStatus.isSpeaking;
        const targetMicOn = showingLocalOnPiP ? isMicOn : remoteStatus.isMicOn;

        return (
            <div 
                onClick={() => !isLocalExpanded && setIsLocalExpanded(true)}
                className={`absolute bottom-28 right-10 sm:bottom-12 sm:right-12 w-32 h-44 sm:w-48 sm:h-64 rounded-3xl overflow-hidden border-2 transition-all duration-300 shadow-glow-gold z-40 bg-slate-800 cursor-zoom-in ${targetSpeaking ? 'border-emerald-500 scale-105' : 'border-brand-gold/40 hover:border-brand-gold'}`}
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
                    <div className={`w-1.5 h-1.5 rounded-full ${targetMicOn ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <p className="text-[8px] font-black text-white uppercase tracking-widest">
                        {showingLocalOnPiP ? 'YOU' : 'PEER'}
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
                    <div className="px-4 py-2 bg-white/5 rounded-full border border-white/5 flex items-center gap-3">
                        <ClockIcon className="h-3 w-3 text-brand-gold" />
                        <span className="text-[10px] font-black text-white font-mono">{timeLeft}</span>
                    </div>
                    {isSpeaking && (
                        <div className="hidden sm:flex px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 animate-pulse">
                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">TX_Active</span>
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
                    title="Leave Handshake"
                >
                    <PhoneOffIcon className="h-8 w-8" />
                </button>
                <ControlBtn onClick={toggleVideo} active={isVideoOn} activeIcon={<VideoIcon/>} inactiveIcon={<VideoOffIcon/>} color="gold" />
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none text-center">
                <p className="text-[7px] font-black text-gray-500 uppercase tracking-[0.6em] whitespace-nowrap">P2P Encryption &bull; NO LOG PROTOCOL &bull; SOVEREIGN IDENTITY</p>
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
