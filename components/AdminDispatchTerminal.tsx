import React, { useState, useEffect } from 'react';
import { Admin, PublicUserProfile, UbtTransaction, TreasuryVault } from '../types';
import { api } from '../services/apiService';
import { cryptoService } from '../services/cryptoService';
import { useToast } from '../contexts/ToastContext';
import { SearchIcon } from './icons/SearchIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { UBTScan } from './UBTScan';
import { useDebounce } from '../hooks/useDebounce';
import { KeyIcon } from './icons/KeyIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { LockIcon } from './icons/LockIcon';

type DispatchMode = 'registry' | 'anchor';

export const AdminDispatchTerminal: React.FC<{ admin: Admin }> = ({ admin }) => {
    const [mode, setMode] = useState<DispatchMode>('anchor');
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [selectedVaultId, setSelectedVaultId] = useState('');
    
    // Search Mode State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PublicUserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<PublicUserProfile | null>(null);
    
    // Direct Anchor Mode State
    const [targetAddress, setTargetAddress] = useState('');
    const [isResolving, setIsResolving] = useState(false);
    
    const [amount, setAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    
    const debouncedSearch = useDebounce(searchQuery, 300);
    const debouncedAddress = useDebounce(targetAddress, 500);
    const { addToast } = useToast();

    useEffect(() => {
        api.listenToVaults(setVaults, console.error);
    }, []);

    const selectedVault = vaults.find(v => v.id === selectedVaultId);
    const isVaultLocked = selectedVault?.isLocked || false;

    // Resolve address to user if possible (for the Mirror UI)
    useEffect(() => {
        if (mode === 'anchor' && debouncedAddress.length > 20) {
            setIsResolving(true);
            api.getUserByPublicKey(debouncedAddress).then(user => {
                if (user) setSelectedUser(user as PublicUserProfile);
                else setSelectedUser(null);
            }).finally(() => setIsResolving(false));
        }
    }, [debouncedAddress, mode]);

    useEffect(() => {
        if (mode === 'registry' && debouncedSearch.length > 1 && !selectedUser) {
            api.searchUsers(debouncedSearch, admin).then(setSearchResults);
        } else {
            setSearchResults([]);
        }
    }, [debouncedSearch, admin, selectedUser, mode]);

    const addLog = (msg: string) => setLogs(p => [...p, `> ${msg}`]);

    const handleDispatch = async () => {
        if (isVaultLocked) {
            addToast("Authorization Denied: Origin vault is locked.", "error");
            return;
        }

        const targetId = selectedUser?.id || null;
        if (!selectedVaultId || !amount || (mode === 'anchor' && !targetAddress)) return;
        
        const finalTargetKey = mode === 'anchor' ? targetAddress : selectedUser?.publicKey;

        if (!finalTargetKey) {
            addToast("Target Anchor invalid or missing.", "error");
            return;
        }

        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) return;

        setIsProcessing(true);
        setLogs(["> INITIALIZING SIGNED HANDSHAKE..."]);
        
        try {
            const timestamp = Date.now();
            const nonce = cryptoService.generateNonce();
            
            setTimeout(() => addLog("ACCESSING AUTHORITY MASTER KEY..."), 300);
            setTimeout(() => addLog(`RESOLVING ANCHOR: [${finalTargetKey.substring(0,12)}...]`), 600);
            setTimeout(() => addLog("GENERATING ED25519 SIGNATURE..."), 900);
            setTimeout(() => addLog("ETCHING BLOCK TO GLOBAL MAINNET LEDGER..."), 1200);

            const payloadToSign = `${selectedVaultId}:${finalTargetKey}:${amt}:${timestamp}:${nonce}`;
            const signature = cryptoService.signTransaction(payloadToSign);
            const txId = `auth-dispatch-${Date.now().toString(36)}`;
            
            const transaction: UbtTransaction = {
                id: txId,
                senderId: selectedVaultId,
                receiverId: targetId || 'EXTERNAL_NODE',
                amount: amt,
                timestamp: timestamp,
                nonce: nonce,
                signature: signature,
                hash: payloadToSign,
                senderPublicKey: cryptoService.getPublicKey() || "",
                parentHash: 'TREASURY_ROOT',
                protocol_mode: 'MAINNET'
            };

            await api.processAdminHandshake(selectedVaultId, transaction.receiverId, amt, transaction);
            
            setTimeout(() => {
                addLog("STATE SYNC COMPLETE. DISPATCH BROADCAST.");
                addToast("Authority Dispatch Successful.", "success");
                setAmount('');
                setSelectedUser(null);
                setTargetAddress('');
                setLogs([]);
                setIsProcessing(false);
            }, 1800);

        } catch (e) {
            const msg = e instanceof Error ? e.message : "Handshake Fault.";
            addLog(`!! CRITICAL: ${msg.toUpperCase()}`);
            addToast(msg, "error");
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-20">
            {isScanning && <UBTScan currentUser={admin} onClose={() => setIsScanning(false)} onTransactionComplete={() => {}} />}

            <div className="module-frame bg-slate-950 p-10 rounded-[3.5rem] border-brand-gold/30 shadow-[0_0_80px_-20px_rgba(212,175,55,0.15)] relative overflow-hidden">
                <div className="corner-tl !border-brand-gold/60"></div><div className="corner-tr !border-brand-gold/60"></div><div className="corner-bl !border-brand-gold/60"></div><div className="corner-br !border-brand-gold/60"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-white/5 pb-8">
                    <div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter gold-text leading-none">Authority Dispatch</h2>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] mt-3">Quantum Distribution Terminal v2.5</p>
                    </div>
                    
                    <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/5">
                        <button 
                            onClick={() => {setMode('anchor'); setSelectedUser(null);}} 
                            className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'anchor' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Direct Anchor
                        </button>
                        <button 
                            onClick={() => {setMode('registry'); setSelectedUser(null);}} 
                            className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'registry' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Node Registry
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Input Column */}
                    <div className="lg:col-span-7 space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1 flex items-center gap-2">
                                <DatabaseIcon className="h-3 w-3 text-brand-gold" /> Source Reserve Node
                            </label>
                            <select 
                                value={selectedVaultId}
                                onChange={e => setSelectedVaultId(e.target.value)}
                                className={`w-full bg-slate-900/60 border p-5 rounded-2xl text-white text-xs font-black uppercase tracking-widest focus:outline-none appearance-none shadow-inner transition-all ${isVaultLocked ? 'border-red-500/40 text-red-200' : 'border-white/10'}`}
                            >
                                <option value="">Select Origin...</option>
                                {vaults.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.name} {v.isLocked ? '[LOCKED]' : ''} &mdash; {v.balance.toLocaleString()} UBT
                                    </option>
                                ))}
                            </select>
                            {isVaultLocked && (
                                <div className="flex items-center gap-3 px-4 py-3 bg-red-500/5 rounded-xl border border-red-500/10 animate-pulse">
                                    <LockIcon className="h-4 w-4 text-red-500" />
                                    <span className="text-[9px] font-black text-red-400 uppercase tracking-widest leading-relaxed">
                                        Selected node is locked. Enable access in the <strong className="text-white">Treasury Manager</strong> to continue.
                                    </span>
                                </div>
                            )}
                        </div>

                        {mode === 'anchor' ? (
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1 flex items-center gap-2">
                                    <KeyIcon className="h-3 w-3 text-brand-gold" /> Target Public Anchor
                                </label>
                                <div className="relative group">
                                    <input 
                                        type="text"
                                        value={targetAddress}
                                        onChange={e => setTargetAddress(e.target.value)}
                                        className="w-full bg-slate-900/60 border border-white/10 p-5 rounded-2xl text-white text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-brand-gold/40 transition-all placeholder-gray-800 uppercase"
                                        placeholder="PASTE ED25519 PUBLIC KEY..."
                                    />
                                    {isResolving && <LoaderIcon className="h-4 w-4 text-brand-gold animate-spin absolute right-5 top-1/2 -translate-y-1/2" />}
                                </div>
                                {selectedUser && (
                                    <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10 animate-fade-in">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Resolved Identity: {selectedUser.name}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1 flex items-center gap-2">
                                    <UserCircleIcon className="h-3 w-3 text-brand-gold" /> Registry Lookup
                                </label>
                                {!selectedUser ? (
                                    <div className="relative group">
                                        <input 
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full bg-slate-900/60 border border-white/10 p-5 pl-14 rounded-2xl text-white text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-brand-gold/40"
                                            placeholder="NODE NAME..."
                                        />
                                        <SearchIcon className="h-5 w-5 text-gray-700 absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-brand-gold transition-colors" />
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-black border border-white/10 rounded-2xl z-50 shadow-2xl no-scrollbar">
                                                {searchResults.map(u => (
                                                    <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full text-left p-5 hover:bg-white/5 flex items-center gap-4 border-b border-white/5 last:border-0">
                                                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center"><UserCircleIcon className="h-6 w-6 text-gray-700" /></div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-black text-white uppercase tracking-tight truncate">{u.name}</p>
                                                            <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest">{u.circle}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-slate-900/60 p-5 rounded-[2rem] border border-brand-gold/20 flex items-center justify-between shadow-inner">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center border border-brand-gold/20"><UserCircleIcon className="h-6 w-6 text-brand-gold/60" /></div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Authority Target</p>
                                                <p className="text-lg font-black text-white truncate uppercase tracking-tighter">{selectedUser.name}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedUser(null)} className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors mr-2">Change</button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">Quantum Dispatch Volume</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full bg-black border border-white/10 p-8 rounded-[2.5rem] text-white font-mono text-5xl font-black focus:outline-none focus:ring-1 focus:ring-brand-gold/40 placeholder-gray-900"
                                    placeholder="0.00"
                                />
                                <div className="absolute inset-y-0 right-10 flex items-center pointer-events-none">
                                    <span className="text-2xl font-black text-gray-800 font-mono tracking-widest uppercase">UBT</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Output/Log Column */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="flex-1 bg-slate-950/80 rounded-[2.5rem] border border-white/5 p-8 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Protocol Monitor</h3>
                                <div className="flex gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${isVaultLocked ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`}></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-gold/30"></div>
                                </div>
                            </div>
                            
                            <div className="flex-1 font-mono text-[9px] text-brand-gold/70 space-y-2 overflow-y-auto no-scrollbar max-h-60 lg:max-h-none">
                                {logs.length > 0 ? (
                                    logs.map((log, i) => <div key={i} className="animate-fade-in opacity-80">{log}</div>)
                                ) : (
                                    <div className="h-full flex items-center justify-center opacity-20 text-center">
                                        <p className="uppercase tracking-widest">{isVaultLocked ? 'AUTHORIZATION REQUIRED' : 'Awaiting Handshake Initiation...'}</p>
                                    </div>
                                )}
                                {isProcessing && <div className="w-1.5 h-3 bg-brand-gold animate-terminal-cursor"></div>}
                            </div>
                            
                            <button 
                                onClick={handleDispatch}
                                disabled={isProcessing || isVaultLocked || !selectedVaultId || !amount || (mode === 'anchor' && !targetAddress) || (mode === 'registry' && !selectedUser)}
                                className="w-full py-6 mt-8 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-2xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-4 disabled:opacity-20 disabled:grayscale"
                            >
                                {isProcessing ? <LoaderIcon className="h-5 w-5 animate-spin"/> : <>Execute Signed Handshake <ShieldCheckIcon className="h-5 w-5"/></>}
                            </button>
                        </div>
                        
                        <div className="p-6 bg-blue-900/10 border border-blue-500/20 rounded-2xl flex items-start gap-4">
                             <ShieldCheckIcon className="h-5 w-5 text-blue-400 opacity-60 flex-shrink-0" />
                             <p className="text-[9px] text-blue-300 leading-loose uppercase font-black italic">
                                SENDER AUTHORITY: Root Node. Private keys are never exposed to the mirror. All ledger events are cryptographically verifiable.
                             </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};