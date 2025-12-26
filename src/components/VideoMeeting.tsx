
import React, { useState, useEffect, useRef } from 'react';
import { User, Meeting } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { MicIcon } from './icons/MicIcon';
import { MicOffIcon } from './icons/MicOffIcon';
import { VideoIcon } from './icons/VideoIcon';
import { VideoOffIcon } from './icons/VideoOffIcon';
import { PhoneOffIcon } from './icons/PhoneOffIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

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
    const [isConnecting, setIsConnecting] = useState(true);
    const [remoteConnected, setRemoteConnected] = useState(false);
    
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pc = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        const startCall = async () => {
            try {
                // 1. Get User Media
                localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;

                // 2. Setup Peer Connection
                pc.current = new RTCPeerConnection(servers);

                // Add local tracks to PC
                localStream.current.getTracks().forEach(track => {
                    pc.current?.addTrack(track, localStream.current!);
                });

                // Listen for remote tracks
                pc.current.ontrack = (event) => {
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                        setRemoteConnected(true);
                        setIsConnecting(false);
                    }
                };

                // Listen for ICE candidates
                pc.current.onicecandidate = (event) => {
                    if (event.candidate) {
                        api.addIceCandidate(meetingId, isHost ? 'caller' : 'callee', event.candidate.toJSON());
                    }
                };

                if (isHost) {
                    // Host Flow: Create Offer
                    const offer = await pc.current.createOffer();
                    await pc.current.setLocalDescription(offer);
                    await api.updateMeetingSignal(meetingId, { offer: { type: offer.type, sdp: offer.sdp } });
                    
                    // Wait for Answer
                    const unsub = api.listenForMeetingSignals(meetingId, async (m) => {
                        if (m.answer && !pc.current?.currentRemoteDescription) {
                            const answerDesc = new RTCSessionDescription(m.answer);
                            await pc.current?.setRemoteDescription(answerDesc);
                        }
                    });

                    // Listen for Callee candidates
                    const unsubCandidates = api.listenForIceCandidates(meetingId, 'callee', (c) => {
                        pc.current?.addIceCandidate(new RTCIceCandidate(c));
                    });

                    return () => { unsub(); unsubCandidates(); };
                } else {
                    // Guest Flow: Get Offer, Create Answer
                    const m = await api.joinMeeting(meetingId);
                    if (m && m.offer) {
                        await pc.current.setRemoteDescription(new RTCSessionDescription(m.offer));
                        const answer = await pc.current.createAnswer();
                        await pc.current.setLocalDescription(answer);
                        await api.updateMeetingSignal(meetingId, { answer: { type: answer.type, sdp: answer.sdp } });
                    }

                    // Listen for Caller candidates
                    const unsubCandidates = api.listenForIceCandidates(meetingId, 'caller', (c) => {
                        pc.current?.addIceCandidate(new RTCIceCandidate(c));
                    });

                    return () => { unsubCandidates(); };
                }
            } catch (e) {
                console.error("WebRTC Error:", e);
                addToast("Protocol failure: Secure comms interrupted.", "error");
                onEnd();
            }
        };

        startCall();

        return () => {
            localStream.current?.getTracks().forEach(t => t.stop());
            pc.current?.close();
            if (isHost) api.deleteMeeting(meetingId);
        };
    }, [meetingId, isHost, addToast, onEnd]);

    const toggleMic = () => {
        if (localStream.current) {
            const audioTrack = localStream.current.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled;
            setIsMicOn(audioTrack.enabled);
        }
    };

    const toggleVideo = () => {
        if (localStream.current) {
            const videoTrack = localStream.current.getVideoTracks()[0];
            videoTrack.enabled = !videoTrack.enabled;
            setIsVideoOn(videoTrack.enabled);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans animate-fade-in">
            {/* HUD Header */}
            <div className="p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex justify-between items-center z-50">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-brand-gold/10 rounded-xl border border-brand-gold/20 shadow-glow-gold">
                        <ShieldCheckIcon className="h-6 w-6 text-brand-gold" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.3em]">Sovereign Meeting</h2>
                        <p className="text-[8px] text-emerald-500 uppercase tracking-widest mt-0.5">Handshake ID: {meetingId}</p>
                    </div>
                </div>
                {remoteConnected && (
                    <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Encrypted_P2P_Link_Active</span>
                    </div>
                )}
            </div>

            {/* Video Stage */}
            <div className="flex-1 relative bg-slate-950 overflow-hidden p-4 sm:p-8">
                {/* Remote Video (Full Screen) */}
                <div className="w-full h-full relative rounded-[3rem] overflow-hidden bg-slate-900 border border-white/5 group shadow-2xl">
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover grayscale-[20%] transition-all" />
                    {!remoteConnected && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
                            <LoaderIcon className="h-12 w-12 animate-spin text-brand-gold opacity-30" />
                            <p className="label-caps !text-[10px] !text-gray-500 animate-pulse tracking-[0.5em]">Awaiting_Peer_Handshake...</p>
                        </div>
                    )}
                    {remoteConnected && (
                        <div className="absolute bottom-10 left-10 p-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[10px] font-black text-white uppercase tracking-widest">Protocol Guest</p>
                        </div>
                    )}
                </div>

                {/* Local Video (PiP) */}
                <div className="absolute bottom-28 right-10 sm:bottom-12 sm:right-12 w-32 h-44 sm:w-48 sm:h-64 rounded-3xl overflow-hidden border-2 border-brand-gold/40 shadow-glow-gold z-40 bg-slate-800">
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-4 left-4">
                        <p className="text-[8px] font-black text-white uppercase tracking-widest">Citizen (YOU)</p>
                    </div>
                </div>
            </div>

            {/* Control Deck */}
            <div className="p-8 sm:p-10 bg-slate-900/80 backdrop-blur-3xl border-t border-white/5 flex justify-center items-center gap-6 sm:gap-10 z-50">
                <ControlBtn onClick={toggleMic} active={isMicOn} activeIcon={<MicIcon/>} inactiveIcon={<MicOffIcon/>} color="blue" />
                <button 
                    onClick={onEnd}
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.4)] active:scale-90 transition-all border-4 border-red-900/30"
                >
                    <PhoneOffIcon className="h-8 w-8" />
                </button>
                <ControlBtn onClick={toggleVideo} active={isVideoOn} activeIcon={<VideoIcon/>} inactiveIcon={<VideoOffIcon/>} color="gold" />
            </div>

            {/* Privacy Shield Advice */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none whitespace-nowrap">
                <p className="text-[7px] font-black text-gray-500 uppercase tracking-[0.6em]">P2P Encryption &bull; NO STORAGE PROTOCOL &bull; SOVEREIGN COMMS</p>
            </div>
        </div>
    );
};

const ControlBtn: React.FC<{ onClick: () => void, active: boolean, activeIcon: React.ReactNode, inactiveIcon: React.ReactNode, color: 'blue' | 'gold' }> = ({ onClick, active, activeIcon, inactiveIcon, color }) => (
    <button 
        onClick={onClick}
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-3xl flex items-center justify-center transition-all border-2 active:scale-90 shadow-xl
            ${active 
                ? 'bg-slate-800 border-white/10 text-white hover:bg-slate-700' 
                : color === 'blue' ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-blue-900/20' : 'bg-brand-gold/20 border-brand-gold text-brand-gold shadow-glow-gold'}
        `}
    >
        {active ? activeIcon : inactiveIcon}
    </button>
);
