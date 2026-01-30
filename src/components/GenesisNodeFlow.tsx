
import React, { useState, useEffect } from 'react';
import { cryptoService } from '../services/cryptoService';
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
        if (step === 1 && !mnemonic && !isGenerating) {
            setIsGenerating(true);
            try {
                const newMnemonic = cryptoService.generateMnemonic();
                setMnemonic(newMnemonic);
            } catch (error) {
                console.error("Security setup error:", error);
            } finally {
                setIsGenerating(false);
            }
        }
    }, [step, mnemonic, isGenerating]);

    const words = mnemonic ? mnemonic.split(' ') : [];

    const handleNextStep = () => {
        if (step === 1) {
            if (!mnemonic) return;
            setVerifyWordIndex(Math.floor(Math.random() * 12));
            setStep(2);
        } else if (step === 2) {
            if (verifyInput.trim().toLowerCase() === words[verifyWordIndex]) {
                setStep(3);
            } else {
                alert("The word doesn't match. Please check your list again.");
                setVerifyInput('');
            }
        } else if (step === 3) {
            if (pin.length === 6 && pin === confirmPin) {
                onComplete(mnemonic, pin);
            } else {
                alert("The PINs must be 6 digits and must match.");
            }
        }
    };

    return (
        <div className="module-frame glass-module p-8 sm:p-12 rounded-[3rem] border-brand-gold/20 shadow-premium animate-fade-in max-w-2xl w-full relative">
            <div className="corner-tl !border-brand-gold/40"></div><div className="corner-tr !border-brand-gold/40"></div><div className="corner-bl !border-brand-gold/40"></div><div className="corner-br !border-brand-gold/40"></div>
            
            <div className="flex flex-col items-center mb-10 text-center">
                <div className="w-16 h-16 bg-brand-gold/10 rounded-2xl flex items-center justify-center border border-brand-gold/20 mb-6 shadow-glow-gold">
                    <ShieldCheckIcon className="h-8 w-8 text-brand-gold" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text leading-none">
                    {step === 1 ? 'Your Golden Key' : step === 2 ? 'Double Check' : 'Your PIN'}
                </h2>
                <p className="label-caps mt-3 !text-gray-500 !text-[8px] !tracking-[0.4em]">
                    {step === 1 ? 'Save these recovery words' : step === 2 ? 'Confirming your key' : 'Choose a personal code'}
                </p>
            </div>

            {step === 1 && (
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-red-950/20 border border-red-500/20 p-5 rounded-2xl text-center">
                        <p className="text-[10px] text-red-500 font-black uppercase tracking-[0.2em] leading-loose">
                            Write these 12 words down on a piece of paper. If you ever lose access to your account, these words are the <span className="text-white">only way</span> to get back in.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 min-h-[160px]">
                        {isGenerating ? (
                            <div className="col-span-full flex flex-col items-center justify-center gap-4 py-12">
                                <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold opacity-50"/>
                                <span className="label-caps !text-[8px] opacity-40">Creating your key...</span>
                            </div>
                        ) : words.map((w, i) => (
                            <div key={i} className="bg-black/40 border border-white/5 p-4 rounded-xl flex items-center gap-3 group hover:border-brand-gold/30 transition-all">
                                <span className="text-[10px] font-black text-gray-700 font-mono">{(i+1).toString().padStart(2, '0')}</span>
                                <span className="text-white font-bold text-sm lowercase tracking-wide">{w}</span>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={handleNextStep} 
                        disabled={isGenerating || !mnemonic}
                        className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-20"
                    >
                        I've Written Them Down <ArrowRightIcon className="h-4 w-4"/>
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-10 animate-fade-in max-w-sm mx-auto text-center">
                    <p className="text-gray-400 text-sm leading-relaxed uppercase font-black tracking-widest opacity-80">Enter word number <strong className="text-brand-gold">#{verifyWordIndex + 1}</strong> from your list.</p>
                    <input 
                        type="text" 
                        value={verifyInput}
                        onChange={e => setVerifyInput(e.target.value.toLowerCase().trim())}
                        className="w-full bg-slate-900 border-2 border-brand-gold/40 p-6 rounded-2xl text-white font-mono text-center text-2xl tracking-[0.3em] focus:ring-4 focus:ring-brand-gold/10 outline-none transition-all"
                        placeholder="TYPE WORD..."
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                    />
                    <button onClick={handleNextStep} disabled={!verifyInput} className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.3em] text-[10px] shadow-glow-gold active:scale-95 transition-all">
                        Check My Key
                    </button>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-10 animate-fade-in max-w-sm mx-auto">
                    <p className="text-gray-400 text-sm leading-relaxed text-center uppercase tracking-widest font-black opacity-80">Choose a <strong className="text-white">6-digit PIN</strong> to open the app.</p>
                    
                    <div className="space-y-4">
                        <input 
                            type="password" 
                            inputMode="numeric"
                            maxLength={6}
                            value={pin}
                            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-slate-900 border-2 border-white/10 rounded-2xl p-6 text-brand-gold text-center text-4xl font-black tracking-[0.5em] focus:border-brand-gold outline-none transition-all"
                            placeholder="000000"
                        />
                        <input 
                            type="password" 
                            inputMode="numeric"
                            maxLength={6}
                            value={confirmPin}
                            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-slate-900 border-2 border-white/10 rounded-2xl p-6 text-brand-gold text-center text-4xl font-black tracking-[0.5em] focus:border-brand-gold outline-none transition-all"
                            placeholder="RE-TYPE"
                            onKeyDown={(e) => e.key === 'Enter' && pin.length === 6 && handleNextStep()}
                        />
                    </div>

                    <button onClick={handleNextStep} disabled={pin.length !== 6 || pin !== confirmPin} className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.3em] text-[10px] shadow-glow-gold active:scale-95 transition-all">
                        Finish Setup
                    </button>
                </div>
            )}

            <button onClick={onBack} className="w-full mt-10 text-[9px] font-black text-gray-700 hover:text-white uppercase tracking-[0.5em] transition-colors">
                Cancel
            </button>
        </div>
    );
};
