
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
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { RotateCwIcon } from './icons/RotateCwIcon';

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

    useEffect(() => {
        if (mode === 'scan_code' && !scannedData) {
            const startCamera = async () => {
                try {
                    const html5QrCode = new Html5Qrcode("reader", {
                        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                        verbose: false
                    });
                    html5QrCodeRef.current = html5QrCode;

                    await html5QrCode.start(
                        { facingMode: facingMode },
                        { fps: 20, qrbox: { width: 250, height: 250 } },
                        onScanSuccess,
                        () => {}
                    );
                    setCameraReady(true);
                } catch (err) {
                    console.error("Camera init failed:", err);
                    addToast("Camera access denied.", "error");
                }
            };

            const timer = setTimeout(startCamera, 300);
            return () => {
                clearTimeout(timer);
                stopCamera();
            };
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
            } catch (e) {
                console.debug("Camera stop error ignored");
            }
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
            }
        } catch (e) {
            console.warn("Invalid data detected");
        }
    };

    const handleFlipCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
        setCameraReady(false);
    };

    const handleInitiateSend = () => {
        const amount = parseFloat(sendAmount);
        if (isNaN(amount) || amount <= 0) {
            addToast("Enter valid amount.", "error");
            return;
        }
        if (amount > (currentUser.ubtBalance || 0)) {
            addToast("Insufficient node balance.", "error");
            return;
        }
        setShowConfirmation(true);
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
            
            addToast(`Successfully sent ${amount} UBT.`, "success");
            onTransactionComplete();
            onClose();
        } catch (error) {
            addToast("Protocol failure. Transfer aborted.", "error");
            setShowConfirmation(false);
        } finally {
            setIsProcessing(false);
        }
    };

    const recipientData = scannedData ? JSON.parse(scannedData) : null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-fade-in overflow-hidden font-sans">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/90 backdrop-blur-3xl z-50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-gold/10 rounded-xl border border-brand-gold/20 shadow-glow-gold">
                        <QrCodeIcon className="h-6 w-6 text-brand-gold" />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter gold-text">
                        {showConfirmation ? 'Authorize' : mode === 'show_code' ? 'Identity' : 'Direct Scanner'}
                    </h2>
                </div>
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-brand-gold bg-white/5 rounded-full transition-all">
                    <XCircleIcon className="h-8 w-8" />
                </button>
            </div>

            {!onScanIdentity && (
                <div className="flex p-3 bg-slate-900/50 gap-2 border-b border-white/5 z-50">
                    <button 
                        onClick={() => { setMode('show_code'); setScannedData(null); setShowConfirmation(false); }}
                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${mode === 'show_code' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'bg-slate-800/30 text-gray-500 hover:text-gray-300'}`}
                    >
                        My Code
                    </button>
                    <button 
                        onClick={() => { setMode('scan_code'); setScannedData(null); setShowConfirmation(false); }}
                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${mode === 'scan_code' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'bg-slate-800/30 text-gray-500 hover:text-gray-300'}`}
                    >
                        Scan Pay
                    </button>
                </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto relative">
                {mode === 'show_code' ? (
                    <div className="text-center w-full max-w-sm animate-fade-in">
                        <div className="bg-white p-6 rounded-[2.5rem] mx-auto mb-10 shadow-glow-gold">
                            {qrUrl ? (
                                <img src={qrUrl} alt="Identity QR" className="w-full h-auto rounded-xl" />
                            ) : (
                                <div className="h-64 flex items-center justify-center"><LoaderIcon className="h-10 w-10 animate-spin text-slate-950" /></div>
                            )}
                        </div>
                        <h3 className="text-3xl font-black text-white tracking-tighter uppercase gold-text">{currentUser.name}</h3>
                        <p className="text-brand-gold font-mono text-[10px] mt-3 font-black opacity-70 break-all px-8 border-t border-brand-gold/10 pt-4 uppercase">
                            {currentUser.publicKey || 'Initializing Identity...'}
                        </p>
                    </div>
                ) : (
                    <div className="w-full max-w-md animate-fade-in flex flex-col items-center">
                        {!scannedData ? (
                            <div className="relative w-full aspect-square rounded-[3rem] overflow-hidden border border-brand-gold/20 bg-black shadow-2xl">
                                <div id="reader" className="w-full h-full"></div>
                                
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                    <div className="w-64 h-64 border-2 border-brand-gold/40 rounded-[2rem] relative overflow-hidden">
                                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-gold shadow-[0_0_15px_#D4AF37] animate-scan-move"></div>
                                    </div>
                                    <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.5em] mt-10 animate-pulse">
                                        {cameraReady ? 'Targeting Node...' : 'Initializing Lens...'}
                                    </p>
                                </div>
                                
                                {cameraReady && (
                                    <button 
                                        onClick={handleFlipCamera}
                                        className="absolute bottom-6 right-6 p-4 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 text-white pointer-events-auto active:scale-95 transition-all z-20"
                                    >
                                        <RotateCwIcon className="h-6 w-6" />
                                    </button>
                                )}
                            </div>
                        ) : showConfirmation ? (
                            <div className="module-frame glass-module p-8 rounded-[3rem] border-brand-gold/40 shadow-glow-gold space-y-8 animate-fade-in w-full">
                                <div className="text-center">
                                     <p className="label-caps !text-[10px] mb-4">Volume Transfer</p>
                                     <p className="text-6xl font-black text-white font-mono tracking-tighter">{sendAmount} <span className="text-xl text-brand-gold uppercase font-sans">UBT</span></p>
                                </div>
                                <div className="space-y-4 border-y border-white/5 py-8">
                                    <div className="flex items-center justify-between">
                                        <span className="label-caps !text-[9px]">Target</span>
                                        <span className="text-sm font-black text-white uppercase">{recipientData.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="label-caps !text-[9px]">Network Fee</span>
                                        <span className="text-xs font-black text-emerald-500 font-mono">0.00 UBT</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleFinalSend}
                                    disabled={isProcessing}
                                    className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-3xl active:scale-95 shadow-glow-gold flex justify-center items-center uppercase tracking-[0.2em] text-xs"
                                >
                                    {isProcessing ? <LoaderIcon className="h-6 w-6 animate-spin" /> : 'Confirm Signed Dispatch'}
                                </button>
                                <button onClick={() => setShowConfirmation(false)} className="w-full py-2 text-[9px] text-gray-500 font-black uppercase tracking-widest">Correction Protocol</button>
                            </div>
                        ) : (
                            <div className="module-frame glass-module p-8 rounded-[3rem] shadow-2xl border-brand-gold/20 w-full space-y-10">
                                <div className="flex items-center gap-5 bg-black/40 p-5 rounded-[2rem] border border-white/5">
                                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center border border-brand-gold/20">
                                        <UserCircleIcon className="h-9 w-9 text-brand-gold/60" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="label-caps !text-[8px] mb-1">Target Identity</p>
                                        <p className="text-xl font-black text-white truncate tracking-tighter uppercase gold-text leading-none">{recipientData.name}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="label-caps !text-[10px] pl-1">Sync Amount</label>
                                    <div className="relative group">
                                        <input 
                                            type="number" 
                                            value={sendAmount} 
                                            onChange={e => setSendAmount(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 rounded-[2rem] p-7 text-white text-5xl font-black font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold/30 placeholder-gray-900"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                        <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none"><span className="text-gray-800 font-black text-xl">UBT</span></div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <button onClick={handleInitiateSend} disabled={!sendAmount || parseFloat(sendAmount) <= 0} className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-3xl active:scale-95 shadow-glow-gold uppercase tracking-[0.2em] text-xs">Authorize Transfer</button>
                                    <button onClick={() => { setScannedData(null); setShowConfirmation(false); }} className="w-full py-2 text-[9px] text-gray-500 font-black uppercase tracking-widest">Rescan Target</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <style>{`
                @keyframes scan-move {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(256px); }
                }
                .animate-scan-move {
                    animation: scan-move 2s linear infinite;
                }
            `}</style>
        </div>
    );
};
