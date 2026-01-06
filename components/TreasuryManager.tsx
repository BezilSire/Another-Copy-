
import React, { useState, useEffect } from 'react';
import { Admin, TreasuryVault, MultiSigProposal, GlobalEconomy } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { LockIcon } from './icons/LockIcon';
import { UnlockIcon } from './icons/UnlockIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { useAuth } from '../contexts/AuthContext';

export const TreasuryManager: React.FC<{ admin: Admin }> = ({ admin }) => {
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [msProposals, setMsProposals] = useState<MultiSigProposal[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const { addToast } = useToast();
    const { isSovereignLocked } = useAuth();

    const [syncData, setSyncData] = useState({ fromId: '', toId: '', amount: '', reason: '' });
    const [priceInput, setPriceInput] = useState('');

    useEffect(() => {
        let isMounted = true;
        
        // Safety Timeout to prevent infinite "Syncing" loop
        const safetyTimer = setTimeout(() => {
            if (isMounted && isLoading) {
                setIsLoading(false);
                addToast("Identity Sync Time-out: Please check node permissions.", "info");
            }
        }, 10000);

        const unsubVaults = api.listenToVaults(v => {
            if (isMounted) {
                setVaults(v);
                setIsLoading(false);
                clearTimeout(safetyTimer);
            }
        }, (error) => {
            console.error("Vault listener permission failure:", error);
            if (isMounted) {
                setIsLoading(false);
                clearTimeout(safetyTimer);
                addToast("Treasury Access Restricted: Authority Node requires re-verification.", "error");
            }
        });

        const unsubProposals = api.listenForMultiSigProposals(p => {
            if (isMounted) setMsProposals(p);
        });

        const unsubEcon = api.listenForGlobalEconomy(e => {
            if (isMounted) {
                setEconomy(e);
                if (e && !priceInput) setPriceInput(String(e.ubt_to_usd_rate));
            }
        });

        return () => { 
            isMounted = false;
            unsubVaults(); 
            unsubProposals(); 
            unsubEcon();
            clearTimeout(safetyTimer);
        };
    }, [addToast]);

    const handleInitialize = async () => {
        if (isSovereignLocked) {
            addToast("AUTHORIZATION_REQUIRED: Please unlock your node session in the HUD.", "error");
            return;
        }
        if (!window.confirm("CRITICAL PROTOCOL: Mint 15M hard cap?")) return;
        setIsSyncing(true);
        try {
            await api.initializeTreasury(admin);
            addToast("Genesis supply anchored.", "success");
        } catch (e: any) {
            addToast(e.message || "Initialization failed.", "error");
        } finally { setIsSyncing(false); }
    };

    const handleToggleLock = async (vault: TreasuryVault) => {
        if (isSovereignLocked) {
            addToast("AUTHORIZATION_REQUIRED: Please unlock your node session in the HUD.", "error");
            return;
        }

        const action = vault.isLocked ? "Unlock" : "Lock";
        if (!window.confirm(`AUTHORIZATION: ${action} the ${vault.name} node?`)) return;
        
        setIsSyncing(true);
        try {
            await api.toggleVaultLock(vault.id, !vault.isLocked);
            addToast(`${vault.name} is now ${vault.isLocked ? 'UNLOCKED' : 'LOCKED'}.`, "success");
        } catch (e) {
            addToast("Vault protocol error. Check permissions.", "error");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleQuickProvision = async () => {
        if (isSovereignLocked) {
            addToast("AUTHORIZATION_REQUIRED: Please unlock your node session in the HUD.", "error");
            return;
        }

        const genesis = vaults.find(v => v.id === 'GENESIS');
        const float = vaults.find(v => v.id === 'FLOAT');
        if (!genesis || !float) return;

        if (genesis.isLocked) {
            addToast("GENESIS_LOCKED: Unlock genesis node to provision liquidity.", "error");
            return;
        }

        const amt = 50000; 
        if (genesis.balance < amt) {
            addToast("Insufficient genesis balance.", "error");
            return;
        }

        setIsSyncing(true);
        try {
            await api.syncInternalVaults(admin, genesis, float, amt, "AUTOMATED_PROVISIONING");
            addToast("Liquidity Node Provisioned.", "success");
        } catch (e: any) {
            addToast(e.message, "error");
        } finally { setIsSyncing(false); }
    };

    const handleSetPrice = async () => {
        if (isSovereignLocked) {
            addToast("AUTHORIZATION_REQUIRED: Please unlock your node session in the HUD.", "error");
            return;
        }

        const newPrice = parseFloat(priceInput);
        if (isNaN(newPrice) || newPrice <= 0) return;
        setIsSyncing(true);
        try {
            await api.setGlobalEconomy(admin, { ubt_to_usd_rate: newPrice });
            addToast("Oracle Equilibrium Updated.", "success");
        } catch (e: any) {
            addToast("Sync Failure.", "error");
        } finally { setIsSyncing(false); }
    };

    const handleSync = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSovereignLocked) {
            addToast("AUTHORIZATION_REQUIRED: Please unlock your node session in the HUD.", "error");
            return;
        }

        const from = vaults.find(v => v.id === syncData.fromId);
        const to = vaults.find(v => v.id === syncData.toId);
        const amt = parseFloat(syncData.amount);

        if (!from || !to || isNaN(amt) || amt <= 0) {
            addToast("Invalid transfer parameters.", "error");
            return;
        }

        if (from.isLocked) {
            addToast("SOURCE_LOCKED: Unlock origin node to initiate sync.", "error");
            return;
        }

        setIsSyncing(true);
        try {
            if (amt >= 100000) {
                await api.proposeMultiSigSync(admin, from, to, amt, syncData.reason);
                addToast("High volume detected: Multi-Sig initiated.", "info");
            } else {
                await api.syncInternalVaults(admin, from, to, amt, syncData.reason);
                addToast("Atomic sync signed.", "success");
            }
            setSyncData({ fromId: '', toId: '', amount: '', reason: '' });
        } catch (e: any) {
            addToast(e.message || "Dispatch error.", "error");
        } finally { setIsSyncing(false); }
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-32 gap-6">
            <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold"/>
            <div className="text-center space-y-2">
                <p className="label-caps !text-[11px] animate-pulse">Syncing Treasury State...</p>
                <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Handshaking Global Ledger</p>
            </div>
        </div>
    );

    const genesisVault = vaults.find(v => v.type === 'GENESIS');
    const floatVault = vaults.find(v => v.type === 'FLOAT');

    return (
        <div className="space-y-12 animate-fade-in pb-20 font-sans relative">
            {isSovereignLocked && (
                <div className="absolute inset-0 z-[15] bg-black/40 backdrop-blur-[2px] rounded-[3rem] pointer-events-none"></div>
            )}
            
            {vaults.length === 0 ? (
                <div className="module-frame glass-module p-16 rounded-[4rem] border-white/5 text-center space-y-10 shadow-2xl">
                    <div className="p-10 bg-brand-gold/5 rounded-full w-40 h-40 mx-auto flex items-center justify-center border border-brand-gold/20">
                         <LockIcon className="h-20 w-20 text-brand-gold opacity-50" />
                    </div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter gold-text">Treasury Offline</h2>
                    <button onClick={handleInitialize} disabled={isSyncing} className="px-16 py-6 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-xs shadow-glow-gold active:scale-95 cursor-pointer">
                        {isSyncing ? "Initializing..." : "Initialize Genesis Node"}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                    <div className="xl:col-span-8 space-y-10">
                        {/* LIQUIDITY HUD */}
                        <div className="module-frame bg-slate-950 p-10 rounded-[3rem] border border-emerald-500/30 shadow-glow-matrix relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.05] to-transparent pointer-events-none"></div>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-2">
                                        <p className="label-caps !text-emerald-500">Liquidity Node (FLOAT)</p>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${floatVault?.isLocked ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'}`}>
                                            {floatVault?.isLocked ? 'LOCKED' : 'ACTIVE'}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-4">
                                        <h3 className="text-6xl font-black text-white font-mono tracking-tighter">{floatVault?.balance?.toLocaleString() || '0'}</h3>
                                        <span className="text-xl font-black text-emerald-500/50 uppercase tracking-widest">UBT</span>
                                    </div>
                                    <div className="mt-6 space-y-3">
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Reserve Depth</p>
                                        <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-white/5">
                                             <div className="h-full bg-emerald-500 shadow-glow-matrix transition-all duration-1000" style={{ width: `${Math.min(100, ((floatVault?.balance || 0) / 1000000) * 100)}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 w-full md:w-64">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleQuickProvision(); }}
                                        disabled={isSyncing || floatVault?.isLocked}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30 cursor-pointer"
                                    >
                                        {isSyncing ? <LoaderIcon className="h-4 w-4 animate-spin"/> : <><TrendingUpIcon className="h-4 w-4"/> Provision 50k UBT</>}
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); floatVault && handleToggleLock(floatVault); }}
                                        className={`w-full py-3 border rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${floatVault?.isLocked ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-500' : 'bg-red-600/10 border-red-500/50 text-red-500'}`}
                                    >
                                        {floatVault?.isLocked ? 'Unlock Node' : 'Lock Node'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* GENESIS HUB */}
                        {genesisVault && (
                             <div className="module-frame bg-slate-900/40 rounded-[2.5rem] p-10 border border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><DatabaseIcon className="h-20 w-20 text-white"/></div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <p className="label-caps !text-gray-500">Genesis Reserve</p>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${genesisVault.isLocked ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{genesisVault.isLocked ? 'LOCKED' : 'ACTIVE'}</span>
                                    </div>
                                    <p className="text-4xl font-black text-white font-mono tracking-tighter">{genesisVault.balance.toLocaleString()} <span className="text-lg text-gray-700">UBT</span></p>
                                    <div className="flex items-center gap-2 mt-4">
                                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">ID:</p>
                                        <p className="data-mono text-[9px] text-brand-gold opacity-60 uppercase">{genesisVault.publicKey.substring(0,32)}...</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleToggleLock(genesisVault); }}
                                    className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${genesisVault.isLocked ? 'bg-emerald-600 text-white shadow-glow-matrix' : 'bg-white/5 border border-red-500/30 text-red-500'}`}
                                >
                                    {genesisVault.isLocked ? 'Authorize (Unlock)' : 'Suspend (Lock)'}
                                </button>
                             </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {vaults.filter(v => !['GENESIS', 'FLOAT'].includes(v.id)).map(vault => (
                                <div key={vault.id} className="module-frame bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/5 hover:border-brand-gold/20 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <p className="text-[9px] font-black text-brand-gold uppercase tracking-widest">{vault.name}</p>
                                        <button onClick={(e) => { e.stopPropagation(); handleToggleLock(vault); }} className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${vault.isLocked ? 'border-red-500/30 text-red-500' : 'border-emerald-500/30 text-emerald-500'}`}>
                                            {vault.isLocked ? <UnlockIcon className="h-3 w-3"/> : <LockIcon className="h-3 w-3" />}
                                        </button>
                                    </div>
                                    <p className="text-3xl font-black text-white font-mono tracking-tighter">{vault.balance.toLocaleString()}</p>
                                    <p className="text-[8px] text-gray-600 uppercase font-black mt-4 tracking-widest">{vault.isLocked ? 'LOCKED_BY_ADMIN' : 'OPEN_PROTOCOL'}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="xl:col-span-4 space-y-8">
                         {/* MARKET ORACLE TERMINAL */}
                         <div className="module-frame glass-module p-8 rounded-[3rem] border-brand-gold/30 shadow-glow-gold space-y-8">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                                <div className="p-3 bg-brand-gold/10 rounded-2xl text-brand-gold"><TrendingUpIcon className="h-5 w-5" /></div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Market Oracle</h3>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="label-caps !text-[9px] text-gray-500">Exchange Rate (USD)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            step="0.000001"
                                            value={priceInput}
                                            onChange={e => setPriceInput(e.target.value)}
                                            className="w-full bg-black border border-white/10 p-6 rounded-2xl text-white font-mono text-4xl font-black focus:ring-1 focus:ring-brand-gold/40 outline-none transition-all"
                                        />
                                        <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none text-gray-700 font-black">/ UBT</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleSetPrice}
                                    disabled={isSyncing}
                                    className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all cursor-pointer"
                                >
                                    Update Equilibrium
                                </button>
                            </div>
                         </div>

                         {/* SYNC TERMINAL */}
                         <div className="module-frame glass-module p-8 rounded-[3rem] border-white/5 space-y-8 shadow-inner">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400"><DatabaseIcon className="h-5 w-5" /></div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Direct Sync</h3>
                            </div>
                            <form onSubmit={handleSync} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="label-caps !text-[9px] text-gray-600">Origin Node</label>
                                    <select value={syncData.fromId} onChange={e => setSyncData({...syncData, fromId: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-white text-xs font-bold uppercase tracking-widest outline-none">
                                        <option value="">Select Origin...</option>
                                        {vaults.map(v => <option key={v.id} value={v.id}>{v.name} {v.isLocked ? '🔒' : ''}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="label-caps !text-[9px] text-gray-600">Target Node</label>
                                    <select value={syncData.toId} onChange={e => setSyncData({...syncData, toId: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-white text-xs font-bold uppercase tracking-widest outline-none">
                                        <option value="">Select Target...</option>
                                        {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="label-caps !text-[9px] text-gray-600">Volume</label>
                                    <input type="number" value={syncData.amount} onChange={e => setSyncData({...syncData, amount: e.target.value})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-white font-mono text-3xl outline-none" placeholder="0.00" />
                                </div>
                                <button type="submit" disabled={isSyncing || !syncData.amount} className="w-full py-6 bg-white text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-xs shadow-xl active:scale-95 transition-all disabled:opacity-20 cursor-pointer">
                                    {isSyncing ? <LoaderIcon className="h-5 w-5 animate-spin mx-auto"/> : "Sign Dispatch"}
                                </button>
                            </form>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};
