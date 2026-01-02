
import React, { useState, useEffect, useRef } from 'react';
import * as QRCodeLib from 'qrcode';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { User, UbtTransaction } from '../types';
import { cryptoService } from '../services/cryptoService';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { RotateCwIcon } from './icons/RotateCwIcon';
import { CameraIcon } from './icons/CameraIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

const QRCode = (QRCodeLib as any).default || QRCodeLib;

interface UBTScanProps {
    currentUser: User;
    onTransactionComplete: () => void;
    onClose: () => void;
    onScanIdentity?: (data: { id: string, name: string, key: string }) => void;
}

type Mode = 'show_code' | 'scan_code';

export const UBTScan: React.FC<UBTScanProps> = ({ currentUser, onTransactionComplete, onClose, onScanIdentity }) => {
    const [mode, setMode] = useState<Mode>(onScanIdentity ? 'scan_code' : 'show_code');
    const [qrUrl, setQrUrl] = useState('');
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [sendAmount, setSendAmount] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const { addToast } = useToast();
    
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        if (mode === 'show_code' && currentUser.publicKey) {
            const payload = JSON.stringify({
                id: currentUser.id,
                name: currentUser.name,
                key: currentUser.publicKey
            });
            
            QRCode.toDataURL(payload, { 
                width: 600,
                margin: 1,
                errorCorrectionLevel: 'H',
                color: { dark: '#020617', light: '#FFD76A' }
            }).then(setQrUrl).catch(console.error);
        }
    }, [mode, currentUser]);

    const startCamera = async () => {
        setCameraError(false);
        try {
            if (html5QrCodeRef.current?.isScanning) {
                await html5QrCodeRef.current.stop();
            }

            const html5QrCode = new Html5Qrcode("reader", {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                verbose: false
            });
            html5QrCodeRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: facingMode },
                { fps: 30, qrbox: { width: 280, height: 280 } },
                onScanSuccess,
                () => {}
            );
            setCameraReady(true);
        } catch (err) {
            setCameraError(true);
        }
    };

    useEffect(() => {
        if (mode === 'scan_code' && !scannedData) {
            startCamera();
            return () => stopCamera();
        } else {
            stopCamera();
        }
    }, [mode, scannedData, facingMode]);

    const stopCamera = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current = null;
                setCameraReady(false);
            } catch (e) {}
        }
    };

    const onScanSuccess = (decodedText: string) => {
        try {
            const data = JSON.parse(decodedText);
            if (data.id && data.key) {
                if (onScanIdentity) {
                    onScanIdentity(data);
                    onClose();
                    return;
                }
                setScannedData(decodedText);
                stopCamera();
                addToast("Node Identification Acquired.", "success");
            }
        } catch (e) {
            console.warn("Invalid data detected");
        }
    };

    const handleFlipCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
        setCameraReady(false);
    };

    const handleFinalSend = async () => {
        if (!scannedData || !sendAmount) return;
        const receiver = JSON.parse(scannedData);
        const amount = parseFloat(sendAmount);

        setIsProcessing(true);
        try {
            const timestamp = Date.now();
            const nonce = cryptoService.generateNonce();
            const payloadToSign = `${currentUser.id}:${receiver.id}:${amount}:${timestamp}:${nonce}`;
            const signature = cryptoService.signTransaction(payloadToSign);
            const txId = `scan-p2p-${Date.now().toString(36)}`;
            
            await api.processUbtTransaction({
                id: txId, 
                senderId: currentUser.id,
                receiverId: receiver.id,
                amount: amount,
                timestamp: timestamp,
                nonce: nonce,
                signature: signature,
                hash: payloadToSign,
                senderPublicKey: currentUser.publicKey || "",
                parentHash: 'GENESIS_SCAN',
                protocol_mode: 'MAINNET'
            });
            
            addToast(`Dispatch Successful. ${amount} UBT ledgered.`, "success");
            onTransactionComplete();
            onClose();
        } catch (error) {
            addToast("Handshake Terminated.", "error");
            setShowConfirmation(false);
        } finally {
            setIsProcessing(false);
        }
    };

    const recipientData = scannedData ? JSON.parse(scannedData) : null;

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in overflow-hidden font-mono">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/90 backdrop-blur-3xl z-50">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-glow-matrix"></div>
                    <h2 className="text-xs font-black text-white uppercase tracking-[0.4em]">
                        {showConfirmation ? 'Authorize_Block' : mode === 'show_code' ? 'Identify_Node' : 'Proximity_Scanner'}
                    </h2>
                </div>
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-brand-gold transition-all">
                    <XCircleIcon className="h-6 w-6" />
                </button>
            </div>

            <div className="flex p-3 bg-slate-900/50 gap-2 border-b border-white/5 z-50">
                <button 
                    onClick={() => { setMode('show_code'); setScannedData(null); setShowConfirmation(false); }}
                    className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${mode === 'show_code' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'bg-slate-800/30 text-gray-500'}`}
                >
                    Public Anchor
                </button>
                <button 
                    onClick={() => { setMode('scan_code'); setScannedData(null); setShowConfirmation(false); }}
                    className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${mode === 'scan_code' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'bg-slate-800/30 text-gray-500'}`}
                >
                    Ingress Lens
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto relative">
                {mode === 'show_code' ? (
                    <div className="text-center w-full max-w-sm animate-fade-in space-y-10">
                        <div className="bg-white p-8 rounded-[3rem] mx-auto shadow-glow-gold border-8 border-brand-gold/20">
                            {qrUrl ? (
                                <img src={qrUrl} alt="QR" className="w-full h-auto rounded-xl" />
                            ) : (
                                <div className="h-64 flex items-center justify-center"><LoaderIcon className="h-10 w-10 animate-spin text-slate-950" /></div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{currentUser.name}</h3>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Ready for Handshake</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-md animate-fade-in flex flex-col items-center">
                        {!scannedData ? (
                            <div className="relative w-full aspect-square rounded-[3rem] overflow-hidden border-2 border-white/5 bg-black shadow-2xl group">
                                <div id="reader" className="w-full h-full grayscale opacity-60"></div>
                                
                                <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
                                     <div className="w-64 h-64 border-2 border-brand-gold/30 rounded-[2.5rem] relative overflow-hidden bg-brand-gold/[0.02]">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-brand-gold shadow-[0_0_20px_#D4AF37] animate-scan-move opacity-60"></div>
                                        <div className="absolute top-0 left-0 w-full h-full blueprint-grid opacity-[0.05]"></div>
                                    </div>
                                    
                                    <div className="mt-8 flex flex-col items-center gap-3">
                                        <p className="text-[9px] font-black text-brand-gold uppercase tracking-[0.5em] animate-pulse">Searching_Nodes...</p>
                                        <div className="flex gap-1.5">
                                            {[1,2,3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-brand-gold/20"></div>)}
                                        </div>
                                    </div>
                                </div>

                                {cameraReady && (
                                    <button 
                                        onClick={handleFlipCamera}
                                        className="absolute bottom-6 right-6 p-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 text-white transition-all z-20 pointer-events-auto"
                                    >
                                        <RotateCwIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        ) : showConfirmation ? (
                            <div className="module-frame glass-module p-10 rounded-[3rem] border-brand-gold/40 shadow-glow-gold space-y-10 animate-fade-in w-full text-center">
                                <div>
                                     <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.4em] mb-4">Confirm Signature</p>
                                     <p className="text-7xl font-black text-white tracking-tighter leading-none">{sendAmount}</p>
                                     <p className="text-xl font-black text-brand-gold mt-2 uppercase tracking-widest">UBT ASSETS</p>
                                </div>
                                
                                <div className="p-6 bg-black/60 rounded-3xl border border-white/5 space-y-4">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-gray-500 font-black uppercase">Recipient</span>
                                        <span className="text-white font-black uppercase">{recipientData.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-gray-500 font-black uppercase">Block Hash</span>
                                        <span className="text-emerald-500 font-mono">VERIFIED_P2P</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleFinalSend}
                                    disabled={isProcessing}
                                    className="w-full py-7 bg-brand-gold text-slate-950 font-black rounded-3xl shadow-glow-gold active:scale-95 transition-all uppercase tracking-[0.5em] text-xs"
                                >
                                    {isProcessing ? <LoaderIcon className="h-6 w-6 animate-spin"/> : "Dispatch Signed Block"}
                                </button>
                            </div>
                        ) : (
                            <div className="module-frame glass-module p-10 rounded-[3.5rem] shadow-2xl border-white/10 w-full space-y-12">
                                <div className="flex items-center gap-5 bg-black/60 p-6 rounded-[2.5rem] border border-white/10">
                                    <div className="w-14 h-14 bg-brand-gold/10 rounded-2xl flex items-center justify-center border border-brand-gold/20 shadow-inner">
                                        <UserCircleIcon className="h-8 w-8 text-brand-gold" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[8px] text-emerald-500 font-black uppercase tracking-[0.4em] mb-1">Target_Acquired</p>
                                        <p className="text-2xl font-black text-white truncate tracking-tighter uppercase gold-text leading-none">{recipientData.name}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="label-caps !text-[10px] pl-2 text-gray-500">Volume Allocation</label>
                                    <div className="relative group">
                                        <input 
                                            type="number" 
                                            value={sendAmount} 
                                            onChange={e => setSendAmount(e.target.value)}
                                            className="w-full bg-black border-none p-8 rounded-[2.5rem] text-white text-6xl font-black font-mono focus:outline-none placeholder-gray-900 shadow-inner text-center"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <button onClick={() => setShowConfirmation(true)} disabled={!sendAmount || parseFloat(sendAmount) <= 0} className="w-full py-7 bg-brand-gold text-slate-950 font-black rounded-3xl shadow-glow-gold active:scale-95 transition-all uppercase tracking-[0.4em] text-xs">Execute Authorization</button>
                                    <button onClick={() => setScannedData(null)} className="text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors py-2">Reset Lens</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <style>{`
                @keyframes scan-move { 0% { transform: translateY(0); } 100% { transform: translateY(280px); } }
                .animate-scan-move { animation: scan-move 2s linear infinite; }
            `}</style>
        </div>
    );
};
