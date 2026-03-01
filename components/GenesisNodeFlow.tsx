import React, { useState } from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { cryptoService } from '../services/cryptoService';

interface GenesisNodeFlowProps {
    onComplete: (mnemonic: string, pin: string, data: any) => void;
    onBack: () => void;
}

export const GenesisNodeFlow: React.FC<GenesisNodeFlowProps> = ({ onComplete, onBack }) => {
    const [step, setStep] = useState(1);
    const [mnemonic, setMnemonic] = useState('');
    const [pin, setPin] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        // Simulate heavy crypto work
        setTimeout(() => {
            const m = cryptoService.generateMnemonic();
            setMnemonic(m);
            setStep(2);
            setIsGenerating(false);
        }, 1500);
    };

    const handleFinalize = async () => {
        if (pin.length < 4) return;
        const data = { mnemonic };
        onComplete(mnemonic, pin, data);
    };

    return (
        <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-10 shadow-2xl space-y-8">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 text-gray-500 hover:text-white"><ArrowLeftIcon className="h-6 w-6" /></button>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Node Identity Genesis</h3>
            </div>

            {step === 1 ? (
                <div className="space-y-6">
                    <div className="p-6 bg-brand-gold/5 border border-brand-gold/20 rounded-2xl">
                        <p className="text-xs text-brand-gold leading-relaxed font-bold uppercase tracking-wider">
                            You are about to generate a unique cryptographic identity for your node. This identity is stored locally and used to sign all protocol dispatches.
                        </p>
                    </div>
                    <button 
                        onClick={handleGenerate} 
                        disabled={isGenerating}
                        className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-2xl shadow-glow-gold flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                    >
                        {isGenerating ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <ShieldCheckIcon className="h-5 w-5" />}
                        Generate Sovereign Identity
                    </button>
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in">
                    <div className="p-6 bg-black/40 border border-white/5 rounded-2xl font-mono text-xs text-brand-gold/80 leading-loose break-words">
                        {mnemonic}
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center">
                        Secure this recovery phrase. It is the only way to recover your node.
                    </p>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Set Vault PIN</label>
                        <input 
                            type="password" 
                            maxLength={6} 
                            value={pin} 
                            onChange={e => setPin(e.target.value)} 
                            placeholder="4-6 DIGITS"
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-center text-2xl tracking-[1em] focus:ring-1 focus:ring-brand-gold/30 outline-none"
                        />
                    </div>
                    <button 
                        onClick={handleFinalize}
                        disabled={pin.length < 4}
                        className="w-full py-6 bg-emerald-600 text-white font-black rounded-2xl shadow-glow-emerald/20 uppercase tracking-widest text-xs disabled:opacity-20"
                    >
                        Seal Identity & Finalize
                    </button>
                </div>
            )}
        </div>
    );
};
