
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
import { XCircleIcon } from './icons/XCircleIcon';

type DispatchMode = 'registry' | 'anchor';

export const AdminDispatchTerminal: React.FC<{ admin: Admin }> = ({ admin }) => {
    const [mode, setMode] = useState<DispatchMode>('anchor');
    const [vaults, setVaults] = useState<TreasuryVault[]>([]);
    const [selectedVaultId, setSelectedVaultId] = useState('');
    const [targetAddress, setTargetAddress] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PublicUserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<PublicUserProfile | null>(null);
    const [amount, setAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    
    const debouncedAddress = useDebounce(targetAddress, 300); // Faster debounce for immediate feedback
    const debouncedSearch = useDebounce(searchQuery, 300);
    const { addToast } = useToast();

    const isUnlocked = sessionStorage.getItem('ugc_node_unlocked') === 'true';

    useEffect(() => {
        const unsub = api.listenToVaults(setVaults, console.error);
        return () => unsub();
    }, []);

    // Immediate Identity Resolution Logic
    useEffect(() => {
        const resolve = async () => {
            if (mode === 'anchor' && debouncedAddress.length > 5 && !selectedUser) {
                setIsResolving(true);
                try {
                    const user = await api.resolveNodeIdentity(debouncedAddress);
                    if (user) {
                        setSelectedUser(user as PublicUserProfile);
                        addToast("Recipient Identity Resolved.", "success");
                    }
                } finally {
                    setIsResolving(false);
                }
            }
        };
        resolve();
    }, [debouncedAddress, mode, selectedUser, addToast]);

    useEffect(() => {
        if (mode === 'registry' && debouncedSearch.length > 1 && !selectedUser) {
            api.searchUsers(debouncedSearch, admin).then(setSearchResults);
        }
    }, [debouncedSearch, admin, selectedUser, mode]);

    const addLog = (msg: string) => setLogs(p => [...p, `> ${msg}`]);

    const handleDispatch = async () => {
        // Validation Layer
        if (!isUnlocked) {
            addToast("AUTHORIZATION_REQUIRED: Unlock your node using the key icon in HUD.", "error");
            return;
        }

        if (!selectedVaultId) {
            addToast("ERROR: Select an origin node.", "error");
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            addToast("ERROR: Enter a valid amount.", "error");
            return;
        }

        const finalTargetKey = mode === 'anchor' ? targetAddress : selectedUser?.publicKey;
        if (!finalTargetKey) {
            addToast("ERROR: Valid destination node required.", "error");
            return;
        }

        const selectedVault = vaults.find(v => v.id === selectedVaultId);
        if (selectedVault && selectedVault.balance < parseFloat(amount)) {
            addToast("INSUFFICIENT_FUNDS: Origin node lacks liquidity.", "error");
            return;
        }

        setIsProcessing(true);
        setLogs(["> INITIALIZING ATOMIC DISPATCH..."]);
        
        try {
            const timestamp = Date.now();
            const nonce = cryptoService.generateNonce();
            const amt = parseFloat(amount);
            const targetId = selectedUser?.id || 'EXTERNAL_NODE';

            setTimeout(() => addLog(`RECIPIENT_NODE: ${selectedUser?.name || 'EXTERNAL_HANDSHAKE'}`), 300);
            setTimeout(() => addLog(`SOURCE_VAULT: ${selectedVaultId}`), 600);
            setTimeout(() => addLog("GENERATING ATOMIC SIGNATURE..."), 900);
            
            const payload = `${selectedVaultId}:${finalTargetKey}:${amt}:${timestamp}:${nonce}`;
            const signature = cryptoService.signTransaction(payload);
            const txId = `auth-${Date.now().toString(36)}`;

            const tx: UbtTransaction = {
                id: txId,
                senderId: selectedVaultId,
                receiverId: targetId,
                amount: amt,
                timestamp,
                nonce,
                signature,
                hash: payload,
                senderPublicKey: cryptoService.getPublicKey() || "",
                parentHash: 'ROOT_STATE',
                protocol_mode: 'MAINNET'
            };

            await api.processAdminHandshake(selectedVaultId, targetId, amt, tx);
            addLog("MAINNET SYNC COMPLETE.");
            addToast("Handshake complete. Assets distributed.", "success");
            setAmount('');
            setSelectedUser(null);
            setTargetAddress('');
        } catch (e: any) {
            addToast(e.message || "Dispatch aborted.", "error");
        } finally {
            setIsProcessing(false);
            setTimeout(() => setLogs([]), 2000);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-20 font-sans">
            {isScanning && (
                <UBTScan 
                    currentUser={admin} 
                    onClose={() => setIsScanning(false)} 
                    onTransactionComplete={() => {}} 
                    onScanIdentity={(d) => { setTargetAddress(d.key); setMode('anchor'); setIsScanning(false); }} 
                />
            )}

            <div className="module-frame bg-slate-950 p-8 sm:p-12 rounded-[3.5rem] border border-white/10 shadow-premium relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 border-b border-white/5 pb-8 gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text leading-none">Dispatch Terminal</h2>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">Authority Asset Redistribution</p>
                    </div>
                    <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/5">
                        <button onClick={() => { setMode('anchor'); setSelectedUser(null); setTargetAddress(''); }} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'anchor' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-500'}`}>Direct Anchor</button>
                        <button onClick={() => { setMode('registry'); setSelectedUser(null); setSearchQuery(''); }} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'registry' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-500'}`}>Search Registry</button>
                    </div>
                </div>

                <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="label-caps !text-[9px] text-gray-500">Origin Reserve</label>
                            <select value={selectedVaultId} onChange={e => setSelectedVaultId(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl text-white text-xs font-black uppercase tracking-widest outline-none appearance-none">
                                <option value="">Select Origin Node...</option>
                                {vaults.map(v => <option key={v.id} value={v.id}>{v.name} &bull; {v.balance.toLocaleString()} UBT</option>)}
                            </select>
                        </div>
                        <div className="space-y-4">
                            <label className="label-caps !text-[9px] text-gray-500">Destination Target</label>
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    value={mode === 'anchor' ? targetAddress : searchQuery}
                                    onChange={e => mode === 'anchor' ? setTargetAddress(e.target.value.toUpperCase()) : setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl text-white font-mono text-[11px] uppercase focus:ring-1 focus:ring-brand-gold/40 outline-none pr-14" 
                                    placeholder={mode === 'anchor' ? "PASTE UBT ADDRESS..." : "SEARCH NAME..."}
                                />
                                <button onClick={() => setIsScanning(true)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-brand-gold hover:text-white transition-colors" title="Scan QR"><QrCodeIcon className="h-5 w-5"/></button>
                                
                                {isResolving && <div className="absolute right-12 top-1/2 -translate-y-1/2"><LoaderIcon className="h-4 w-4 animate-spin text-brand-gold"/></div>}

                                {mode === 'registry' && searchResults.length > 0 && !selectedUser && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-black border border-white/10 rounded-2xl z-50 overflow-hidden shadow-2xl no-scrollbar">
                                        {searchResults.map(u => (
                                            <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full text-left p-4 hover:bg-brand-gold/10 flex items-center gap-4 border-b border-white/5 last:border-0 group">
                                                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-gray-600 group-hover:text-brand-gold transition-colors"><UserCircleIcon className="h-6 w-6" /></div>
                                                <div>
                                                    <p className="text-xs font-black text-white uppercase">{u.name}</p>
                                                    <p className="text-[9px] text-gray-500 uppercase tracking-widest">{u.circle}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {selectedUser && (
                        <div className="bg-emerald-950/20 border border-emerald-500/20 p-6 rounded-[2rem] flex items-center justify-between animate-fade-in relative group overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 shadow-glow-matrix"><ShieldCheckIcon className="h-6 w-6" /></div>
                                <div>
                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Node Resolution Verified</p>
                                    <p className="text-xl font-black text-white uppercase tracking-tighter leading-none">{selectedUser.name}</p>
                                    <p className="text-[9px] text-gray-500 font-mono mt-1.5 truncate max-w-[200px] sm:max-w-md">{selectedUser.publicKey || selectedUser.id}</p>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedUser(null); setTargetAddress(''); setSearchQuery(''); }} className="p-3 text-gray-600 hover:text-red-500 transition-colors relative z-10"><XCircleIcon className="h-6 w-6" /></button>
                        </div>
                    )}

                    <div className="space-y-4">
                        <label className="label-caps !text-[9px] text-gray-500 pl-2">Volume Transfer (UBT)</label>
                        <div className="relative">
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-black border-none p-8 rounded-[2.5rem] text-white text-6xl font-black font-mono text-center outline-none shadow-inner placeholder-gray-900" placeholder="0.00" />
                            <div className="absolute inset-y-0 right-10 flex items-center pointer-events-none text-gray-800 font-black text-2xl uppercase">UBT</div>
                        </div>
                    </div>

                    <button 
                        onClick={handleDispatch} 
                        disabled={isProcessing} 
                        className="w-full py-8 bg-brand-gold text-slate-950 font-black rounded-[2.5rem] active:scale-95 shadow-glow-gold uppercase tracking-[0.4em] text-[12px] transition-all flex justify-center items-center gap-4 cursor-pointer hover:bg-brand-gold-light"
                    >
                        {isProcessing ? <LoaderIcon className="h-6 w-6 animate-spin"/> : <>SEND UBT <ShieldCheckIcon className="h-5 w-5"/></>}
                    </button>
                    
                    {logs.length > 0 && (
                        <div className="p-6 bg-black rounded-3xl border border-white/5 font-mono text-[10px] text-emerald-500/60 space-y-2 max-h-40 overflow-y-auto no-scrollbar shadow-inner">
                            {logs.map((l, i) => <div key={i} className="animate-fade-in">{l}</div>)}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="p-6 bg-blue-900/10 border border-blue-500/20 rounded-[2rem] flex items-start gap-4">
                 <AlertTriangleIcon className="h-5 w-5 text-blue-400 mt-0.5 opacity-60" />
                 <p className="text-[10px] text-blue-300 font-bold uppercase tracking-tight leading-relaxed">
                    Protocol Note: All admin dispatches are recorded on the mainnet ledger with the origin node's signature. Transfers are atomic and irreversible.
                 </p>
            </div>
        </div>
    );
};
