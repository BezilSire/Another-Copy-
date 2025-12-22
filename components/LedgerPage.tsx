import React, { useState, useEffect } from 'react';
// FIX: Imported Timestamp from firebase/firestore to fix "Cannot find name 'Timestamp'" error on line 185
import { Timestamp } from 'firebase/firestore';
import { api } from '../services/apiService';
import { LoaderIcon } from './icons/LoaderIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LockIcon } from './icons/LockIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { formatTimeAgo } from '../utils';
import { TreasuryVault } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const LedgerPage: React.FC<{ initialTarget?: { type: 'tx' | 'address', value: string } }> = ({ initialTarget }) => {
    const { currentUser } = useAuth();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [richList, setRichList] = useState<any[]>([]);
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

    const MAX_SUPPLY = 15000000;

    useEffect(() => {
        if (!currentUser) return;

        let isMounted = true;
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [txs, topHolders] = await Promise.all([
                    api.getPublicLedger(100),
                    api.getRichList(15)
                ]);
                
                if (!isMounted) return;
                setTransactions(txs);
                setRichList(topHolders);
            } catch (err) {
                console.error("Ledger data fetch failed:", err);
                if (isMounted) setError("Protocol state temporarily unavailable. Syncing node...");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadData();
        
        const unsubVaults = api.listenToVaults(
            (vts) => { if (isMounted) setVaults(vts); },
            (err) => { console.error("Vault listener error:", err); }
        );

        return () => { 
            isMounted = false; 
            unsubVaults();
        };
    }, [currentUser]);

    const truncateKey = (key: string) => {
        if (!key || key.length < 12) return key || 'SYSTEM';
        return `${key.substring(0, 8)}...${key.substring(key.length - 8)}`;
    };

    const AddressLabel: React.FC<{ value: string }> = ({ value }) => (
        <span className="bg-blue-700/90 px-3 py-1.5 rounded-md text-white font-mono text-[9px] font-black tracking-widest uppercase shadow-lg border border-blue-500/30">
            {truncateKey(value)}
        </span>
    );

    return (
        <div className="w-full max-w-none space-y-0 animate-fade-in pb-32 font-sans bg-black min-h-screen">
            {/* Sovereign Explorer Browser Header */}
            <div className="sticky top-20 z-40 bg-slate-950 border-b border-white/10 px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
                 <div className="flex items-center gap-6">
                    <div className="flex gap-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500/40 border border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.2)]"></div>
                        <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/40 border border-yellow-500/60"></div>
                        <div className="w-3.5 h-3.5 rounded-full bg-green-500/40 border border-green-500/60"></div>
                    </div>
                    <div className="h-8 w-px bg-white/10 mx-2"></div>
                    <div className="flex items-center gap-3 bg-black/60 px-6 py-3 rounded-2xl border border-white/5 min-w-[350px] shadow-inner">
                        <GlobeIcon className="h-4 w-4 text-gray-600" />
                        <span className="text-[10px] font-black font-mono text-gray-500 tracking-[0.3em] uppercase">protocol://mainnet.ledger.ubuntium</span>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-12">
                     <div className="text-right">
                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.5em] leading-none mb-2">Hard Cap Supply</p>
                        <p className="text-lg font-black text-brand-gold font-mono tracking-tighter">{MAX_SUPPLY.toLocaleString()} UBT</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.5em] leading-none mb-2">Protocol Health</p>
                        <div className="flex items-center gap-2 justify-end">
                            <span className="text-sm font-black text-emerald-400 font-mono tracking-tighter">100% SYNC</span>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        </div>
                     </div>
                 </div>
            </div>

            {/* Explorer Content */}
            <div className="p-8 md:p-16 max-w-[1920px] mx-auto">
                {error && (
                    <div className="mb-12 p-8 bg-red-950/20 border border-red-500/20 rounded-[2.5rem] text-center">
                        <p className="text-red-400 font-black uppercase tracking-widest text-sm">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-16">
                    
                    {/* Event Stream (Source of Truth) */}
                    <div className="xl:col-span-8 space-y-12">
                        <div className="flex items-center justify-between border-b border-white/5 pb-8">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-brand-gold/10 rounded-2xl border border-brand-gold/20 shadow-glow-gold">
                                    <DatabaseIcon className="h-8 w-8 text-brand-gold" />
                                </div>
                                <div>
                                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Persistent Ledger</h2>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mt-2">Verified Mainnet Handshakes</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {isLoading ? (
                                Array.from({length: 5}).map((_, i) => (
                                    <div key={i} className="h-32 bg-white/5 rounded-[2.5rem] animate-pulse"></div>
                                ))
                            ) : transactions.map((tx) => (
                                <div key={tx.id} className="module-frame bg-slate-900/30 p-8 sm:p-10 rounded-[3rem] border-white/5 hover:border-brand-gold/20 transition-all group flex flex-col items-stretch gap-10">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                                        <div className="space-y-8 flex-1 w-full">
                                            <div className="flex items-center gap-4">
                                                <span className="bg-brand-gold/10 border border-brand-gold/20 px-3 py-1 rounded text-[8px] font-black text-brand-gold uppercase tracking-widest font-mono shadow-sm">BLOCK: {tx.id.substring(0, 12)}</span>
                                                <span className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">{formatTimeAgo(tx.timestamp?.toDate ? tx.timestamp.toDate().toISOString() : new Date().toISOString())}</span>
                                            </div>
                                            
                                            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-14">
                                                <div className="flex flex-col items-center sm:items-start gap-3">
                                                    <p className="text-[7px] font-black text-gray-600 uppercase tracking-[0.5em]">Genesis Origin</p>
                                                    <AddressLabel value={tx.senderId} />
                                                </div>
                                                <div className="text-gray-800 rotate-90 sm:rotate-0">
                                                    <DatabaseIcon className="h-6 w-6 opacity-40 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <div className="flex flex-col items-center sm:items-start gap-3">
                                                    <p className="text-[7px] font-black text-gray-600 uppercase tracking-[0.5em]">Target Authority</p>
                                                    <AddressLabel value={tx.receiverId} />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="text-right w-full md:w-auto md:border-l md:border-white/5 md:pl-12 flex flex-col items-end">
                                            <div className="flex items-center gap-3">
                                                 <p className="text-5xl font-black text-white font-mono tracking-tighter leading-none">{tx.amount.toFixed(2)}</p>
                                                 <span className="text-xl text-gray-700 font-black font-mono">UBT</span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-5">
                                                <button 
                                                    onClick={() => setExpandedBlock(expandedBlock === tx.id ? null : tx.id)}
                                                    className="flex items-center gap-2 text-[8px] font-black text-brand-gold uppercase tracking-widest hover:text-white transition-colors"
                                                >
                                                    <FileTextIcon className="h-3 w-3" />
                                                    {expandedBlock === tx.id ? 'Hide Audit' : 'Audit Block Data'}
                                                </button>
                                                <div className="flex items-center gap-2 bg-emerald-500/5 px-3 py-1.5 rounded-xl border border-emerald-500/10">
                                                    <ShieldCheckIcon className="h-3 w-3 text-emerald-500" />
                                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em]">Verified</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RAW JSON FILE SYSTEM VIEW */}
                                    {expandedBlock === tx.id && (
                                        <div className="mt-8 p-8 bg-black rounded-[2rem] border border-white/10 animate-fade-in font-mono text-[10px] overflow-x-auto shadow-inner relative">
                                            <div className="absolute top-4 right-6 text-[8px] text-gray-700 uppercase font-black tracking-widest">Protocol Mirror System v2.0</div>
                                            <pre className="text-emerald-500/80 leading-relaxed">
                                                {JSON.stringify(tx, (key, value) => 
                                                    value instanceof Timestamp ? value.toDate().toISOString() : value, 2
                                                )}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rich List and Reserves */}
                    <div className="xl:col-span-4 space-y-16">
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                                <LockIcon className="h-5 w-5 text-gray-600" />
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em]">Protocol Reserves</h3>
                            </div>
                            <div className="space-y-4">
                                {vaults.map(vault => (
                                    <div key={vault.id} className="glass-card p-8 rounded-[2.5rem] border-white/5 bg-slate-950/40 flex justify-between items-center hover:bg-slate-900/60 transition-all group">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{vault.name}</p>
                                            <p className="font-mono text-[8px] text-gray-700 uppercase truncate max-w-[150px]">{vault.publicKey}</p>
                                        </div>
                                        <p className="text-2xl font-black text-white font-mono tracking-tighter">{vault.balance.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                                <UserCircleIcon className="h-5 w-5 text-gray-600" />
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em]">Wealth Anchors</h3>
                            </div>
                            <div className="space-y-4">
                                {richList.map((holder, idx) => (
                                    <div key={holder.id} className="bg-slate-950/60 p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between hover:border-brand-gold/30 hover:bg-black transition-all group">
                                        <div className="flex items-center gap-6">
                                            <span className="text-[10px] font-black text-gray-800 font-mono group-hover:text-brand-gold/40 transition-colors">#{idx+1}</span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-white uppercase tracking-tight truncate leading-tight">{holder.name}</p>
                                                <p className="font-mono text-[8px] text-gray-700 mt-2 uppercase truncate max-w-[120px]">{truncateKey(holder.publicKey || '')}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono text-emerald-400 font-black text-lg leading-none">{holder.ubtBalance.toLocaleString()}</p>
                                            <p className="text-[7px] font-black text-gray-700 uppercase tracking-widest mt-2">Assets_Mirror</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
