
import React, { useState, useEffect } from 'react';
import { Admin, TreasuryVault } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { LockIcon } from './icons/LockIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';

export const TreasuryManager: React.FC<{ admin: Admin }> = ({ admin }) => {
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const { addToast } = useToast();

    // Sync Form
    const [syncData, setSyncData] = useState({ fromId: '', toId: '', amount: '', reason: '' });

    useEffect(() => {
        setIsLoading(true);
        const unsub = api.listenToVaults(
            (data) => {
                setVaults(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Vault listener error:", error);
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, []);

    const handleInitialize = async () => {
        if (!window.confirm("CRITICAL PROTOCOL: This will mint the protocol hard cap of 15,000,000 $UBT to the Genesis Mother Node. This action is immutable. Proceed?")) return;
        
        setIsSyncing(true);
        try {
            await api.initializeTreasury(admin);
            addToast("Protocol hard cap minted and anchored successfully.", "success");
        } catch (e) {
            console.error("Initialization Error:", e);
            const msg = e instanceof Error ? e.message : "Initialization aborted.";
            addToast(msg, "error");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleToggleLock = async (vaultId: string, currentLock: boolean) => {
        try {
            await api.toggleVaultLock(vaultId, !currentLock);
            addToast(`Vault ${!currentLock ? 'locked' : 'unlocked'} successfully.`, "info");
        } catch (e) {
            addToast("Lock protocol failed.", "error");
        }
    };

    const handleSync = async (e: React.FormEvent) => {
        e.preventDefault();
        const from = vaults.find(v => v.id === syncData.fromId);
        const to = vaults.find(v => v.id === syncData.toId);
        const amt = parseFloat(syncData.amount);

        if (!from || !to) {
            addToast("Select source and target nodes.", "error");
            return;
        }

        if (from.id === to.id) {
            addToast("Origin and target nodes cannot be identical.", "error");
            return;
        }

        if (from.isLocked) {
            addToast("Source vault is currently locked by the protocol.", "error");
            return;
        }

        if (isNaN(amt) || amt <= 0) {
            addToast("Enter a valid positive quantum amount.", "error");
            return;
        }

        setIsSyncing(true);
        try {
            await api.syncInternalVaults(admin, from, to, amt, syncData.reason || "Manual Node Sync");
            addToast("Internal sync signed and ledgered successfully.", "success");
            setSyncData({ fromId: '', toId: '', amount: '', reason: '' });
        } catch (e) {
            addToast(e instanceof Error ? e.message : "Sync failure.", "error");
        } finally {
            setIsSyncing(false);
        }
    };

    if (isLoading) return <div className="flex flex-col items-center justify-center p-32 gap-4"><LoaderIcon className="h-10 w-10 animate-spin text-brand-gold"/><p className="label-caps !text-[10px]">Syncing Treasury State...</p></div>;

    const genesisVault = vaults.find(v => v.type === 'GENESIS');
    const otherVaults = vaults.filter(v => v.type !== 'GENESIS');

    return (
        <div className="space-y-12 animate-fade-in pb-20">
            {vaults.length === 0 ? (
                <div className="module-frame glass-module p-16 rounded-[4rem] border-white/5 text-center space-y-10 shadow-2xl">
                    <div className="corner-tl"></div><div className="corner-tr"></div><div className="corner-bl"></div><div className="corner-br"></div>
                    <div className="p-10 bg-brand-gold/5 rounded-full w-40 h-40 mx-auto flex items-center justify-center border border-brand-gold/20 shadow-glow-gold">
                         <LockIcon className="h-20 w-20 text-brand-gold opacity-50" />
                    </div>
                    <div className="max-w-xl mx-auto">
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter gold-text">Treasury Not Initialized</h2>
                        <p className="text-gray-500 mt-6 uppercase text-[10px] font-black leading-loose tracking-[0.4em]">
                            The protocol hard cap and compartmentalized vaults must be established before node activity can be verified. This mints the total global supply of 15,000,000 $UBT.
                        </p>
                    </div>
                    <button 
                        onClick={handleInitialize}
                        disabled={isSyncing}
                        className="px-16 py-6 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-xs shadow-glow-gold active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto"
                    >
                        {isSyncing ? <LoaderIcon className="h-5 w-5 animate-spin" /> : "Deploy Genesis Supply (15M $UBT)"}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                    {/* Primary Vaults List */}
                    <div className="xl:col-span-8 space-y-10">
                        {/* Admin Master Wallet (Genesis) */}
                        {genesisVault && (
                             <div className="module-frame bg-slate-900/60 rounded-[3rem] p-10 border border-brand-gold/30 shadow-glow-gold relative overflow-hidden group">
                                <div className="corner-tl !border-brand-gold/50"></div><div className="corner-tr !border-brand-gold/50"></div>
                                <div className="absolute top-0 right-0 p-8">
                                     <button 
                                        onClick={() => handleToggleLock(genesisVault.id, genesisVault.isLocked)}
                                        className={`p-3 rounded-xl transition-all ${genesisVault.isLocked ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-green-500/10 text-green-500 border border-green-500/30'}`}
                                     >
                                         <LockIcon className="h-6 w-6" />
                                     </button>
                                </div>
                                <div className="space-y-2 mb-10">
                                    <p className="label-caps !text-brand-gold">Identity: Authority Master Node</p>
                                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{genesisVault.name}</h3>
                                    <p className="data-mono text-[9px] text-gray-600 truncate max-w-sm">{genesisVault.publicKey}</p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-baseline gap-4 sm:gap-8">
                                    <p className="text-7xl sm:text-8xl font-black text-white font-mono tracking-tighter leading-none">{genesisVault.balance.toLocaleString()}</p>
                                    <span className="text-3xl font-black text-gray-700 font-mono tracking-widest uppercase">$UBT</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-6 uppercase font-black tracking-widest flex items-center gap-2">
                                    <ShieldCheckIcon className="h-4 w-4 text-green-500" /> Primary protocol anchor & asset root
                                </p>
                             </div>
                        )}

                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] pl-4">Compartmentalized Reserves</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {otherVaults.map(vault => (
                                    <div key={vault.id} className="module-frame bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-all group shadow-xl">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest mb-1">{vault.name}</p>
                                                <p className="data-mono text-[8px] text-gray-700 uppercase truncate max-w-[150px]">{vault.publicKey}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleToggleLock(vault.id, vault.isLocked)}
                                                className={`p-2 rounded-lg transition-all ${vault.isLocked ? 'text-red-500 bg-red-500/5' : 'text-green-500 bg-green-500/5'}`}
                                            >
                                                <LockIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-4xl font-black text-white font-mono tracking-tighter">{vault.balance.toLocaleString()}</p>
                                            <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest">{vault.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sync and Control Terminal */}
                    <div className="xl:col-span-4 space-y-8">
                         <div className="module-frame glass-module p-8 rounded-[3rem] border border-white/5 space-y-10 sticky top-24 shadow-premium">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/30 text-blue-400">
                                    <DatabaseIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">Sync Terminal</h3>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Internal Quantum Dispatch</p>
                                </div>
                            </div>

                            <form onSubmit={handleSync} className="space-y-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Origin Node</label>
                                        <select 
                                            value={syncData.fromId}
                                            onChange={e => setSyncData({...syncData, fromId: e.target.value})}
                                            className="w-full bg-black border border-white/10 p-4 rounded-xl text-white text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-brand-gold/30 appearance-none shadow-inner"
                                        >
                                            <option value="">Select Origin Vault...</option>
                                            {vaults.map(v => <option key={v.id} value={v.id}>{v.name} ({v.balance.toLocaleString()}) {v.isLocked ? '[LOCKED]' : ''}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="flex justify-center -my-4">
                                         <div className="w-1 h-8 bg-gradient-to-b from-brand-gold/30 to-blue-500/30 rounded-full"></div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Target Node</label>
                                        <select 
                                            value={syncData.toId}
                                            onChange={e => setSyncData({...syncData, toId: e.target.value})}
                                            className="w-full bg-black border border-white/10 p-4 rounded-xl text-white text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-brand-gold/30 appearance-none shadow-inner"
                                        >
                                            <option value="">Select Target Node...</option>
                                            {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-2 pt-4">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Quantum Volume ($UBT)</label>
                                        <input 
                                            type="number" 
                                            value={syncData.amount}
                                            onChange={e => setSyncData({...syncData, amount: e.target.value})}
                                            className="w-full bg-black border border-white/10 p-6 rounded-[1.5rem] text-white font-mono text-3xl focus:outline-none focus:ring-1 focus:ring-brand-gold/30 shadow-inner placeholder-gray-900"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Protocol Justification</label>
                                        <input 
                                            type="text" 
                                            value={syncData.reason}
                                            onChange={e => setSyncData({...syncData, reason: e.target.value})}
                                            className="w-full bg-black border border-white/10 p-4 rounded-xl text-white text-[10px] uppercase font-black focus:outline-none focus:ring-1 focus:ring-brand-gold/30 placeholder-gray-800"
                                            placeholder="REASON FOR TRANSACTION..."
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isSyncing || !syncData.fromId || !syncData.toId || !syncData.amount}
                                    className="w-full py-6 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-xs shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-3 disabled:opacity-30 disabled:grayscale"
                                >
                                    {isSyncing ? <LoaderIcon className="h-5 w-5 animate-spin"/> : "Sign & Sync Protocol"}
                                </button>
                            </form>
                            
                            <div className="p-4 bg-blue-950/20 border border-blue-900/30 rounded-2xl flex items-start gap-4">
                                <UserCircleIcon className="h-6 w-6 text-blue-400 opacity-50 flex-shrink-0" />
                                <p className="text-[9px] text-blue-300 leading-loose uppercase font-bold italic">
                                    All internal vault movements are signed by your authority node and permanently etched onto the public ledger for citizen audit.
                                </p>
                            </div>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};
