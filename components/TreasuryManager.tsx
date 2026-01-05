
import React, { useState, useEffect } from 'react';
import { Admin, TreasuryVault, MultiSigProposal, GlobalEconomy } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { LockIcon } from './icons/LockIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

export const TreasuryManager: React.FC<{ admin: Admin }> = ({ admin }) => {
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [msProposals, setMsProposals] = useState<MultiSigProposal[]>([]);
    const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const { addToast } = useToast();

    const [syncData, setSyncData] = useState({ fromId: '', toId: '', amount: '', reason: '' });
    const [priceInput, setPriceInput] = useState('');

    useEffect(() => {
        setIsLoading(true);
        const unsubVaults = api.listenToVaults(v => {
            setVaults(v);
            setIsLoading(false); 
        }, () => setIsLoading(false));

        const unsubProposals = api.listenForMultiSigProposals(setMsProposals, () => {});
        const unsubEcon = api.listenForGlobalEconomy(e => {
            setEconomy(e);
            if (e && !priceInput) setPriceInput(String(e.ubt_to_usd_rate));
        });

        return () => { 
            unsubVaults(); 
            unsubProposals(); 
            unsubEcon();
        };
    }, []);

    const handleInitialize = async () => {
        if (!window.confirm("CRITICAL PROTOCOL: Mint 15M hard cap?")) return;
        setIsSyncing(true);
        try {
            await api.initializeTreasury(admin);
            addToast("Genesis supply anchored.", "success");
        } catch (e: any) {
            addToast(e.message || "Initialization failed.", "error");
        } finally { setIsSyncing(false); }
    };

    const handleQuickProvision = async () => {
        const genesis = vaults.find(v => v.id === 'GENESIS');
        const float = vaults.find(v => v.id === 'FLOAT');
        if (!genesis || !float) return;

        const amt = 50000; // Standard provisioning block
        if (genesis.balance < amt) {
            addToast("Insufficient genesis balance for provisioning.", "error");
            return;
        }

        setIsSyncing(true);
        try {
            await api.syncInternalVaults(admin, genesis, float, amt, "AUTOMATED_LIQUIDITY_PROVISIONING");
            addToast("Liquidity Node Provisioned.", "success");
        } catch (e: any) {
            addToast(e.message, "error");
        } finally { setIsSyncing(false); }
    };

    const handleSetPrice = async () => {
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
        const from = vaults.find(v => v.id === syncData.fromId);
        const to = vaults.find(v => v.id === syncData.toId);
        const amt = parseFloat(syncData.amount);

        if (!from || !to || isNaN(amt) || amt <= 0) {
            addToast("Invalid transfer parameters.", "error");
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
            <p className="label-caps !text-[10px] animate-pulse">Syncing Treasury State...</p>
        </div>
    );

    const genesisVault = vaults.find(v => v.type === 'GENESIS');
    const floatVault = vaults.find(v => v.type === 'FLOAT');

    return (
        <div className="space-y-12 animate-fade-in pb-20 font-sans">
            {vaults.length === 0 ? (
                <div className="module-frame glass-module p-16 rounded-[4rem] border-white/5 text-center space-y-10 shadow-2xl">
                    <div className="p-10 bg-brand-gold/5 rounded-full w-40 h-40 mx-auto flex items-center justify-center border border-brand-gold/20">
                         <LockIcon className="h-20 w-20 text-brand-gold opacity-50" />
                    </div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter gold-text">Treasury Offline</h2>
                    <button onClick={handleInitialize} disabled={isSyncing} className="px-16 py-6 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-xs shadow-glow-gold active:scale-95">
                        Initialize Genesis Node
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                    <div className="xl:col-span-8 space-y-10">
                        {/* LIQUIDITY HUD */}
                        <div className="module-frame bg-slate-950 p-10 rounded-[3rem] border border-emerald-500/30 shadow-glow-matrix relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.05] to-transparent pointer-events-none"></div>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
                                <div>
                                    <p className="label-caps !text-emerald-500 mb-2">Liquidity Node (FLOAT)</p>
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
                                <div className="flex flex-col gap-4 w-full md:w-64">
                                    <button 
                                        onClick={handleQuickProvision}
                                        disabled={isSyncing}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        {isSyncing ? <LoaderIcon className="h-4 w-4 animate-spin"/> : <><TrendingUpIcon className="h-4 w-4"/> Provision 50k UBT</>}
                                    </button>
                                    <p className="text-[8px] text-gray-600 text-center uppercase font-black tracking-widest leading-loose">Allocates genesis assets to the liquid exchange pool.</p>
                                </div>
                            </div>
                        </div>

                        {/* GENESIS HUB */}
                        {genesisVault && (
                             <div className="module-frame bg-slate-900/40 rounded-[2.5rem] p-10 border border-white/5 flex justify-between items-center group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><DatabaseIcon className="h-20 w-20 text-white"/></div>
                                <div>
                                    <p className="label-caps !text-gray-500 mb-2">Genesis Reserve</p>
                                    <p className="text-4xl font-black text-white font-mono tracking-tighter">{genesisVault.balance.toLocaleString()} <span className="text-lg text-gray-700">UBT</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Anchor Identity</p>
                                    <p className="data-mono text-[9px] text-brand-gold opacity-60 mt-1">{genesisVault.publicKey.substring(0,24)}...</p>
                                </div>
                             </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {vaults.filter(v => !['GENESIS', 'FLOAT'].includes(v.id)).map(vault => (
                                <div key={vault.id} className="module-frame bg-slate-950/60 p-8 rounded-[2rem] border border-white/5 hover:border-brand-gold/20 transition-all">
                                    <p className="text-[9px] font-black text-brand-gold uppercase tracking-widest mb-2">{vault.name}</p>
                                    <p className="text-3xl font-black text-white font-mono tracking-tighter">{vault.balance.toLocaleString()}</p>
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
                                    <label className="label-caps !text-[9px] text-gray-500">Target Exchange Rate (USD)</label>
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
                                    className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all"
                                >
                                    Update Equilibrium
                                </button>
                                <p className="text-[7px] text-gray-600 text-center uppercase font-black leading-relaxed tracking-widest px-4">This value drives the Pulse Hub ingress/egress engine and community valuation.</p>
                            </div>
                         </div>

                         {/* SYNC TERMINAL */}
                         <div className="module-frame glass-module p-8 rounded-[3rem] border-white/5 space-y-8 shadow-inner">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400"><DatabaseIcon className="h-5 w-5" /></div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Dispatch Terminal</h3>
                            </div>
                            <form onSubmit={handleSync} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="label-caps !text-[9px] text-gray-600">Origin Node</label>
                                    <select value={syncData.fromId} onChange={e => setSyncData({...syncData, fromId: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-white text-xs font-bold uppercase tracking-widest outline-none">
                                        <option value="">Select Origin...</option>
                                        {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
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
                                <button type="submit" disabled={isSyncing || !syncData.amount} className="w-full py-6 bg-white text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-xs shadow-xl active:scale-95 transition-all disabled:opacity-20">
                                    {isSyncing ? <LoaderIcon className="h-5 w-5 animate-spin mx-auto"/> : "Sign Block Dispatch"}
                                </button>
                            </form>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};
