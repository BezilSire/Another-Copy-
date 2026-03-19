
import React, { useState, useEffect } from 'react';
import { cryptoService } from '../services/cryptoService';
import { api } from '../services/apiService';
import { User } from '../types';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { KeyIcon } from './icons/KeyIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

interface RecoverySetupProps {
    user: User;
    onComplete: () => void;
    onCancel: () => void;
}

export const RecoverySetup: React.FC<RecoverySetupProps> = ({ user, onComplete, onCancel }) => {
    const [step, setStep] = useState(1);
    const [secret, setSecret] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);
    const [confirmSecret, setConfirmSecret] = useState('');

    useEffect(() => {
        if (step === 2 && !secret) {
            setSecret(cryptoService.generateRecoverySecret());
        }
    }, [step, secret]);

    const handleCopy = () => {
        navigator.clipboard.writeText(secret);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    const handleSaveCommitment = async () => {
        if (confirmSecret.toLowerCase().trim() !== secret.toLowerCase().trim()) {
            alert("Verification failed. Please ensure the phrase matches exactly.");
            return;
        }

        setIsSaving(true);
        try {
            const commitment = await cryptoService.hashRecoverySecret(secret);
            await api.setRecoveryCommitment(user.id, commitment);
            setStep(4);
        } catch (error) {
            console.error("Failed to save recovery commitment:", error);
            alert("System error: Could not establish recovery anchor.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="module-frame glass-module p-8 sm:p-12 rounded-[3.5rem] border-white/10 shadow-premium animate-fade-in max-w-2xl w-full relative overflow-hidden font-sans">
            <div className="corner-tl !border-brand-gold/40"></div><div className="corner-tr !border-brand-gold/40"></div><div className="corner-bl !border-brand-gold/40"></div><div className="corner-br !border-brand-gold/40"></div>
            
            {step === 1 && (
                <div className="space-y-8 animate-fade-in text-center">
                    <div className="w-24 h-24 bg-brand-gold/10 rounded-3xl flex items-center justify-center border-2 border-brand-gold/20 mx-auto mb-8 shadow-glow-gold">
                        <ShieldCheckIcon className="h-12 w-12 text-brand-gold" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Sovereign Recovery</h2>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto uppercase tracking-widest opacity-80">
                            Establish a secondary recovery anchor. This secret allows you to rotate your keys if you lose your primary phrase.
                        </p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-left space-y-3">
                        <div className="flex items-center gap-3 text-red-500">
                            <AlertTriangleIcon className="h-5 w-5" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Zero-Knowledge Protocol</p>
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-loose">
                            We never see your secret. Only a cryptographic hash is stored on the ledger. If you lose this secret, even we cannot help you recover your account.
                        </p>
                    </div>
                    <button 
                        onClick={() => setStep(2)}
                        className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all"
                    >
                        Initialize Protocol
                    </button>
                    <button onClick={onCancel} className="text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-widest transition-colors">
                        Maybe Later
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8 animate-fade-in text-center">
                    <div className="space-y-2">
                        <p className="text-[10px] text-brand-gold font-black uppercase tracking-[0.3em]">Your Recovery Secret</p>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Write This Down</h2>
                    </div>
                    
                    <div className="p-8 bg-slate-950 border-2 border-brand-gold/30 rounded-3xl relative group">
                        <p className="text-2xl font-black text-brand-gold font-mono tracking-tight leading-relaxed">
                            {secret}
                        </p>
                        <button 
                            onClick={handleCopy}
                            className="absolute top-4 right-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white"
                        >
                            {hasCopied ? <CheckCircleIcon className="h-5 w-5 text-emerald-500" /> : <ClipboardIcon className="h-5 w-5" />}
                        </button>
                    </div>

                    <div className="bg-white/5 p-6 rounded-2xl text-left">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-loose">
                            This 6-word phrase is your "Master Key." Store it offline. Do not take a screenshot. Do not save it in your email.
                        </p>
                    </div>

                    <button 
                        onClick={() => setStep(3)}
                        className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all"
                    >
                        I Have Secured It
                    </button>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-8 animate-fade-in text-center">
                    <div className="space-y-2">
                        <p className="text-[10px] text-brand-gold font-black uppercase tracking-[0.3em]">Verification</p>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Confirm Your Secret</h2>
                    </div>

                    <div className="space-y-4">
                        <textarea 
                            value={confirmSecret}
                            onChange={(e) => setConfirmSecret(e.target.value)}
                            placeholder="Enter your 6-word recovery secret..."
                            className="w-full h-32 bg-slate-950 border-2 border-white/10 rounded-3xl p-6 text-white font-mono text-lg focus:border-brand-gold outline-none transition-all resize-none text-center"
                        />
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Case-insensitive. Spaces required.</p>
                    </div>

                    <button 
                        onClick={handleSaveCommitment}
                        disabled={isSaving || !confirmSecret}
                        className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isSaving ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <KeyIcon className="h-5 w-5" />}
                        {isSaving ? "Establishing Anchor..." : "Finalize Anchor"}
                    </button>
                    
                    <button onClick={() => setStep(2)} className="text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-widest transition-colors">
                        Back to Secret
                    </button>
                </div>
            )}

            {step === 4 && (
                <div className="space-y-10 animate-fade-in text-center py-6">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20 mx-auto shadow-glow-matrix">
                        <CheckCircleIcon className="h-12 w-12 text-emerald-500" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Anchor Established</h2>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto uppercase tracking-widest opacity-80">
                            Your Sovereign Recovery Protocol is now active. Your account is protected by a zero-knowledge cryptographic anchor.
                        </p>
                    </div>
                    <button 
                        onClick={onComplete}
                        className="w-full py-6 bg-emerald-500 text-white font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-glow-matrix active:scale-95 transition-all"
                    >
                        Return to Dashboard
                    </button>
                </div>
            )}
        </div>
    );
};
