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
                setTimeout(() => onUnlock(data, finalPin), 200);
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
        <div className="module-frame glass-module p-10 sm:p-14 rounded-[4rem] border-white/20 shadow-premium animate-fade-in max-w-sm w-full flex flex-col items-center">
            <div className="corner-tl !border-white/40"></div><div className="corner-br !border-white/40"></div>
            
            <div className="w-24 h-24 bg-black rounded-3xl border-2 border-brand-gold/40 flex items-center justify-center shadow-glow-gold mb-8">
                <LogoIcon className="h-12 w-12 text-brand-gold" />
            </div>

            <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text mb-2 text-center leading-none">Security Access</h2>
            <p className="label-caps !text-[10px] !text-white mb-14 font-black text-center uppercase tracking-widest opacity-70">Verify 6-Digit PIN</p>

            <div className="w-full">
                <div className="flex justify-between gap-3 mb-14">
                    {pin.map((digit, i) => (
                        <input
                            key={i}
                            ref={inputRefs[i]}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            disabled={status === 'unlocking' || status === 'success'}
                            onChange={(e) => handleInput(e.target.value, i)}
                            onKeyDown={(e) => handleKeyDown(e, i)}
                            className={`w-full aspect-[4/5] bg-slate-950 border-[3px] rounded-2xl text-center text-5xl font-black transition-all outline-none
                                ${status === 'error' ? 'border-red-500 bg-red-900/20 text-red-500' : digit ? 'border-brand-gold ring-4 ring-brand-gold/20 shadow-glow-gold text-brand-gold' : 'border-white/20 text-white'}
                                ${status === 'success' ? 'border-emerald-500 bg-emerald-900/20 shadow-glow-matrix text-emerald-500' : ''}
                            `}
                        />
                    ))}
                </div>

                <div className="h-12 flex flex-col items-center justify-center">
                    {status === 'unlocking' ? (
                        <div className="flex items-center gap-3">
                            <LoaderIcon className="h-6 w-6 animate-spin text-brand-gold" />
                            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Unlocking Vault...</span>
                        </div>
                    ) : status === 'success' ? (
                        <div className="flex items-center gap-3">
                            <CheckCircleIcon className="h-8 w-8 text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Access Granted</span>
                        </div>
                    ) : status === 'error' ? (
                        <p className="text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-500/10 px-6 py-2 rounded-full">Authentication Failed</p>
                    ) : (
                        <p className="text-[9px] text-white font-black uppercase tracking-[0.3em] opacity-40">Handshake Secure</p>
                    )}
                </div>
            </div>

            <div className="mt-12 w-full pt-10 border-t border-white/5 space-y-6">
                <button 
                    onClick={onReset} 
                    className="w-full flex items-center justify-center gap-3 text-[11px] font-black text-brand-gold hover:text-white uppercase tracking-[0.4em] transition-all group"
                >
                    <KeyIcon className="h-5 w-5 opacity-50 group-hover:opacity-100" />
                    Reset Node Access
                </button>
                
                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-[2.5rem] space-y-3 text-center shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                    <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest opacity-60">Identity Crisis Management</p>
                    <button 
                        onClick={onReset}
                        className="flex items-center justify-center gap-3 mx-auto py-3 px-6 bg-red-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:bg-red-400"
                    >
                        <AlertTriangleIcon className="h-3.5 w-3.5" />
                        Lazarus Protocol Recovery
                    </button>
                </div>
            </div>
        </div>
    );
};