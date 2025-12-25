
import React, { useState, useRef, useEffect } from 'react';
import { cryptoService, VaultData } from '../services/cryptoService';
import { LogoIcon } from './icons/LogoIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

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
        <div className="module-frame glass-module p-8 sm:p-12 rounded-[3.5rem] border-white/20 shadow-premium animate-fade-in max-w-sm w-full flex flex-col items-center">
            <div className="corner-tl !border-white/40"></div><div className="corner-br !border-white/40"></div>
            
            <div className="w-24 h-24 bg-black rounded-3xl border-2 border-brand-gold/40 flex items-center justify-center shadow-glow-gold mb-8">
                <LogoIcon className="h-12 w-12 text-brand-gold" />
            </div>

            <h2 className="text-2xl font-black text-white uppercase tracking-tighter gold-text mb-2 text-center leading-none">Security Access</h2>
            <p className="label-caps !text-[9px] !text-white mb-12 font-black text-center">Verify 6-Digit PIN</p>

            <div className="w-full">
                <div className="flex justify-between gap-3 mb-12">
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
                            className={`w-full aspect-[4/5] bg-slate-800 border-[3px] rounded-2xl text-center text-3xl font-black text-white focus:outline-none transition-all
                                ${status === 'error' ? 'border-red-500 bg-red-900/20' : digit ? 'border-brand-gold ring-4 ring-brand-gold/20 shadow-glow-gold' : 'border-white/20'}
                                ${status === 'success' ? 'border-emerald-500 bg-emerald-900/20 shadow-glow-matrix' : ''}
                            `}
                        />
                    ))}
                </div>

                <div className="h-12 flex flex-col items-center justify-center">
                    {status === 'unlocking' ? (
                        <LoaderIcon className="h-6 w-6 animate-spin text-brand-gold" />
                    ) : status === 'success' ? (
                        <CheckCircleIcon className="h-8 w-8 text-emerald-500" />
                    ) : status === 'error' ? (
                        <p className="text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-500/10 px-4 py-1 rounded-full">Authentication Failed</p>
                    ) : (
                        <p className="text-[9px] text-white font-black uppercase tracking-[0.3em] opacity-50">Handshake Secure</p>
                    )}
                </div>
            </div>

            <button onClick={onReset} className="mt-10 text-[11px] font-black text-brand-gold hover:text-white uppercase tracking-[0.4em] transition-all border-b-2 border-brand-gold/20 pb-1">
                Forgot PIN?
            </button>
        </div>
    );
};
