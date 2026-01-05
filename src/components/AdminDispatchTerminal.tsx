
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
import { FileTextIcon } from './icons/FileTextIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';

type DispatchMode = 'registry' | 'anchor' | 'scan';

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
    
    const [isCopied, setIsCopied] = useState(false);
    
    const debouncedSearch = useDebounce(searchQuery, 300);
    const debouncedAddress = useDebounce(targetAddress, 500);
    const { addToast } = useToast();

    useEffect(() => {
        const unsub = api.listenToVaults(setVaults, console.error);
        return () => unsub();
    }, []);

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

    const handleScanComplete = (data: { id: string, name: string, key: string }) => {
        setMode('anchor');
        setTargetAddress(data.key);
        setSelectedUser({ id: data.id, name: data.name, publicKey: data.key } as any);
        setIsScanning(false);
        addToast("Node Identity Indexed.", "success");
    };

    const handleDispatch = async () => {
        if (!selectedVaultId) {
            addToast("Select an origin reserve node.", "error");
            return;
        }

        const selectedVault = vaults.find(v => v.id === selectedVaultId);
        if (selectedVault?.isLocked) {
            addToast("AUTHORIZATION DENIED: Node is locked.", "error");
            return;
        }

        const finalTargetKey = mode === 'anchor' ? targetAddress : selectedUser?.publicKey;
        if (!finalTargetKey) {
            addToast("Invalid destination node identity.", "error");
            return;
        }

        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) {
            addToast("Invalid quantum volume.", "error");
            return;
        }

        if (!localStorage.getItem('gcn_sign_secret_key')) {
            addToast("IDENTITY_LOCK: Enter PIN in Security Tab to sign dispatches.", "error");
            return;
        }

        setIsProcessing(true);
        setLogs(["> INITIALIZING SIGNED HANDSHAKE..."]);
        
        try {
            const timestamp = Date.now();
            const nonce = cryptoService.generateNonce();
            const targetId = selectedUser?.id || 'EXTERNAL_NODE';
            
            setTimeout(() => addLog("FETCHING AUTHORITY ROOT KEYS..."), 300);
            setTimeout(() => addLog(`TARGET_RESOLVED: ${finalTargetKey.substring(0,12)}...`), 600);
            setTimeout(() => addLog("GENERATING ATOMIC SIGNATURE..."), 900);
            setTimeout(() => addLog("COMMITTING TO MAINNET LEDGER..."), 1200);

            const payloadToSign = `${selectedVaultId}:${finalTargetKey}:${amt}:${timestamp}:${nonce}`;
            const signature = cryptoService.signTransaction(payloadToSign);
            const txId = `auth-dispatch-${Date.now().toString(36)}`;
            
            const transaction: UbtTransaction = {
                id: txId,
                senderId: selectedVaultId,
                receiverId: targetId,
                amount: amt,
                timestamp: timestamp,
                nonce: nonce,
                signature: signature,
                hash: payloadToSign,
                senderPublicKey: cryptoService.getPublicKey() || "",
                parentHash: 'TREASURY_ROOT',
                protocol_mode: 'MAINNET'
            };

            await api.processAdminHandshake(selectedVaultId, targetId, amt, transaction);
            
            setTimeout(() => {
                addLog("STATE SYNC COMPLETE. DISPATCH BROADCAST.");
                addToast(`Successfully distributed ${amt} UBT.`, "success");
                setAmount('');
                setSelectedUser(null);
                setTargetAddress('');
                setLogs([]);
                setIsProcessing(false);
            }, 1800);

        } catch (e: any) {
            const msg = e.message || "Protocol Fault.";
            addLog(`!! CRITICAL: ${msg.toUpperCase()}`);
            addToast(msg, "error");
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-20 font-sans">
            {isScanning && (
                <UBTScan 
                    currentUser={admin} 
                    onClose={() => setIsScanning(false)} 
                    onTransactionComplete={() => {}} 
                    onScanIdentity={handleScanComplete}
                />
            )}

            <div className="module-frame bg-slate-950 p-8 sm:p-12 rounded-[3.5rem] border-brand-gold/30 shadow-[0_0_100px_-20px_rgba(212,175,55,0.15)] relative overflow-hidden">
                <div className="corner-tl !border-brand-gold/60"></div><div className="corner-tr !border-brand-gold/60"></div><div className="corner-bl !border-brand-gold/60"></div><div className="corner-br !border-brand-gold/60"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-white/5 pb-8">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter gold-text leading-none">Authority Dispatch</h2>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] mt-3">Distribution Control Panel v2.6</p>
                    </div>
                    
                    <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/5">
                        <button 
                            onClick={() => {setMode('anchor'); setSelectedUser(null);}} 
                            className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'anchor' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-600 hover:text-gray-300'}`}
                        >
                            Direct Anchor
                        </button>
                        <button 
                            onClick={() => {setMode('registry'); setSelectedUser(null);}} 
                            className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'registry' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-600 hover:text-gray-300'}`}
                        >
                            Registry
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-7 space-y-8">
                        <div className="space-y-3">
                            <label className="label-caps !text-[9px] text-gray-500 flex items-center gap-2">
                                <DatabaseIcon className="h-3 w-3 text-brand-gold" /> Origin Reserve Node
                            </label>
                            <select 
                                value={selectedVaultId}
                                onChange={e => setSelectedVaultId(e.target.value)}
                                className={`w-full bg-slate-900 border p-5 rounded-2xl text-white text-xs font-black uppercase tracking-widest focus:outline-none appearance-none shadow-inner transition-all border-white/10 bg-slate-900/60`}
                            >
                                <option value="">Select Origin Node...</option>
                                {vaults.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.name} {v.isLocked ? '[LOCKED]' : '[AVAILABLE]'} &mdash; {v.balance.toLocaleString()} UBT
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="label-caps !text-[9px] text-gray-500 flex items-center gap-2">
                                <KeyIcon className="h-3 w-3 text-brand-gold" /> Destination Target
                            </label>
                            <div className="flex gap-3">
                                <div className="relative flex-1 group">
                                    <input 
                                        type="text"
                                        value={mode === 'anchor' ? targetAddress : searchQuery}
                                        onChange={e => mode === 'anchor' ? setTargetAddress(e.target.value) : setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-900/60 border border-white/10 p-5 rounded-2xl text-white text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-brand-gold/40 transition-all placeholder-gray-800 uppercase"
                                        placeholder={mode === 'anchor' ? "PASTE PUBLIC ANCHOR..." : "SEARCH REGISTRY..."}
                                    />
                                    {mode === 'registry' && searchResults.length > 0 && !selectedUser && (
                                        <div className="absolute top-full left-0 right-0 mt-3 max-h-60 overflow-y-auto bg-black border border-white/10 rounded-2xl z-50 shadow-2xl no-scrollbar backdrop-blur-3xl">
                                            {searchResults.map(u => (
                                                <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full text-left p-5 hover:bg-white/5 flex items-center gap-5 border-b border-white/5 last:border-0 transition-all">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center"><UserCircleIcon className="h-8 w-8 text-gray-700" /></div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black text-white uppercase tracking-tight truncate">{u.name}</p>
                                                        <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest mt-0.5">{u.circle}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => setIsScanning(true)}
                                    className="p-5 bg-white/5 hover:bg-brand-gold/20 border border-white/10 rounded-2xl text-brand-gold transition-all active:scale-95 shadow-lg group"
                                    title="Scan Node QR"
                                >
                                    <QrCodeIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                            {(selectedUser || (mode === 'anchor' && targetAddress.length > 20)) && (
                                <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/20 flex items-center justify-between animate-fade-in shadow-inner">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full animate-pulse shadow-glow-matrix ${selectedUser ? 'bg-emerald-500' : 'bg-brand-gold'}`}></div>
                                        <div>
                                            <p className="label-caps !text-[8px] text-emerald-500 opacity-60">{selectedUser ? 'Verified Node Identity' : 'Unindexed Protocol Node'}</p>
                                            <p className="text-sm font-black text-white uppercase tracking-tight">{selectedUser ? selectedUser.name : 'EXTERNAL_NODE'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => {setSelectedUser(null); setTargetAddress('');}} className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest pr-2">Clear</button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="label-caps !text-[9px] text-gray-500">Quantum Dispatch Volume</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full bg-black border border-white/10 p-8 rounded-[2.5rem] text-white font-mono text-5xl font-black focus:outline-none focus:ring-1 focus:ring-brand-gold/40 placeholder-gray-900 shadow-inner"
                                    placeholder="0.00"
                                />
                                <div className="absolute inset-y-0 right-10 flex items-center pointer-events-none">
                                    <span className="text-2xl font-black text-gray-800 font-mono tracking-widest uppercase">UBT</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 flex flex-col gap-8">
                        <div className="flex-1 bg-slate-950/80 rounded-[3rem] border border-white/5 p-8 flex flex-col shadow-inner">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em]">Protocol Monitor</h3>
                                <div className="flex gap-2">
                                    <div className={`w-2 h-2 rounded-full bg-emerald-500 animate-pulse`}></div>
                                    <div className="w-2 h-2 rounded-full bg-brand-gold/20"></div>
                                </div>
                            </div>
                            
                            <div className="flex-1 font-mono text-[9px] text-brand-gold/70 space-y-2.5 overflow-y-auto no-scrollbar max-h-60 lg:max-h-none border-l border-white/5 pl-6">
                                {logs.length > 0 ? (
                                    logs.map((log, i) => <div key={i} className="animate-fade-in">{log}</div>)
                                ) : (
                                    <div className="h-full flex items-center justify-center opacity-20 text-center px-6">
                                        <p className="uppercase tracking-[0.2em] leading-loose text-[8px]">
                                            Awaiting initialization sequence...
                                        </p>
                                    </div>
                                )}
                                {isProcessing && <div className="w-1.5 h-3 bg-brand-gold animate-terminal-cursor mt-2 shadow-glow-gold"></div>}
                            </div>
                            
                            <button 
                                onClick={handleDispatch}
                                disabled={isProcessing || isResolving || !selectedVaultId || !amount}
                                className="w-full py-6 mt-8 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-4 disabled:opacity-20 disabled:grayscale"
                            >
                                {isProcessing ? <LoaderIcon className="h-5 w-5 animate-spin"/> : isResolving ? <LoaderIcon className="h-5 w-5 animate-spin"/> : <>Sign & Dispatch Assets <ShieldCheckIcon className="h-5 w-5"/></>}
                            </button>
                        </div>
                        
                        <div className="p-6 bg-blue-900/10 border border-blue-500/20 rounded-3xl flex items-start gap-5">
                             <AlertTriangleIcon className="h-6 w-6 text-blue-400 opacity-60 flex-shrink-0" />
                             <p className="text-[9px] text-blue-300 leading-loose uppercase font-black italic tracking-tight">
                                AUTHORITY NOTE: Ledger events are atomic and immutable. Target node will receive credit immediately upon handshake verification.
                             </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
