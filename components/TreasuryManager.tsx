import React, { useState, useEffect } from 'react';
import { Admin, TreasuryVault, MultiSigProposal } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { LockIcon } from './icons/LockIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

export const TreasuryManager: React.FC<{ admin: Admin }> = ({ admin }) => {
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [msProposals, setMsProposals] = useState<MultiSigProposal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const { addToast } = useToast();

    const [syncData, setSyncData] = useState({ fromId: '', toId: '', amount: '', reason: '' });

    useEffect(() => {
        setIsLoading(true);
        const unsubVaults = api.listenToVaults(v => setVaults(v), console.error);
        const unsubProposals = api.listenForMultiSigProposals(p => {
            setMsProposals(p);
            setIsLoading(false);
        });
        return () => { unsubVaults(); unsubProposals(); };
    }, []);

    const handleInitialize = async () => {
        if (!window.confirm("CRITICAL PROTOCOL: Mint 15M hard cap?")) return;
        setIsSyncing(true);
        try {
            await api.initializeTreasury(admin);
            addToast("Genesis supply anchored.", "success");
        } catch (e: any) {
            addToast(e.message, "error");
        } finally { setIsSyncing(false); }
    };

    const handleSync = async (e: React.FormEvent) => {
        e.preventDefault();
        const from = vaults.find(v => v.id === syncData.fromId);
        const to = vaults.find(v => v.id === syncData.toId);
        const amt = parseFloat(syncData.amount);

        if (!from || !to || isNaN(amt) || amt <= 0) return;

        setIsSyncing(true);
        try {
            if (amt >= 50000) {
                await api.proposeMultiSigSync(admin, from, to, amt, syncData.reason);
                addToast("HIGH_VOLUME_ALERT: Multi-Sig proposal created.", "info");
            } else {
                await api.syncInternalVaults(admin, from, to, amt, syncData.reason);
                addToast("Atomic sync signed.", "success");
            }
            setSyncData({ fromId: '', toId: '', amount: '', reason: '' });
        } catch (e: any) {
            addToast(e.message, "error");
        } finally { setIsSyncing(false); }
    };

    const handleSignProposal = async (id: string) => {
        try {
            await api.signMultiSigProposal(admin.id, id);
            addToast("Multi-Sig signature ledgered.", "success");
        } catch (e: any) { addToast(e.message, "error"); }
    };

    if (isLoading) return <div className="flex flex-col items-center justify-center p-32 gap-4"><LoaderIcon className="h-10 w-10 animate-spin text-brand-gold"/><p className="label-caps !text-[10px]">Syncing Treasury State...</p></div>;

    const genesisVault = vaults.find(v => v.type === 'GENESIS');
    const otherVaults = vaults.filter(v => v.type !== 'GENESIS');

    return (
        <div className="space-y-12 animate-fade-in pb-20">
            {vaults.length === 0 ? (
                <div className="module-frame glass-module p-16 rounded-[4rem] border-white/5 text-center space-y-10 shadow-2xl">
                    <div className="p-10 bg-brand-gold/5 rounded-full w-40 h-40 mx-auto flex items-center justify-center border border-brand-gold/20">
                         <LockIcon className="h-20 w-20 text-brand-gold opacity-50" />
                    </div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter gold-text">Treasury Offline</h2>
                    <button onClick={handleInitialize} disabled={isSyncing} className="px-16 py-6 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-xs">Deploy Genesis Node</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                    <div className="xl:col-span-8 space-y-10">
                        {genesisVault && (
                             <div className="module-frame bg-slate-900/60 rounded-[3rem] p-10 border border-brand-gold/30 shadow-glow-gold relative overflow-hidden group">
                                <p className="label-caps !text-brand-gold mb-2">Authority Master Node</p>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{genesisVault.name}</h3>
                                <div className="flex items-baseline gap-4 mt-6">
                                    <p className="text-7xl font-black text-white font-mono tracking-tighter">{genesisVault.balance.toLocaleString()}</p>
                                    <span className="text-3xl font-black text-gray-700 font-mono tracking-widest uppercase">UBT</span>
                                </div>
                             </div>
                        )}

                        {msProposals.length > 0 && (
                            <div className="space-y-6">
                                <h3 className="label-caps !text-red-500 !tracking-[0.5em] pl-4">Multi-Sig Consensus Queue</h3>
                                {msProposals.map(p => (
                                    <div key={p.id} className="module-frame bg-red-950/10 border-2 border-red-500/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-8 shadow-xl">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-red-500 rounded-lg text-white"><DatabaseIcon className="h-5 w-5"/></div>
                                                <p className="text-xl font-black text-white uppercase tracking-tighter">{p.amount.toLocaleString()} UBT Transfer</p>
                                            </div>
                                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{p.fromVaultId} &rarr; {p.toVaultId} &bull; Proposer: {p.proposerName}</p>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-center">
                                                <p className="text-xl font-black text-white font-mono">{p.signatures.length}/2</p>
                                                <p className="text-[8px] text-gray-600 font-black uppercase">Sigs</p>
                                            </div>
                                            {!p.signatures.includes(admin.id) && (
                                                <button onClick={() => handleSignProposal(p.id)} className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-glow-matrix transition-all active:scale-95">Sign Handshake</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {otherVaults.map(vault => (
                                <div key={vault.id} className="module-frame bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/5 shadow-xl">
                                    <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest mb-2">{vault.name}</p>
                                    <p className="text-4xl font-black text-white font-mono tracking-tighter">{vault.balance.toLocaleString()}</p>
                                    <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest mt-4 leading-loose">{vault.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="xl:col-span-4">
                         <div className="module-frame glass-module p-8 rounded-[3rem] border-white/5 space-y-10 sticky top-24 shadow-premium">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400"><DatabaseIcon className="h-5 w-5" /></div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Sync Terminal</h3>
                            </div>

                            <form onSubmit={handleSync} className="space-y-6">
                                <select value={syncData.fromId} onChange={e => setSyncData({...syncData, fromId: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-white text-xs font-bold uppercase tracking-widest outline-none">
                                    <option value="">Select Origin Vault...</option>
                                    {vaults.map(v => <option key={v.id} value={v.id}>{v.name} ({v.balance.toLocaleString()})</option>)}
                                </select>
                                <select value={syncData.toId} onChange={e => setSyncData({...syncData, toId: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-white text-xs font-bold uppercase tracking-widest outline-none">
                                    <option value="">Select Target Vault...</option>
                                    {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                                <input type="number" value={syncData.amount} onChange={e => setSyncData({...syncData, amount: e.target.value})} className="w-full bg-black border border-white/10 p-6 rounded-[1.5rem] text-white font-mono text-3xl outline-none" placeholder="0.00" />
                                <input type="text" value={syncData.reason} onChange={e => setSyncData({...syncData, reason: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-white text-[10px] uppercase font-black" placeholder="PROTOCOL JUSTIFICATION..." />

                                <button type="submit" disabled={isSyncing} className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-xs shadow-glow-gold active:scale-95 transition-all">
                                    {isSyncing ? <LoaderIcon className="h-5 w-5 animate-spin"/> : "Dispatch signed block"}
                                </button>
                            </form>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};