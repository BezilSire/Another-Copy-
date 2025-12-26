
import React, { useState } from 'react';
import { cryptoService } from '../services/cryptoService';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { LockIcon } from './icons/LockIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { FileTextIcon } from './icons/FileTextIcon';

export const IdentityVault: React.FC<{ onRestore: () => void }> = ({ onRestore }) => {
    const { currentUser } = useAuth();
    const [password, setPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isMnemonicRevealed, setIsMnemonicRevealed] = useState(false);
    const { addToast } = useToast();

    const publicKey = cryptoService.getPublicKey() || "Generating Identity...";

    const handleCopyKey = () => {
        navigator.clipboard.writeText(publicKey).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            addToast("Node Address Copied.", "info");
        });
    };

    const handleVerifyPin = async () => {
        if (password.length < 6) {
            addToast("Enter your 6-digit PIN to verify.", "error");
            return;
        }
        setIsProcessing(true);
        try {
            const vaultData = await cryptoService.unlockVault(password);
            if (vaultData) {
                addToast("Identity Re-Anchored. Node state verified.", "success");
                setPassword('');
            } else {
                throw new Error("Invalid PIN");
            }
        } catch (e) {
            addToast("Invalid security PIN.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExportJson = async () => {
        if (password.length < 6) {
            addToast("Enter your 6-digit PIN to export backup.", "error");
            return;
        }
        setIsProcessing(true);
        try {
            const vaultData = await cryptoService.unlockVault(password);
            if (!vaultData) throw new Error("Invalid PIN");

            const blob = new Blob([JSON.stringify(vaultData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ubuntium-identity-backup-${currentUser?.name || 'node'}.json`;
            a.click();
            addToast("Backup file exported successfully.", "success");
        } catch (e) {
            addToast("Invalid PIN. Export failed.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-10 animate-fade-in font-sans">
            <div className="module-frame bg-slate-950 p-10 rounded-[3rem] border-white/5 shadow-premium relative">
                 <div className="corner-tl"></div>
                 <div className="flex justify-between items-center mb-8">
                    <p className="label-caps">Public Node Address</p>
                    <button onClick={handleCopyKey} className="p-3 bg-white/5 rounded-xl text-brand-gold hover:text-brand-gold-light transition-all border border-white/10">
                        {isCopied ? <ClipboardCheckIcon className="h-5 w-5 text-emerald-500" /> : <ClipboardIcon className="h-5 w-5" />}
                    </button>
                 </div>
                 <div className="bg-black p-8 rounded-3xl border border-white/10 shadow-inner">
                    <p className="data-mono text-sm text-emerald-500 break-all uppercase leading-relaxed font-bold">
                        {publicKey}
                    </p>
                 </div>
            </div>

            <div className="module-frame bg-slate-950 p-12 rounded-[4rem] border-emerald-500/20 shadow-glow-matrix space-y-10 relative">
                <div className="corner-tr opacity-30"></div><div className="corner-bl opacity-30"></div>
                
                <div className="text-center space-y-4">
                    <div className="p-6 bg-emerald-500/10 rounded-full w-24 h-24 mx-auto flex items-center justify-center border border-emerald-500/20 shadow-glow-matrix">
                        <ShieldCheckIcon className="h-12 w-12 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter gold-text">Vault Operational</h3>
                </div>

                <div className="space-y-4">
                    <label className="label-caps text-center">Verify PIN to Manage Access</label>
                        <input 
                        type="password" 
                        placeholder="ENTER 6-DIGIT PIN" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-2xl p-6 text-white text-center font-mono text-2xl tracking-[0.5em] focus:ring-2 focus:ring-brand-gold/30"
                    />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button onClick={handleVerifyPin} className="py-5 bg-brand-gold text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold-light transition-all flex items-center justify-center gap-3 shadow-glow-gold">
                        <ShieldCheckIcon className="h-5 w-5" /> Re-Sync Node
                        </button>
                        <button onClick={handleExportJson} className="py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                        <DownloadIcon className="h-5 w-5" /> Ledger Backup
                        </button>
                        <button onClick={() => setIsMnemonicRevealed(!isMnemonicRevealed)} className="py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:text-brand-gold transition-all flex items-center justify-center gap-3">
                        <FileTextIcon className="h-5 w-5" /> Seed Phrase
                        </button>
                </div>

                {isMnemonicRevealed && password.length === 6 && (
                    <div className="p-8 bg-red-950/20 border border-red-500/20 rounded-3xl animate-fade-in text-center">
                        <p className="text-[10px] text-red-500 font-black uppercase mb-6 tracking-[0.3em]">CRITICAL: Sovereign Anchor Phrase</p>
                        <p className="text-lg text-white font-mono lowercase bg-black/60 p-6 rounded-2xl leading-relaxed select-all border border-white/5">
                            {localStorage.getItem('gcn_sign_secret_key')?.substring(0, 48)}... [LOCKED_PROTO]
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
