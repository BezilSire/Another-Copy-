
import React, { useState, useRef, useEffect } from 'react';
import { cryptoService, VaultData } from '../services/cryptoService';
import { LogoIcon } from './icons/LogoIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { KeyIcon } from './icons/KeyIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

interface PinVaultLoginProps {
  onUnlock: (data: VaultData, pin: string) => void;
  onReset: () => void;
}

export const PinVaultLogin: React.FC<PinVaultLoginProps> = ({ onUnlock, onReset }) => {
    const [pin, setPin] = useState(['', '', '', '', '', '']);
    const [visibleIndexes, setVisibleIndexes] = useState<Set<number>>(new Set());
    const [status, setStatus] = useState<'idle' | 'unlocking' | 'success' | 'error'>('idle');
    const inputRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];

    useEffect(() => {
        const timer = setTimeout(() => inputRefs[0].current?.focus(), 150);
        return () => clearTimeout(timer);
    }, []);

    const handleInput = (value: string, index: number) => {
        if (status === 'unlocking' || status === 'success') return;
        const char = value.slice(-1);
        if (!/^\d*$/.test(char)) return;

        const newPin = [...pin];
        newPin[index] = char;
        setPin(newPin);
        setStatus('idle');

        // Show digit briefly for feedback
        setVisibleIndexes(prev => new Set(prev).add(index));
        setTimeout(() => {
            setVisibleIndexes(prev => {
                const next = new Set(prev);
                next.delete(index);
                return next;
            });
        }, 1200);

        if (char !== '' && index < 5) inputRefs[index + 1].current?.focus();
        if (index === 5 && char !== '') executeUnlock(newPin.join(''));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace') {
            if (pin[index] === '' && index > 0) inputRefs[index - 1].current?.focus();
            const newPin = [...pin];
            newPin[index] = '';
            setPin(newPin);
        }
    };

    const executeUnlock = async (finalPin: string) => {
        setStatus('unlocking');
        try {
            const data = await cryptoService.unlockVault(finalPin);
            if (data) {
                setStatus('success');
                setTimeout(() => onUnlock(data, finalPin), 400);
            } else {
                setPin(['', '', '', '', '', '']);
                setStatus('error');
                inputRefs[0].current?.focus();
            }
        } catch (err) {
            setStatus('error');
            setPin(['', '', '', '', '', '']);
            inputRefs[0].current?.focus();
        }
    };

    return (
        <div className="module-frame glass-module p-10 sm:p-14 rounded-[4rem] border-white/20 shadow-premium animate-fade-in max-w-md w-full flex flex-col items-center bg-slate-950">
            <div className="corner-tl !border-white/40"></div><div className="corner-br !border-white/40"></div>
            
            <div className="w-24 h-24 bg-black rounded-3xl border-2 border-brand-gold/40 flex items-center justify-center shadow-glow-gold mb-10">
                <LogoIcon className="h-12 w-12 text-brand-gold" />
            </div>

            <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text mb-2 text-center leading-none">Access Protocol</h2>
            <p className="label-caps !text-[10px] !text-white/50 mb-14 font-black text-center uppercase tracking-[0.4em]">Node Signature Required</p>

            <div className="w-full px-4">
                <div className="flex justify-between gap-3 mb-16">
                    {pin.map((digit, i) => (
                        <div key={i} className="relative flex-1">
                            <input
                                ref={inputRefs[i]}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                disabled={status === 'unlocking' || status === 'success'}
                                onChange={(e) => handleInput(e.target.value, i)}
                                onKeyDown={(e) => handleKeyDown(e, i)}
                                className={`w-full aspect-[4/5] bg-black border-[3px] rounded-2xl text-center text-5xl font-black transition-all outline-none caret-transparent
                                    ${status === 'error' ? 'border-red-500 bg-red-950/40 text-red-500' : digit ? 'border-brand-gold ring-4 ring-brand-gold/10 text-brand-gold shadow-glow-gold' : 'border-white/10 text-white'}
                                    ${status === 'success' ? 'border-emerald-500 bg-emerald-950/40 shadow-glow-matrix text-emerald-500' : ''}
                                `}
                            />
                            {digit && !visibleIndexes.has(i) && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-4 h-4 bg-brand-gold rounded-full shadow-glow-gold"></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="h-14 flex flex-col items-center justify-center">
                    {status === 'unlocking' ? (
                        <div className="flex items-center gap-4">
                            <LoaderIcon className="h-6 w-6 animate-spin text-brand-gold" />
                            <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.4em]">Handshaking...</span>
                        </div>
                    ) : status === 'success' ? (
                        <div className="flex items-center gap-3 animate-fade-in">
                            <CheckCircleIcon className="h-8 w-8 text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Entry Authorized</span>
                        </div>
                    ) : status === 'error' ? (
                        <p className="text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-500/10 px-8 py-3 rounded-full border border-red-500/30 animate-pulse">Signature Mismatch</p>
                    ) : (
                        <p className="text-[9px] text-white/30 font-black uppercase tracking-[0.3em]">Encrypted Terminal Locked</p>
                    )}
                </div>
            </div>

            <div className="mt-14 w-full pt-10 border-t border-white/5 space-y-8">
                <button 
                    onClick={onReset} 
                    className="w-full flex items-center justify-center gap-3 text-[11px] font-black text-brand-gold/60 hover:text-brand-gold uppercase tracking-[0.4em] transition-all group"
                >
                    <KeyIcon className="h-5 w-5 opacity-40 group-hover:opacity-100" />
                    State Reconstruction
                </button>
                
                <div className="p-8 bg-red-950/20 border border-red-900/30 rounded-[3rem] space-y-4 text-center shadow-2xl">
                    <p className="text-[8px] text-red-500 font-black uppercase tracking-[0.5em] opacity-60">Lazarus Recovery Protocol</p>
                    <button 
                        onClick={onReset}
                        className="flex items-center justify-center gap-4 mx-auto py-4 px-10 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-premium active:scale-95 transition-all"
                    >
                        <AlertTriangleIcon className="h-4 w-4" /> Initialize Lazarus
                    </button>
                </div>
            </div>
        </div>
    );
};
