
import React, { useState, useRef, useEffect } from 'react';
import { cryptoService, VaultData } from '../services/cryptoService';
import { api } from '../services/apiService';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { KeyIcon } from './icons/KeyIcon';
import { User } from '../types';
import { auth } from '../services/firebase';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { GenesisNodeFlow } from './GenesisNodeFlow';
import { UserCircleIcon } from './icons/UserCircleIcon';

interface RecoveryProtocolProps {
    onComplete: (mnemonic: string, pin: string, data: VaultData) => void;
    onBack: () => void;
}

const EXAMPLE_PHRASE = [
    "vessel", "ocean", "logic", "anchor", "orbit", "quantum",
    "matrix", "spirit", "nature", "census", "bridge", "legacy"
];

export const RecoveryProtocol: React.FC<RecoveryProtocolProps> = ({ onComplete, onBack }) => {
    const [phraseParts, setPhraseParts] = useState<string[]>(Array(12).fill(''));
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [step, setStep] = useState(1);
    const [isVerifying, setIsVerifying] = useState(false);
    const [recoveredAccount, setRecoveredAccount] = useState<User | null>(null);
    const [scanningStatus, setScanningStatus] = useState('');
    const [sessionMismatch, setSessionMismatch] = useState<string | null>(null);
    const [isLazarusMode, setIsLazarusMode] = useState(false);
    
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (step === 1 && !isLazarusMode) {
            inputRefs.current[0]?.focus();
        }
    }, [step, isLazarusMode]);

    const handleWordChange = (val: string, index: number) => {
        const cleanVal = val.trim().toLowerCase();
        
        if (cleanVal.includes(' ')) {
            const words = cleanVal.split(/\s+/).slice(0, 12);
            const newParts = [...phraseParts];
            words.forEach((w, i) => {
                if (index + i < 12) newParts[index + i] = w;
            });
            setPhraseParts(newParts);
            const nextIdx = Math.min(index + words.length, 11);
            inputRefs.current[nextIdx]?.focus();
            return;
        }

        const newParts = [...phraseParts];
        newParts[index] = cleanVal;
        setPhraseParts(newParts);

        if (val.endsWith(' ') && index < 11) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Backspace' && !phraseParts[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifySeed = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const fullPhrase = phraseParts.join(' ').trim();
        if (!cryptoService.validateMnemonic(fullPhrase)) {
            alert("INTEGRITY ERROR: Recovery phrase invalid format.");
            return;
        }

        setIsVerifying(true);
        setScanningStatus("SCANNING_LEDGER...");
        
        try {
            const keyPair = cryptoService.mnemonicToKeyPair(fullPhrase);
            const user = await api.getUserByPublicKey(keyPair.publicKey);
            
            if (user) {
                setRecoveredAccount(user);
                const currentEmail = auth.currentUser?.email;
                if (currentEmail && currentEmail.toLowerCase() !== user.email.toLowerCase()) {
                    setSessionMismatch(user.email);
                    setIsVerifying(false);
                    return;
                }
                setScanningStatus("IDENTITY_FOUND");
                setStep(2);
            } else {
                setScanningStatus("NODE_IS_GENESIS");
                setStep(2);
            }
        } catch (e) {
            console.error("Recovery scan failed:", e);
            alert("Handshake aborted. Protocol inaccessible.");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleReset = () => {
        if (pin.length !== 6 || pin !== confirmPin) {
            alert("PIN MISMATCH: Secure sequences must be identical.");
            return;
        }

        const mnemonic = phraseParts.join(' ').trim();
        const vaultData: VaultData = {
            mnemonic,
            email: recoveredAccount?.email || auth.currentUser?.email || undefined
        };
        onComplete(mnemonic, pin, vaultData);
    };

    const handleLazarusRotation = async (newMnemonic: string, newPin: string) => {
        setIsVerifying(true);
        try {
            const vaultData: VaultData = {
                mnemonic: newMnemonic,
                email: auth.currentUser?.email || undefined
            };
            onComplete(newMnemonic, newPin, vaultData);
        } finally {
            setIsVerifying(false);
        }
    };

    if (isLazarusMode) {
        return (
            <div className="space-y-8 animate-fade-in w-full max-w-2xl pointer-events-auto">
                 <div className="module-frame glass-module p-10 rounded-[3rem] border-red-500/20 shadow-premium animate-fade-in text-center space-y-8">
                    <div className="p-5 bg-red-500/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center border border-red-500/20 shadow-glow-matrix">
                        <AlertTriangleIcon className="h-10 w-10 text-red-500" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Lazarus Protocol</h2>
                        <p className="text-sm text-gray-400 leading-relaxed max-w-sm mx-auto uppercase tracking-widest opacity-80">
                            Emergency Key Rotation for node: <strong className="text-brand-gold">{auth.currentUser?.email}</strong>. Use your account authentication to establish a new Identity Anchor.
                        </p>
                    </div>
                </div>
                <GenesisNodeFlow onComplete={handleLazarusRotation} onBack={() => setIsLazarusMode(false)} />
            </div>
        );
    }

    if (sessionMismatch) {
        return (
            <div className="module-frame glass-module p-10 rounded-[3rem] border-red-500/20 shadow-premium animate-fade-in max-md w-full text-center space-y-8 pointer-events-auto">
                <div className="p-5 bg-red-500/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center border border-red-500/20">
                    <ShieldCheckIcon className="h-10 w-10 text-red-500" />
                </div>
                <div className="space-y-4">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Identity Mismatch</h2>
                    <p className="text-sm text-gray-400 leading-relaxed uppercase tracking-widest font-black opacity-60">
                        Phrase maps to: <span className="text-brand-gold">{sessionMismatch}</span>
                    </p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                        Currently authenticated as: <span className="text-white">{auth.currentUser?.email}</span>. Credentials must align to re-anchor.
                    </p>
                </div>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => api.logout().then(() => window.location.reload())}
                        className="w-full py-5 bg-white text-black font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-xl cursor-pointer"
                    >
                        Switch Node (Logout)
                    </button>
                    <button onClick={onBack} className="w-full py-3 text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest cursor-pointer">Abort</button>
                </div>
            </div>
        );
    }

    return (
        <div className="module-frame glass-module p-6 sm:p-10 rounded-[3.5rem] border-white/10 shadow-premium animate-fade-in max-w-2xl w-full relative overflow-hidden font-sans pointer-events-auto">
            <div className="corner-tl !border-white/40"></div><div className="corner-tr !border-white/40"></div><div className="corner-bl !border-white/40"></div><div className="corner-br !border-white/40"></div>
            
            <div className="text-center mb-8 relative z-10">
                <div className="w-20 h-20 bg-brand-gold/10 rounded-2xl flex items-center justify-center border border-brand-gold/20 mx-auto mb-6 shadow-glow-gold">
                    <KeyIcon className="h-10 w-10 text-brand-gold" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text leading-none">Node Recovery</h2>
                <p className="label-caps mt-3 !text-emerald-500/80 !text-[8px] !tracking-[0.4em]">Sovereign Reconstitution Protocol</p>
            </div>

            {step === 1 ? (
                <div className="space-y-8 animate-fade-in relative z-10">
                    <div className="bg-brand-gold/5 border border-brand-gold/20 p-5 rounded-2xl text-center">
                        <p className="text-[10px] text-brand-gold font-black uppercase tracking-[0.2em] leading-loose">
                            Enter your 12-word Identity Anchor in order to recover your <span className="text-white">existing Node and protocol stake</span>.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {phraseParts.map((word, i) => (
                            <div key={i} className="relative group">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-white/20 font-mono group-focus-within:text-brand-gold">
                                    {(i + 1).toString().padStart(2, '0')}
                                </span>
                                <input
                                    ref={el => inputRefs.current[i] = el}
                                    type="text"
                                    value={word}
                                    onChange={e => handleWordChange(e.target.value, i)}
                                    onKeyDown={e => handleKeyDown(e, i)}
                                    placeholder={EXAMPLE_PHRASE[i]}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 pl-10 pr-3 text-white font-mono text-xs lowercase focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20 placeholder-slate-800 transition-all font-bold"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-4">
                        <button 
                            type="button"
                            onClick={handleVerifySeed}
                            disabled={isVerifying || phraseParts.some(w => !w)}
                            className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all disabled:opacity-20 flex justify-center items-center gap-3 cursor-pointer"
                        >
                            {isVerifying ? (
                                <>
                                    <LoaderIcon className="h-4 w-4 animate-spin"/>
                                    <span>{scanningStatus}</span>
                                </>
                            ) : (
                                "Authorize Identity Lookup"
                            )}
                        </button>

                        <div className="pt-8 border-t border-white/5 space-y-6 text-center">
                            <div className="flex items-center gap-3 justify-center">
                                <div className="h-px w-8 bg-white/10"></div>
                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Forgotten PIN / Lost Phrase?</p>
                                <div className="h-px w-8 bg-white/10"></div>
                            </div>
                            
                            <div className="p-6 bg-blue-900/5 rounded-3xl border border-blue-900/20 group hover:border-blue-500/30 transition-all">
                                <p className="text-[10px] text-gray-400 mb-4 leading-relaxed uppercase tracking-widest font-black opacity-60">Restore access via cloud credentials.</p>
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if(window.confirm("ACCOUNT_RECOVERY: This will overwrite your existing local vault using your authenticated credentials. Proceed?")) {
                                            setIsLazarusMode(true);
                                        }
                                    }}
                                    className="px-8 py-4 bg-white/5 hover:bg-brand-gold hover:text-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 flex items-center justify-center gap-3 mx-auto shadow-xl cursor-pointer"
                                >
                                    <UserCircleIcon className="h-5 w-5" /> Account Rotation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-10 animate-fade-in relative z-10 max-w-sm mx-auto pointer-events-auto">
                    <div className="text-center space-y-4">
                        <div className="inline-flex p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20 shadow-glow-matrix">
                            <ShieldCheckIcon className="h-8 w-8" />
                        </div>
                        {recoveredAccount ? (
                            <div>
                                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Node Ownership Verified</p>
                                <p className="text-lg text-white font-black uppercase mt-1">{recoveredAccount.name}</p>
                                <div className="mt-4 p-4 bg-black/40 border border-white/5 rounded-2xl">
                                    <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">Associated Address</p>
                                    <p className="text-[10px] text-brand-gold font-mono truncate">{recoveredAccount.email}</p>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm text-gray-300 font-bold uppercase tracking-widest">Identity Verified</p>
                                <p className="label-caps !text-[9px] !text-gray-500">New Sovereign Deployment</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-4">
                        <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest text-center">Establish local node access PIN</p>
                        <input 
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={pin}
                            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="SET SECURITY PIN"
                            className="w-full bg-slate-900 border-2 border-white/10 rounded-2xl p-6 text-brand-gold text-center text-3xl font-black tracking-[0.5em] focus:border-brand-gold outline-none"
                        />
                        <input 
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={confirmPin}
                            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="CONFIRM PIN"
                            className="w-full bg-slate-900 border-2 border-white/10 rounded-2xl p-6 text-brand-gold text-center text-3xl font-black tracking-[0.5em] focus:border-brand-gold outline-none"
                        />
                    </div>
                    
                    <button 
                        type="button"
                        onClick={handleReset}
                        disabled={isVerifying || pin.length < 6 || pin !== confirmPin}
                        className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all disabled:opacity-20 cursor-pointer"
                    >
                        {isVerifying ? <LoaderIcon className="h-6 w-6 animate-spin mx-auto"/> : "Complete Re-Anchor"}
                    </button>
                </div>
            )}

            <button onClick={onBack} className="w-full mt-10 text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-[0.5em] transition-colors flex items-center justify-center gap-3 relative z-10 cursor-pointer">
                <ArrowLeftIcon className="h-3 w-3" /> Abort Protocol
            </button>
        </div>
    );
};
