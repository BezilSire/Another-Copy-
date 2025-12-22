
import React, { useState, useEffect } from 'react';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LockIcon } from './icons/LockIcon';
import { formatTimeAgo } from '../utils';
import { TreasuryVault } from '../types';

export const LedgerPage: React.FC<{ initialTarget?: { type: 'tx' | 'address', value: string } }> = ({ initialTarget }) => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [richList, setRichList] = useState<any[]>([]);
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const MAX_SUPPLY = 15000000;

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [txs, topHolders] = await Promise.all([
                    api.getPublicLedger(50),
                    api.getRichList(10)
                ]);
                setTransactions(txs);
                setRichList(topHolders);
                
                // Fetch vaults for proof of reserve
                api.listenToVaults(setVaults, console.error);
            } catch (error) {
                console.error("Failed to load ledger", error);
                setError("Network state temporarily unavailable. Please check your node connection.");
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const truncateKey = (key: string) => {
        if (!key) return 'GENESIS';
        if (key.length < 12) return key;
        return `${key.substring(0, 6)}...${key.substring(key.length - 6)}`;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-20 px-4">
            {/* Header Stats */}
            <div className="bg-slate-900/60 backdrop-blur-xl p-8 sm:p-12 rounded-[3rem] shadow-2xl border border-white/5 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-brand-gold/5 to-transparent pointer-events-none"></div>
                <div className="flex justify-center mb-8">
                    <div className="p-5 bg-brand-gold/10 rounded-[2rem] border border-brand-gold/20 shadow-glow-gold">
                        <GlobeIcon className="h-12 w-12 text-brand-gold animate-pulse" />
                    </div>
                </div>
                <h1 className="text-5xl font-black text-white tracking-tighter uppercase gold-text">Global Public Ledger</h1>
                <p className="text-gray-500 mt-3 uppercase tracking-[0.4em] text-[10px] font-black">Cryptographically Verifiable State</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
                    <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 group hover:border-brand-gold/30 transition-all">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-3">Hard Cap Supply</p>
                        <p className="text-3xl font-mono font-black text-white">{MAX_SUPPLY.toLocaleString()} <span className="text-xs text-brand-gold">UBT</span></p>
                    </div>
                    <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 group hover:border-green-500/30 transition-all">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-3">Verified Integrity</p>
                        <div className="flex justify-center items-center gap-2">
                             <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                             <p className="text-xl font-black text-green-400 uppercase tracking-tighter">Chain Valid</p> 
                        </div>
                    </div>
                    <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 group hover:border-blue-500/30 transition-all">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-3">Global Syncs</p>
                        <p className="text-3xl font-mono font-black text-white">{transactions.length} <span className="text-xs text-blue-400">TXS</span></p>
                    </div>
                </div>
            </div>

            {/* Proof of Reserves - Sovereign Vaults */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-4">
                    <LockIcon className="h-6 w-6 text-brand-gold" />
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Proof of Reserves: Sovereign Vaults</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {vaults.map(vault => (
                        <div key={vault.id} className="glass-card p-6 rounded-[2rem] border-white/5 hover:border-brand-gold/20 transition-all text-center space-y-3">
                             <p className="text-[9px] font-black text-brand-gold uppercase tracking-widest">{vault.name}</p>
                             <p className="text-2xl font-mono font-black text-white">{vault.balance.toLocaleString()}</p>
                             <div className="pt-2">
                                <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest">Anchor</p>
                                <p className="text-[8px] font-mono text-gray-700 truncate">{vault.publicKey}</p>
                             </div>
                        </div>
                    ))}
                    {vaults.length === 0 && !isLoading && (
                        <div className="col-span-full py-10 text-center glass-card rounded-[2rem] border-white/5">
                             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-700">Awaiting Vault Anchorage...</p>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-8 bg-red-950/20 border border-red-900/50 rounded-[2rem] text-center text-red-400 font-black uppercase tracking-widest text-xs">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Transactions Feed */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-4">
                        <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                            <DatabaseIcon className="h-6 w-6 text-brand-gold" />
                            Block Activity
                        </h2>
                        {isLoading && <LoaderIcon className="h-5 w-5 animate-spin text-brand-gold" />}
                    </div>
                    
                    <div className="space-y-3">
                        {transactions.map((tx, idx) => (
                            <div key={tx.id} className="glass-card p-6 rounded-[2rem] border-white/5 hover:border-brand-gold/20 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3">
                                     <div className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse"></div>
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-brand-gold bg-brand-gold/10 px-3 py-1 rounded-full uppercase tracking-widest">#{tx.id.substring(0, 8)}</span>
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{formatTimeAgo(tx.timestamp?.toDate ? tx.timestamp.toDate().toISOString() : new Date().toISOString())}</span>
                                            {tx.type === 'VAULT_SYNC' && <span className="text-[8px] font-black text-blue-400 border border-blue-900/50 px-2 py-0.5 rounded-full uppercase">Internal Sync</span>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-gray-600 uppercase font-black">Origin</p>
                                                <p className="text-blue-400 opacity-70 truncate max-w-[120px]">{truncateKey(tx.senderId)}</p>
                                            </div>
                                            <div className="text-gray-700">&rarr;</div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-gray-600 uppercase font-black">Target</p>
                                                <p className="text-blue-400 opacity-70 truncate max-w-[120px]">{truncateKey(tx.receiverId)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col justify-center">
                                        <p className="text-3xl font-black text-white font-mono tracking-tighter">{tx.amount.toFixed(2)}</p>
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Quantum ($UBT)</p>
                                    </div>
                                </div>
                                {/* Chain Integrity Visualization */}
                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                     <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-black text-gray-700 uppercase tracking-[0.2em]">Signature Root:</span>
                                        <span className="text-[8px] font-mono text-gray-600 truncate max-w-[150px]">{tx.signature?.substring(0, 32) || 'GENESIS_BLOCK_ROOT'}</span>
                                     </div>
                                     <ShieldCheckIcon className="h-3 w-3 text-green-900 opacity-50" />
                                </div>
                            </div>
                        ))}
                        {!isLoading && transactions.length === 0 && !error && (
                            <div className="text-center py-20 glass-card rounded-[2.5rem] border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-700">Awaiting Network Genesis...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Rich List / Top Nodes */}
                <div className="space-y-4">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter px-4">
                        <UserCircleIcon className="h-6 w-6 text-brand-gold" />
                        Network Elites
                    </h2>
                    <div className="space-y-3">
                        {richList.map((holder, index) => (
                            <div key={holder.id} className="glass-card p-5 rounded-3xl border-white/5 group hover:border-brand-gold/30 transition-all flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className={`font-black w-6 text-center text-sm ${index < 3 ? 'text-brand-gold' : 'text-gray-800'}`}>0{index + 1}</span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-white truncate tracking-tight uppercase">{holder.name}</p>
                                        <p className="text-[9px] text-gray-600 font-mono tracking-widest uppercase">ID: {truncateKey(holder.publicKey || holder.id)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-green-400 font-black text-sm">{(holder.ubtBalance || 0).toLocaleString()}</p>
                                    <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Liquid</p>
                                </div>
                            </div>
                        ))}
                        {!isLoading && richList.length === 0 && !error && (
                            <p className="text-center text-gray-700 py-10 text-[10px] font-black uppercase tracking-widest">Scanning network nodes...</p>
                        )}
                    </div>
                    
                    <div className="p-6 bg-brand-gold/5 rounded-[2rem] border border-brand-gold/10 mt-10">
                        <h4 className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] mb-4">Transparency Protocol</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed font-medium uppercase italic opacity-70">
                            The Ubuntium Public Ledger is an immutable record of all Quantum Syncs. Every entry is signed by the originating node's private key and verified by the network protocol. No central authority can alter this chain.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
