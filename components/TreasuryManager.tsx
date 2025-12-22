
import React, { useState, useEffect } from 'react';
import { Admin, TreasuryVault } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { LockIcon } from './icons/LockIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

export const TreasuryManager: React.FC<{ admin: Admin }> = ({ admin }) => {
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const { addToast } = useToast();

    // Sync Form
    const [syncData, setSyncData] = useState({ fromId: '', toId: '', amount: '', reason: '' });

    useEffect(() => {
        const unsub = api.listenToVaults(setVaults, console.error);
        setIsLoading(false);
        return () => unsub();
    }, []);

    const handleInitialize = async () => {
        if (!window.confirm("CRITICAL: This will mint the protocol hard cap of 15,000,000 $UBT to the Genesis Mother Node. This action is immutable. Proceed?")) return;
        setIsSyncing(true);
        try {
            await api.initializeTreasury(admin);
            addToast("Protocol hard cap minted and anchored successfully.", "success");
        } catch (e) {
            addToast("Initialization aborted.", "error");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSync = async (e: React.FormEvent) => {
        e.preventDefault();
        const from = vaults.find(v => v.id === syncData.fromId);
        const to = vaults.find(v => v.id === syncData.toId);
        const amt = parseFloat(syncData.amount);

        if (!from || !to || isNaN(amt) || amt <= 0) {
            addToast("Sync parameters invalid.", "error");
            return;
        }

        setIsSyncing(true);
        try {
            await api.syncInternalVaults(admin, from, to, amt, syncData.reason);
            addToast("Internal sync signed and ledgered.", "success");
            setSyncData({ fromId: '', toId: '', amount: '', reason: '' });
        } catch (e) {
            addToast(e instanceof Error ? e.message : "Sync failure.", "error");
        } finally {
            setIsSyncing(false);
        }
    };

    if (isLoading) return <div className="flex justify-center p-20"><LoaderIcon className="h-10 w-10 animate-spin text-brand-gold"/></div>;

    return (
        <div className="space-y-10 animate-fade-in">
            {vaults.length === 0 ? (
                <div className="glass-card p-12 rounded-[3.5rem] border-white/5 text-center space-y-8">
                    <div className="p-8 bg-brand-gold/10 rounded-full w-32 h-32 mx-auto flex items-center justify-center border border-brand-gold/20 shadow-glow-gold">
                         <LockIcon className="h-16 w-16 text-brand-gold" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Treasury Not Initialized</h2>
                        <p className="text-gray-500 mt-4 max-w-md mx-auto uppercase text-[10px] font-black leading-loose tracking-widest">
                            The protocol hard cap and compartmentalized vaults must be established before node activity can be verified.
                        </p>
                    </div>
                    <button 
                        onClick={handleInitialize}
                        disabled={isSyncing}
                        className="px-12 py-5 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-widest text-xs shadow-glow-gold active:scale-95 transition-all"
                    >
                        {isSyncing ? "Establishing Protocol..." : "Mint Genesis Supply (15M $UBT)"}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Vaults Grid */}
                    <div className="xl:col-span-2 space-y-6">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] pl-4">Compartmentalized Vaults</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {vaults.map(vault => (
                                <div key={vault.id} className={`p-8 rounded-[2.5rem] border border-white/5 bg-slate-950/60 relative overflow-hidden group hover:border-brand-gold/20 transition-all ${vault.type === 'GENESIS' ? 'md:col-span-2 ring-1 ring-brand-gold/20' : ''}`}>
                                    <div className="absolute top-0 right-0 p-4">
                                        <div className={`w-2 h-2 rounded-full ${vault.isLocked ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-green-500 animate-pulse'}`}></div>
                                    </div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest mb-1">{vault.name}</p>
                                            <p className="text-[8px] font-mono text-gray-600 uppercase truncate max-w-[150px]">{vault.publicKey}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-4xl font-black text-white font-mono tracking-tighter">{vault.balance.toLocaleString()}</p>
                                        <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">{vault.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Internal Sync Interface */}
                    <div className="space-y-6">
                         <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] pl-4">Internal Protocol Sync</h3>
                         <div className="glass-card p-8 rounded-[3rem] border-white/5 space-y-8 sticky top-24">
                            <form onSubmit={handleSync} className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest pl-1">Source Vault</label>
                                        <select 
                                            value={syncData.fromId}
                                            onChange={e => setSyncData({...syncData, fromId: e.target.value})}
                                            className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl text-white text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
                                        >
                                            <option value="">Select Origin...</option>
                                            {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest pl-1">Target Vault</label>
                                        <select 
                                            value={syncData.toId}
                                            onChange={e => setSyncData({...syncData, toId: e.target.value})}
                                            className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl text-white text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
                                        >
                                            <option value="">Select Target...</option>
                                            {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest pl-1">Sync Amount (UBT)</label>
                                        <input 
                                            type="number" 
                                            value={syncData.amount}
                                            onChange={e => setSyncData({...syncData, amount: e.target.value})}
                                            className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl text-white font-mono text-xl focus:outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest pl-1">Protocol Reason</label>
                                        <input 
                                            type="text" 
                                            value={syncData.reason}
                                            onChange={e => setSyncData({...syncData, reason: e.target.value})}
                                            className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl text-white text-[10px] uppercase font-bold focus:outline-none"
                                            placeholder="e.g. Funding Sustenance Cycle 04"
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isSyncing}
                                    className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-2"
                                >
                                    {isSyncing ? <LoaderIcon className="h-4 w-4 animate-spin"/> : <><ShieldCheckIcon className="h-4 w-4"/> Sign & Sync Vaults</>}
                                </button>
                            </form>
                            <p className="text-[9px] text-gray-600 leading-loose uppercase font-bold italic text-center">
                                All internal movements are signed by the authority node and immutable on the public ledger.
                            </p>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};
