
import React, { useState, useRef, useEffect } from 'react';
import { cryptoService, VaultData } from '../services/cryptoService';
import { LogoIcon } from './icons/LogoIcon';
import { LockIcon } from './icons/LockIcon';
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
        <div className="module-frame glass-module p-8 sm:p-12 rounded-[3rem] border-white/10 shadow-premium animate-fade-in max-w-sm w-full flex flex-col items-center">
            <div className="corner-tl opacity-20"></div><div className="corner-br opacity-20"></div>
            
            <div className="w-20 h-20 bg-black rounded-2xl border border-brand-gold/30 flex items-center justify-center shadow-glow-gold mb-8">
                <LogoIcon className="h-10 w-10 text-brand-gold" />
            </div>

            <h2 className="text-xl font-black text-white uppercase tracking-tighter gold-text mb-1">Authorization Required</h2>
            <p className="label-caps !text-[8px] !text-gray-500 mb-10">Enter your 6-digit Unlock PIN</p>

            <div className="w-full">
                <div className="flex justify-between gap-2 mb-10">
                    {pin.map((digit, i) => (
                        <input
                            key={i}
                            ref={inputRefs[i]}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            disabled={status === 'unlocking' || status === 'success'}
                            onChange={(e) => handleInput(e.target.value, i)}
                            onKeyDown={(e) => handleKeyDown(e, i)}
                            className={`w-10 h-14 bg-black border-2 rounded-xl text-center text-2xl font-black text-white focus:outline-none transition-all
                                ${status === 'error' ? 'border-red-500/50' : digit ? 'border-brand-gold shadow-glow-gold' : 'border-white/5'}
                                ${status === 'success' ? 'border-emerald-500 shadow-glow-matrix' : ''}
                            `}
                        />
                    ))}
                </div>

                <div className="h-12 flex flex-col items-center justify-center">
                    {status === 'unlocking' ? (
                        <LoaderIcon className="h-5 w-5 animate-spin text-brand-gold" />
                    ) : status === 'success' ? (
                        <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
                    ) : status === 'error' ? (
                        <p className="text-red-500 text-[9px] font-black uppercase tracking-widest">Invalid PIN</p>
                    ) : (
                        <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest">Secure Handshake Active</p>
                    )}
                </div>
            </div>

            <button onClick={onReset} className="mt-8 text-[8px] font-black text-gray-700 hover:text-brand-gold uppercase tracking-[0.4em]">
                Lost PIN? Restore from JSON Backup
            </button>
        </div>
    );
};
