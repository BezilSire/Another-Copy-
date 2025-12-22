
import React, { useState } from 'react';
import { cryptoService } from '../services/cryptoService';
import { useToast } from '../contexts/ToastContext';
// FIX: Added missing useAuth import
import { useAuth } from '../contexts/AuthContext';
import { LockIcon } from './icons/LockIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadCloudIcon } from './icons/UploadCloudIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { FileTextIcon } from './icons/FileTextIcon';

export const IdentityVault: React.FC<{ onRestore: () => void }> = ({ onRestore }) => {
    // FIX: Retrieve currentUser from useAuth hook
    const { currentUser } = useAuth();
    const [password, setPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isMnemonicRevealed, setIsMnemonicRevealed] = useState(false);
    const { addToast } = useToast();

    const publicKey = cryptoService.getPublicKey() || "Generating...";

    const handleCopyKey = () => {
        navigator.clipboard.writeText(publicKey).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            addToast("Node Address Copied.", "info");
        });
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
            // FIX: currentUser is now defined via useAuth
            a.download = `ubuntium-identity-backup-${currentUser?.name || 'node'}.json`;
            a.click();
            addToast("Backup file exported successfully.", "success");
        } catch (e) {
            addToast("Invalid PIN. Export failed.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGenerateSovereign = async () => {
        if (password.length < 6) {
            addToast("PIN must be 6 digits.", "error");
            return;
        }
        setIsProcessing(true);
        try {
            const mnemonic = cryptoService.generateMnemonic();
            await cryptoService.saveVault({ mnemonic }, password);
            addToast("Sovereign Identity Created!", "success");
            setIsMnemonicRevealed(true);
        } catch (e) {
            addToast("Identity generation failed.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const hasVault = cryptoService.hasVault();

    return (
        <div className="space-y-8 animate-fade-in font-sans">
            {/* Address Card */}
            <div className="module-frame bg-slate-950 p-8 rounded-[2.5rem] border-white/5 shadow-premium">
                 <div className="corner-tl opacity-30"></div>
                 <div className="flex justify-between items-center mb-6">
                    <p className="label-caps !text-[9px] text-gray-500 !tracking-[0.4em]">Public Node Address</p>
                    <button onClick={handleCopyKey} className="p-2 bg-white/5 rounded-lg text-brand-gold hover:text-brand-gold-light transition-all">
                        {isCopied ? <ClipboardCheckIcon className="h-4 w-4 text-emerald-500" /> : <ClipboardIcon className="h-4 w-4" />}
                    </button>
                 </div>
                 <div className="bg-black p-6 rounded-2xl border border-white/5 shadow-inner">
                    <p className="data-mono text-[10px] text-emerald-500 break-all uppercase opacity-80">
                        {publicKey}
                    </p>
                 </div>
            </div>

            {!hasVault ? (
                <div className="module-frame bg-slate-900/40 p-10 rounded-[3rem] border-brand-gold/20 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-5 mb-8">
                        <div className="p-3 bg-brand-gold/10 rounded-2xl border border-brand-gold/20 text-brand-gold">
                            <ShieldCheckIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Initialize Vault</h3>
                            <p className="label-caps !text-[8px] text-gray-500">Secure your node locally</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <p className="text-[11px] text-gray-400 uppercase font-bold leading-relaxed">
                            Set a 6-digit PIN to encrypt your identity and enable one-tap login.
                        </p>
                        <input 
                            type="password" 
                            placeholder="SET 6-DIGIT PIN" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-2xl p-5 text-white text-center text-2xl font-black tracking-[0.5em]"
                        />
                        <button 
                            onClick={handleGenerateSovereign}
                            disabled={isProcessing || password.length < 6}
                            className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.3em] text-[10px] shadow-glow-gold active:scale-95"
                        >
                            {isProcessing ? <LoaderIcon className="h-5 w-5 animate-spin"/> : "Generate Identity"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="module-frame bg-slate-950 p-10 rounded-[3rem] border-emerald-500/20 shadow-glow-matrix space-y-8">
                    <div className="text-center space-y-4">
                        <div className="p-4 bg-emerald-500/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center border border-emerald-500/20">
                            <ShieldCheckIcon className="h-10 w-10 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Vault Operational</h3>
                    </div>

                    <div className="space-y-4">
                        <label className="label-caps !text-[9px] text-gray-500 block pl-2">Verify PIN to Export</label>
                         <input 
                            type="password" 
                            placeholder="ENTER PIN" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-black border border-white/5 rounded-xl p-4 text-white text-center font-mono tracking-[0.5em]"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <button onClick={handleExportJson} className="py-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2">
                            <DownloadIcon className="h-4 w-4" /> Export JSON Backup
                         </button>
                         <button onClick={() => setIsMnemonicRevealed(!isMnemonicRevealed)} className="py-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-brand-gold transition-all flex items-center justify-center gap-2">
                            <FileTextIcon className="h-4 w-4" /> Reveal Seed Phrase
                         </button>
                    </div>

                    {isMnemonicRevealed && password.length === 6 && (
                        <div className="p-6 bg-red-950/20 border border-red-500/20 rounded-2xl animate-fade-in">
                            <p className="text-[9px] text-red-500 font-black uppercase mb-4 tracking-widest">CRITICAL: Private Seed Phrase</p>
                            <p className="text-sm text-white font-mono lowercase bg-black/40 p-4 rounded-xl leading-relaxed select-all">
                                {localStorage.getItem('gcn_sign_secret_key')?.substring(0, 48)}...
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
