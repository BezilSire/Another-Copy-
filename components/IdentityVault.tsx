
import React, { useState } from 'react';
import { cryptoService } from '../services/cryptoService';
import { useToast } from '../contexts/ToastContext';
import { LockIcon } from './icons/LockIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadCloudIcon } from './icons/UploadCloudIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { KeyIcon } from './icons/KeyIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';

export const IdentityVault: React.FC<{ onRestore: () => void }> = ({ onRestore }) => {
    const [password, setPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [vaultFile, setVaultFile] = useState<File | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const { addToast } = useToast();

    const publicKey = cryptoService.getPublicKey() || "Generating...";

    const handleCopyKey = () => {
        navigator.clipboard.writeText(publicKey).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            addToast("Public address copied.", "info");
        });
    };

    const handleExport = async () => {
        if (password.length < 8) {
            addToast("Vault password must be at least 8 characters.", "error");
            return;
        }
        setIsProcessing(true);
        try {
            const vaultData = await cryptoService.encryptVault(password);
            const blob = new Blob([vaultData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ubuntium_vault_${Date.now()}.json`;
            a.click();
            addToast("Vault anchored and exported successfully.", "success");
            setPassword('');
        } catch (e) {
            addToast("Vault creation failed.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImport = async () => {
        if (!vaultFile || !password) return;
        setIsProcessing(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const json = e.target?.result as string;
                    const secretKey = await cryptoService.decryptVault(json, password);
                    cryptoService.importSecretKey(secretKey);
                    addToast("Identity restored successfully.", "success");
                    onRestore();
                } catch (err) {
                    addToast("Invalid password or vault file.", "error");
                }
            };
            reader.readAsText(vaultFile);
        } catch (e) {
            addToast("Import failed.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Identity Info Panel */}
            <div className="glass-card p-6 rounded-[2rem] border-white/5 bg-slate-900/40">
                 <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Public Node Address</p>
                    <button onClick={handleCopyKey} className="text-brand-gold hover:text-brand-gold-light transition-colors">
                        {isCopied ? <ClipboardCheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                    </button>
                 </div>
                 <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                    <p className="text-xs font-mono text-green-400 break-all leading-relaxed opacity-70">
                        {publicKey}
                    </p>
                 </div>
            </div>

            <div className="glass-card p-6 rounded-[2rem] border-brand-gold/20">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-brand-gold/10 rounded-2xl border border-brand-gold/20 text-brand-gold">
                        <LockIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Anchor Identity</h3>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Protocol Recovery Layer</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-xs text-gray-400 leading-relaxed">
                        Encrypt your private node keys with a master password. This allows you to recover your $UBT holdings if you lose access to this device.
                    </p>
                    <input 
                        type="password" 
                        placeholder="Master Vault Password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-white placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
                    />
                    <button 
                        onClick={handleExport}
                        disabled={isProcessing || password.length < 8}
                        className="w-full py-4 bg-brand-gold text-slate-950 font-black rounded-xl uppercase tracking-widest text-[10px] shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-2"
                    >
                        {isProcessing ? <LoaderIcon className="h-4 w-4 animate-spin"/> : <><DownloadIcon className="h-4 w-4"/> Export Vault File</>}
                    </button>
                </div>
            </div>

            <div className="glass-card p-6 rounded-[2rem] border-blue-500/20">
                 <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400">
                        <KeyIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Restore Node</h3>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Existing Identity Import</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <input 
                        type="file" 
                        accept=".json"
                        onChange={e => setVaultFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20"
                    />
                    <button 
                        onClick={handleImport}
                        disabled={isProcessing || !vaultFile || !password}
                        className="w-full py-4 bg-slate-900 border border-blue-500/30 text-blue-400 font-black rounded-xl uppercase tracking-widest text-[10px] hover:bg-blue-500/5 active:scale-95 transition-all flex justify-center items-center gap-2"
                    >
                        {isProcessing ? <LoaderIcon className="h-4 w-4 animate-spin"/> : <><UploadCloudIcon className="h-4 w-4"/> Decrypt & Import Node</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
