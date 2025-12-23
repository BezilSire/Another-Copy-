
import React, { useState } from 'react';
import { cryptoService } from '../services/cryptoService';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface RecoveryProtocolProps {
    onComplete: (mnemonic: string, pin: string) => void;
    onBack: () => void;
}

export const RecoveryProtocol: React.FC<RecoveryProtocolProps> = ({ onComplete, onBack }) => {
    const [mnemonic, setMnemonic] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [step, setStep] = useState(1);
    const [isVerifying, setIsVerifying] = useState(false);

    const handleVerifySeed = () => {
        if (!cryptoService.validateMnemonic(mnemonic)) {
            alert("Invalid 12-word phrase. Please check for typos and ensure exactly 12 words are entered.");
            return;
        }
        setStep(2);
    };

    const handleReset = async () => {
        if (newPin.length !== 6 || newPin !== confirmPin) {
            alert("PINs must be 6 digits and match.");
            return;
        }
        setIsVerifying(true);
        // Simulate derivation time
        setTimeout(() => {
            onComplete(mnemonic, newPin);
        }, 1000);
    };

    return (
        <div className="module-frame glass-module p-8 sm:p-12 rounded-[3rem] border-white/10 shadow-premium animate-fade-in max-w-md w-full">
            <div className="corner-tl"></div><div className="corner-br"></div>
            
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-brand-gold/10 rounded-2xl flex items-center justify-center border border-brand-gold/20 mx-auto mb-6">
                    <ShieldCheckIcon className="h-8 w-8 text-brand-gold" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter gold-text">Recovery Protocol</h2>
                <p className="label-caps mt-2 !text-gray-500">Restore Access via Identity Anchor</p>
            </div>

            {step === 1 ? (
                <div className="space-y-6">
                    <p className="text-xs text-gray-400 uppercase font-black leading-loose text-center">
                        Input your 12-word seed phrase to re-verify your node ownership and reset your security PIN.
                    </p>
                    <textarea 
                        value={mnemonic}
                        onChange={e => setMnemonic(e.target.value)}
                        placeholder="ENTER YOUR 12 WORDS HERE..."
                        className="w-full h-32 bg-black border border-white/10 rounded-2xl p-5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold/40 placeholder-gray-800 lowercase"
                    />
                    <button 
                        onClick={handleVerifySeed}
                        disabled={!mnemonic.trim()}
                        className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.2em] text-xs"
                    >
                        Verify Anchor
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <p className="text-xs text-gray-400 uppercase font-black leading-loose text-center">
                        Ownership verified. Set a new 6-digit PIN to secure your local node session.
                    </p>
                    <div className="space-y-4">
                        <input 
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={newPin}
                            onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="NEW 6-DIGIT PIN"
                            className="w-full bg-white border-none rounded-2xl p-5 text-slate-900 text-center text-2xl font-black tracking-[0.5em] focus:ring-4 focus:ring-brand-gold/20"
                        />
                        <input 
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={confirmPin}
                            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="CONFIRM PIN"
                            className="w-full bg-white border-none rounded-2xl p-5 text-slate-900 text-center text-2xl font-black tracking-[0.5em] focus:ring-4 focus:ring-brand-gold/20"
                        />
                    </div>
                    <button 
                        onClick={handleReset}
                        disabled={isVerifying || newPin.length < 6}
                        className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.2em] text-xs shadow-glow-gold"
                    >
                        {isVerifying ? <LoaderIcon className="h-5 w-5 animate-spin mx-auto"/> : "Finalize Reset"}
                    </button>
                </div>
            )}

            <button onClick={onBack} className="w-full mt-8 text-[9px] font-black text-gray-700 hover:text-white uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                <ArrowLeftIcon className="h-3 w-3" /> Abort Recovery
            </button>
        </div>
    );
};
