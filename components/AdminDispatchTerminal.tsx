
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
    
    const debouncedAddress = useDebounce(targetAddress, 500);
    const debouncedSearch = useDebounce(searchQuery, 300);
    const { addToast } = useToast();

    const isUnlocked = sessionStorage.getItem('ugc_node_unlocked') === 'true';

    useEffect(() => {
        const unsub = api.listenToVaults(setVaults, console.error);
        return () => unsub();
    }, []);

    useEffect(() => {
        if (mode === 'anchor' && debouncedAddress.length > 10) {
            setIsResolving(true);
            api.resolveNodeIdentity(debouncedAddress).then(user => {
                if (user) setSelectedUser(user as PublicUserProfile);
                else setSelectedUser(null);
            }).finally(() => setIsResolving(false));
        }
    }, [debouncedAddress, mode]);

    useEffect(() => {
        if (mode === 'registry' && debouncedSearch.length > 1 && !selectedUser) {
            api.searchUsers(debouncedSearch, admin).then(setSearchResults);
        }
    }, [debouncedSearch, admin, selectedUser, mode]);

    const addLog = (msg: string) => setLogs(p => [...p, `> ${msg}`]);

    const handleDispatch = async () => {
        if (!isUnlocked) {
            addToast("AUTHORIZATION_REQUIRED: Unlock your node using the key icon in HUD.", "error");
            return;
        }

        if (!selectedVaultId || !amount) return;
        const targetKey = mode === 'anchor' ? targetAddress : selectedUser?.publicKey;
        if (!targetKey) {
            addToast("No valid destination node identified.", "error");
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
            setTimeout(() => addLog("GENERATING CRYPTOGRAPHIC SIGNATURE..."), 900);
            
            // LAW: The payload is the data, the signature is the identifier
            const payload = `${selectedVaultId}:${targetKey}:${amt}:${timestamp}:${nonce}`;
            const signature = cryptoService.signTransaction(payload);
            
            // SYSTEM LAW: The Block ID is the signature
            const tx: UbtTransaction = {
                id: signature, 
                senderId: selectedVaultId,
                receiverId: targetId,
                receiverPublicKey: targetKey,
                amount: amt,
                timestamp,
                nonce,
                signature,
                hash: payload,
                senderPublicKey: cryptoService.getPublicKey() || "",
                parentHash: 'ROOT_STATE_ENTRY',
                protocol_mode: 'MAINNET'
            };

            await api.processAdminHandshake(selectedVaultId, targetId, amt, tx);
            addLog(`SYNC_COMPLETE: block ${signature.substring(0,16)}...`);
            addToast("Handshake complete. Ledger updated.", "success");
            setAmount('');
            setSelectedUser(null);
            setTargetAddress('');
        } catch (e: any) {
            addToast(e.message || "Dispatch aborted.", "error");
        } finally {
            setIsProcessing(false);
            setLogs([]);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-20 font-sans">
            {isScanning && <UBTScan currentUser={admin} onClose={() => setIsScanning(false)} onTransactionComplete={() => {}} onScanIdentity={(d) => { setTargetAddress(d.key); setMode('anchor'); setIsScanning(false); }} />}

            <div className="module-frame bg-slate-950 p-8 sm:p-12 rounded-[3.5rem] border border-white/10 shadow-premium relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 border-b border-white/5 pb-8 gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text leading-none">Dispatch Terminal</h2>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">Authority Asset Handshake</p>
                    </div>
                    <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/5">
                        <button onClick={() => { setMode('anchor'); setSelectedUser(null); setTargetAddress(''); }} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'anchor' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-500'}`}>Direct Anchor</button>
                        <button onClick={() => { setMode('registry'); setSelectedUser(null); setSearchQuery(''); }} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'registry' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-gray-500'}`}>Search Registry</button>
                    </div>
                </div>

                <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="label-caps !text-[9px] text-gray-500">Origin Node</label>
                            <select value={selectedVaultId} onChange={e => setSelectedVaultId(e.target.value)} className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl text-white text-xs font-black uppercase tracking-widest outline-none appearance-none">
                                <option value="">Select Origin...</option>
                                {vaults.map(v => <option key={v.id} value={v.id}>{v.name} &bull; {v.balance.toLocaleString()} UBT</option>)}
                            </select>
                        </div>
                        <div className="space-y-4">
                            <label className="label-caps !text-[9px] text-gray-500">Target Node</label>
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
                        {isProcessing ? <LoaderIcon className="h-6 w-6 animate-spin"/> : <>SIGN ATOMIC DISPATCH <ShieldCheckIcon className="h-5 w-5"/></>}
                    </button>
                    
                    {logs.length > 0 && (
                        <div className="p-6 bg-black rounded-3xl border border-white/5 font-mono text-[10px] text-emerald-500/60 space-y-2 max-h-40 overflow-y-auto no-scrollbar shadow-inner">
                            {logs.map((l, i) => <div key={i} className="animate-fade-in">{l}</div>)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
