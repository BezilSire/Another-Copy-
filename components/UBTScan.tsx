
import React, { useState, useEffect, useRef } from 'react';
import * as QRCodeLib from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { User, UbtTransaction } from '../types';
import { cryptoService } from '../services/cryptoService';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

// Resolve QRCode reliably across different ESM wrappers
const QRCode = (QRCodeLib as any).default || QRCodeLib;

interface UBTScanProps {
    currentUser: User;
    onTransactionComplete: () => void;
    onClose: () => void;
}

type Mode = 'show_code' | 'scan_code';

export const UBTScan: React.FC<UBTScanProps> = ({ currentUser, onTransactionComplete, onClose }) => {
    const [mode, setMode] = useState<Mode>('show_code');
    const [qrUrl, setQrUrl] = useState('');
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [sendAmount, setSendAmount] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const { addToast } = useToast();
    
    const scannerInstanceRef = useRef<any>(null);

    // Generate My QR Code
    useEffect(() => {
        if (mode === 'show_code' && currentUser.publicKey) {
            const payload = JSON.stringify({
                id: currentUser.id,
                name: currentUser.name,
                key: currentUser.publicKey
            });
            
            if (QRCode && QRCode.toDataURL) {
                QRCode.toDataURL(payload, { 
                    width: 600,
                    margin: 1,
                    errorCorrectionLevel: 'H',
                    color: {
                        dark: '#020617',
                        light: '#FFD76A'
                    }
                })
                .then(url => setQrUrl(url))
                .catch(err => {
                    console.error("QR Error:", err);
                });
            }
        }
    }, [mode, currentUser.publicKey, currentUser.id, currentUser.name]);

    // Initialize/Cleanup Scanner
    useEffect(() => {
        if (mode === 'scan_code' && !scannedData) {
            const timer = setTimeout(() => {
                try {
                    const scanner = new Html5QrcodeScanner(
                        "reader", 
                        { 
                            fps: 20, 
                            qrbox: { width: 280, height: 280 },
                            aspectRatio: 1.0,
                            showTorchButtonIfSupported: true
                        },
                        false
                    );
                    
                    scanner.render(onScanSuccess, onScanFailure);
                    scannerInstanceRef.current = scanner;
                } catch (err) {
                    console.error("Scanner init failed:", err);
                    addToast("Scanner initialization failed.", "error");
                }
            }, 100);

            return () => {
                clearTimeout(timer);
                if (scannerInstanceRef.current) {
                    scannerInstanceRef.current.clear().catch(() => {});
                    scannerInstanceRef.current = null;
                }
            };
        }
    }, [mode, scannedData]);

    const onScanSuccess = (decodedText: string) => {
        try {
            const data = JSON.parse(decodedText);
            if (data.id && data.key) {
                setScannedData(decodedText);
                if (scannerInstanceRef.current) {
                    scannerInstanceRef.current.clear().catch(() => {});
                }
            }
        } catch (e) {
            console.warn("Detection failed.");
        }
    };

    const onScanFailure = (error: any) => {};

    const handleInitiateSend = () => {
        const amount = parseFloat(sendAmount);
        if (isNaN(amount) || amount <= 0) {
            addToast("Enter valid amount.", "error");
            return;
        }
        if (amount > (currentUser.ubtBalance || 0)) {
            addToast("Insufficient holdings.", "error");
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
            const txId = Date.now().toString(36) + Math.random().toString(36).substring(2);
            
            const transaction: UbtTransaction = {
                id: txId, 
                senderId: currentUser.id,
                receiverId: receiver.id,
                amount: amount,
                timestamp: timestamp,
                nonce: nonce,
                signature: signature,
                hash: payloadToSign
            };

            await api.processUbtTransaction(transaction);
            
            addToast(`Successfully sent ${amount} UBT.`, "success");
            onTransactionComplete();
            onClose();

        } catch (error) {
            console.error(error);
            addToast("Transaction failed.", "error");
            setShowConfirmation(false);
        } finally {
            setIsProcessing(false);
        }
    };

    const recipientData = scannedData ? JSON.parse(scannedData) : null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/80 backdrop-blur-2xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-gold/10 rounded-xl border border-brand-gold/20 shadow-glow-gold">
                        <QrCodeIcon className="h-6 w-6 text-brand-gold" />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter gold-text">
                        {showConfirmation ? 'Confirm' : mode === 'show_code' ? 'Identity' : 'Scanner'}
                    </h2>
                </div>
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-brand-gold bg-white/5 rounded-full">
                    <XCircleIcon className="h-8 w-8" />
                </button>
            </div>

            {/* Sub Nav */}
            <div className="flex p-3 bg-slate-900/50 gap-2 border-b border-white/5">
                <button 
                    onClick={() => { setMode('show_code'); setScannedData(null); setShowConfirmation(false); }}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${mode === 'show_code' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'bg-slate-800/30 text-gray-500 hover:text-gray-300'}`}
                >
                    Identity
                </button>
                <button 
                    onClick={() => { setMode('scan_code'); setScannedData(null); setShowConfirmation(false); }}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${mode === 'scan_code' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'bg-slate-800/30 text-gray-500 hover:text-gray-300'}`}
                >
                    Scanner
                </button>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto relative">
                {mode === 'show_code' ? (
                    <div className="text-center w-full max-w-sm animate-fade-in">
                        <div className="glass-card p-6 rounded-[3rem] mx-auto mb-10 border-brand-gold/30 bg-white shadow-glow-gold">
                            {qrUrl ? (
                                <img src={qrUrl} alt="Identity QR" className="w-full h-auto rounded-2xl" />
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center gap-4">
                                    <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold" />
                                </div>
                            )}
                        </div>
                        <h3 className="text-3xl font-black text-white tracking-tighter uppercase gold-text">{currentUser.name}</h3>
                        <p className="text-brand-gold font-mono text-xs mt-3 font-bold opacity-70 break-all px-8 border-t border-brand-gold/10 pt-4">
                            ID: {currentUser.publicKey || 'Initializing...'}
                        </p>
                        <p className="text-gray-500 text-[10px] mt-8 uppercase font-black tracking-widest leading-loose">
                            Show this anchor to receive assets from verified nodes.
                        </p>
                    </div>
                ) : (
                    <div className="w-full max-w-md animate-fade-in">
                        {!scannedData ? (
                            <div className="relative rounded-[3rem] overflow-hidden border border-brand-gold/20 aspect-square bg-black shadow-2xl flex items-center justify-center">
                                <div id="reader" className="w-full h-full scale-[1.02]"></div>
                                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-48 h-48 border-2 border-brand-gold rounded-3xl animate-pulse"></div>
                                </div>
                            </div>
                        ) : showConfirmation ? (
                            <div className="glass-card p-8 rounded-[3rem] space-y-8 animate-fade-in border-brand-gold/40 shadow-glow-gold relative overflow-hidden">
                                <div className="text-center">
                                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4">Transfer Amount</p>
                                     <p className="text-6xl font-black text-white font-mono tracking-tighter">{sendAmount} <span className="text-2xl text-brand-gold">UBT</span></p>
                                </div>

                                <div className="space-y-4 border-y border-white/5 py-8">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Recipient</span>
                                        <span className="text-sm font-black text-white tracking-tight">{recipientData.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Network Fee</span>
                                        <span className="text-sm font-black text-green-500 font-mono tracking-tighter">0.00 UBT</span>
                                    </div>
                                </div>

                                <div className="p-5 bg-red-950/30 border border-red-900/50 rounded-3xl flex gap-4 items-start">
                                    <AlertTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                                    <p className="text-[10px] text-red-200/80 leading-relaxed uppercase font-black tracking-tight">
                                        Protocol Action is irreversible. Funds will be moved to target node.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button 
                                        onClick={handleFinalSend}
                                        disabled={isProcessing}
                                        className="w-full py-5 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-3xl active:scale-95 shadow-glow-gold flex justify-center items-center uppercase tracking-[0.2em] text-xs"
                                    >
                                        {isProcessing ? <LoaderIcon className="h-6 w-6 animate-spin" /> : 'Confirm & Sign Ledger'}
                                    </button>
                                    <button 
                                        onClick={() => setShowConfirmation(false)}
                                        className="w-full py-2 text-gray-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                                    >
                                        Correction Protocol
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-card p-8 rounded-[3rem] shadow-2xl animate-fade-in border-brand-gold/20">
                                <div className="flex items-center gap-5 mb-10 bg-slate-950/60 p-5 rounded-[2rem] border border-white/5">
                                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center border border-brand-gold/20">
                                        <UserCircleIcon className="h-10 w-10 text-brand-gold/60" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Protocol Target</p>
                                        <p className="text-2xl font-black text-white truncate tracking-tighter leading-tight gold-text">{recipientData.name}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] pl-1">Quantum Transfer</label>
                                    <div className="relative group">
                                        <input 
                                            type="number" 
                                            value={sendAmount} 
                                            onChange={e => setSendAmount(e.target.value)}
                                            className="w-full bg-slate-950/80 border border-white/10 rounded-[2rem] p-7 text-white text-5xl font-black font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold/30 placeholder-gray-900"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                        <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
                                            <span className="text-gray-700 font-black tracking-tighter text-xl">UBT</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center px-4">
                                         <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Balance: {(currentUser.ubtBalance || 0).toFixed(2)}</p>
                                         <button onClick={() => setSendAmount(String(currentUser.ubtBalance || 0))} className="text-[10px] font-black text-brand-gold hover:text-white uppercase tracking-widest">Max Power</button>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-4 mt-12">
                                    <button 
                                        onClick={handleInitiateSend}
                                        disabled={isProcessing || !sendAmount || parseFloat(sendAmount) <= 0}
                                        className="w-full py-5 bg-slate-900 border border-brand-gold/20 hover:border-brand-gold/50 text-white font-black rounded-3xl active:scale-95 disabled:opacity-30 uppercase tracking-[0.2em] text-xs shadow-xl"
                                    >
                                        Review Protocol
                                    </button>
                                    <button 
                                        onClick={() => { setScannedData(null); setShowConfirmation(false); }}
                                        className="w-full py-2 text-gray-600 hover:text-gray-400 transition-all text-[10px] font-black uppercase tracking-widest"
                                    >
                                        Detection Fault: Rescan
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
