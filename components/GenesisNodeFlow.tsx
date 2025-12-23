
import React, { useState, useEffect } from 'react';
import { cryptoService } from '../services/cryptoService';
import { LogoIcon } from './icons/LogoIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

interface GenesisNodeFlowProps {
  onComplete: (mnemonic: string, pin: string) => void;
  onBack: () => void;
}

export const GenesisNodeFlow: React.FC<GenesisNodeFlowProps> = ({ onComplete, onBack }) => {
    const [step, setStep] = useState(1);
    const [mnemonic, setMnemonic] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [verifyWordIndex, setVerifyWordIndex] = useState(0);
    const [verifyInput, setVerifyInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (step === 1) {
            setIsGenerating(true);
            setTimeout(() => {
                setMnemonic(cryptoService.generateMnemonic());
                setIsGenerating(false);
            }, 1000);
        }
    }, [step]);

    const words = mnemonic.split(' ');

    const handleNextStep = () => {
        if (step === 1) {
            // Pick a random word to verify
            setVerifyWordIndex(Math.floor(Math.random() * 12));
            setStep(2);
        } else if (step === 2) {
            if (verifyInput.trim().toLowerCase() === words[verifyWordIndex]) {
                setStep(3);
            } else {
                alert("Verification failed. Please check the word again.");
            }
        } else if (step === 3) {
            if (pin.length === 6 && pin === confirmPin) {
                onComplete(mnemonic, pin);
            } else {
                alert("PINs do not match or are not 6 digits.");
            }
        }
    };

    return (
        <div className="module-frame glass-module p-8 sm:p-12 rounded-[3rem] border-brand-gold/20 shadow-premium animate-fade-in max-w-2xl w-full">
            <div className="corner-tl"></div><div className="corner-tr"></div><div className="corner-bl"></div><div className="corner-br"></div>
            
            <div className="flex flex-col items-center mb-10 text-center">
                <div className="w-16 h-16 bg-brand-gold/10 rounded-2xl flex items-center justify-center border border-brand-gold/20 mb-6">
                    <ShieldCheckIcon className="h-8 w-8 text-brand-gold" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text">
                    {step === 1 ? 'Genesis Anchor' : step === 2 ? 'Verify Anchor' : 'Node Lock'}
                </h2>
                <p className="label-caps mt-2 !text-gray-500">
                    {step === 1 ? 'Secure your 12-word seed' : step === 2 ? 'Prove ownership' : 'Secure your node with a PIN'}
                </p>
            </div>

            {step === 1 && (
                <div className="space-y-8 animate-fade-in">
                    <p className="text-gray-400 text-sm leading-relaxed text-center font-medium">
                        These 12 words are your <strong className="text-white">Absolute Identity</strong>. Write them down and keep them in a physical safe. 
                        <span className="block mt-2 text-red-500 font-bold uppercase tracking-widest text-[10px]">No one, not even Ubuntium, can recover these for you.</span>
                    </p>
                    
                    <div className="grid grid-cols-3 gap-3">
                        {isGenerating ? (
                            <div className="col-span-3 py-12 flex justify-center"><LoaderIcon className="h-8 w-8 animate-spin text-brand-gold"/></div>
                        ) : words.map((w, i) => (
                            <div key={i} className="bg-black/40 border border-white/5 p-3 rounded-xl flex items-center gap-3 group hover:border-brand-gold/30 transition-all">
                                <span className="text-[10px] font-black text-gray-700 font-mono">{(i+1).toString().padStart(2, '0')}</span>
                                <span className="text-white font-bold text-sm lowercase">{w}</span>
                            </div>
                        ))}
                    </div>

                    <button onClick={handleNextStep} className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-2">
                        I Have Anchored My Node <ArrowRightIcon className="h-4 w-4"/>
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8 animate-fade-in">
                    <p className="text-gray-400 text-sm text-center">Enter word number <strong className="text-brand-gold">#{verifyWordIndex + 1}</strong> from your anchor phrase to confirm storage.</p>
                    <input 
                        type="text" 
                        value={verifyInput}
                        onChange={e => setVerifyInput(e.target.value)}
                        className="w-full bg-black border border-brand-gold/20 p-5 rounded-2xl text-white font-mono text-center text-xl focus:outline-none focus:ring-1 focus:ring-brand-gold"
                        placeholder="WORD..."
                        autoFocus
                    />
                    <button onClick={handleNextStep} disabled={!verifyInput} className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.3em] text-[10px] shadow-glow-gold active:scale-95 transition-all">
                        Verify Anchor
                    </button>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-8 animate-fade-in max-w-sm mx-auto">
                    <p className="text-gray-400 text-sm text-center">Set a <strong className="text-white">6-digit PIN</strong>. You will use this to unlock your node for daily use.</p>
                    
                    <div className="space-y-4">
                        <input 
                            type="password" 
                            inputMode="numeric"
                            maxLength={6}
                            value={pin}
                            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-black border border-white/10 p-5 rounded-2xl text-white font-mono text-center text-3xl tracking-[0.5em] focus:outline-none focus:border-brand-gold"
                            placeholder="••••••"
                        />
                        <input 
                            type="password" 
                            inputMode="numeric"
                            maxLength={6}
                            value={confirmPin}
                            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-black border border-white/10 p-5 rounded-2xl text-white font-mono text-center text-3xl tracking-[0.5em] focus:outline-none focus:border-brand-gold"
                            placeholder="CONFIRM"
                        />
                    </div>

                    <button onClick={handleNextStep} disabled={pin.length !== 6 || pin !== confirmPin} className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.3em] text-[10px] shadow-glow-gold active:scale-95 transition-all">
                        Initialize Node
                    </button>
                </div>
            )}

            <button onClick={onBack} className="w-full mt-6 text-[10px] font-black text-gray-700 hover:text-white uppercase tracking-widest transition-colors">
                Cancel Initialization
            </button>
        </div>
    );
};
