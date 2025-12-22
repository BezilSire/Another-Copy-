
import React, { useState, useEffect } from 'react';
import { User, PublicUserProfile, UbtTransaction } from '../types';
import { api } from '../services/apiService';
import { cryptoService } from '../services/cryptoService';
import { useToast } from '../contexts/ToastContext';
import { XCircleIcon } from './icons/XCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { SearchIcon } from './icons/SearchIcon';
import { useDebounce } from '../hooks/useDebounce';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface SendUbtModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    onTransactionComplete: () => void;
}

export const SendUbtModal: React.FC<SendUbtModalProps> = ({ isOpen, onClose, currentUser, onTransactionComplete }) => {
    const [mode, setMode] = useState<'search' | 'manual'>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [manualAddress, setManualAddress] = useState('');
    const [searchResults, setSearchResults] = useState<PublicUserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<PublicUserProfile | null>(null);
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [protocolLogs, setProtocolLogs] = useState<string[]>([]);
    
    const debouncedSearch = useDebounce(searchQuery, 300);
    const { addToast } = useToast();

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setManualAddress('');
            setSearchResults([]);
            setSelectedUser(null);
            setAmount('');
            setShowConfirmation(false);
            setProtocolLogs([]);
            return;
        }
    }, [isOpen]);

    useEffect(() => {
        if (debouncedSearch.length > 1 && !selectedUser && mode === 'search') {
            setIsLoading(true);
            api.searchUsers(debouncedSearch, currentUser)
                .then(setSearchResults)
                .catch(console.error)
                .finally(() => setIsLoading(false));
        } else {
            setSearchResults([]);
        }
    }, [debouncedSearch, currentUser, selectedUser, mode]);

    const handleSelectUser = (user: PublicUserProfile) => {
        setSelectedUser(user);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleLookupManual = async () => {
        if (!manualAddress.trim()) return;
        setIsLoading(true);
        try {
            const user = await api.getUserByPublicKey(manualAddress.trim());
            if (user) {
                setSelectedUser(user as PublicUserProfile);
                setMode('search');
            } else {
                addToast("No verified node found with this anchor address.", "error");
            }
        } catch (e) {
            addToast("Protocol lookup failed.", "error");
        } finally {
            setIsLoading(false);
        }
    }

    const handleInitiateSend = () => {
        const sendAmount = parseFloat(amount);
        if (isNaN(sendAmount) || sendAmount <= 0) {
            addToast("Please enter a valid amount.", "error");
            return;
        }
        if (sendAmount > (currentUser.ubtBalance || 0)) {
            addToast("Insufficient node assets.", "error");
            return;
        }
        setShowConfirmation(true);
    };

    const handleFinalSend = async () => {
        if (!selectedUser) return;
        
        setIsSending(true);
        setProtocolLogs(["> INITIALIZING SIGNATURE PROTOCOL..."]);
        
        try {
            const sendAmount = parseFloat(amount);
            const timestamp = Date.now();
            const nonce = cryptoService.generateNonce();
            const senderPubKey = cryptoService.getPublicKey() || "";
            
            setTimeout(() => setProtocolLogs(prev => [...prev, "> HASHING PAYLOAD..."]), 400);
            const payloadToSign = `${currentUser.id}:${selectedUser.id}:${sendAmount}:${timestamp}:${nonce}`;
            
            setTimeout(() => setProtocolLogs(prev => [...prev, "> GENERATING ED25519 SIGNATURE..."]), 800);
            const signature = cryptoService.signTransaction(payloadToSign);
            
            setTimeout(() => setProtocolLogs(prev => [...prev, "> DISPATCHING TO LEDGER..."]), 1200);
            const txId = Date.now().toString(36) + Math.random().toString(36).substring(2);
            
            const transaction: UbtTransaction = {
                id: txId,
                senderId: currentUser.id,
                receiverId: selectedUser.id,
                amount: sendAmount,
                timestamp: timestamp,
                nonce: nonce,
                signature: signature,
                hash: payloadToSign,
                senderPublicKey: senderPubKey,
                parentHash: 'GENESIS_CHAIN', // In real DAG, this would be previous block hash
                type: 'P2P_HANDSHAKE'
            };

            await api.processUbtTransaction(transaction);
            
            setTimeout(() => {
                addToast(`Sync Successful. ${sendAmount} UBT moved.`, "success");
                onTransactionComplete();
                onClose();
            }, 1600);
            
        } catch (error) {
            addToast("Transaction Protocol Aborted.", "error");
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose}></div>
            <div className="glass-card w-full max-w-lg rounded-[3rem] border-brand-gold/20 shadow-glow-gold relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter gold-text">
                        {showConfirmation ? 'Authorize Sync' : 'Send Quantum'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-brand-gold transition-colors bg-white/5 rounded-full"><XCircleIcon className="h-6 w-6" /></button>
                </div>

                <div className="p-8 overflow-y-auto no-scrollbar space-y-8">
                    {!selectedUser ? (
                        <div className="space-y-6">
                            <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5">
                                <button onClick={() => setMode('search')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'search' ? 'bg-brand-gold text-slate-950' : 'text-gray-500'}`}>Node Search</button>
                                <button onClick={() => setMode('manual')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'manual' ? 'bg-brand-gold text-slate-950' : 'text-gray-500'}`}>Manual Anchor</button>
                            </div>

                            {mode === 'search' ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="SEARCH NODE BY NAME..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-5 pl-12 pr-4 text-white text-xs font-black tracking-widest uppercase focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto rounded-3xl bg-black/40 border border-white/5 no-scrollbar">
                                        {searchResults.map(user => (
                                            <button key={user.id} onClick={() => handleSelectUser(user)} className="w-full text-left p-5 hover:bg-brand-gold/5 border-b border-white/5 flex items-center gap-4 group transition-all">
                                                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-white/10 group-hover:border-brand-gold/50"><UserCircleIcon className="h-6 w-6 text-gray-700 group-hover:text-brand-gold" /></div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-black text-white text-sm uppercase tracking-tight truncate">{user.name}</p>
                                                    <p className="text-[9px] text-gray-600 font-bold uppercase">{user.circle}</p>
                                                </div>
                                            </button>
                                        ))}
                                        {isLoading && <div className="p-8 text-center"><LoaderIcon className="h-6 w-6 animate-spin text-brand-gold mx-auto" /></div>}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <ClipboardIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="PASTE NODE PUBLIC KEY..."
                                            value={manualAddress}
                                            onChange={e => setManualAddress(e.target.value)}
                                            className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-5 pl-12 pr-4 text-white text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleLookupManual}
                                        disabled={!manualAddress.trim() || isLoading}
                                        className="w-full py-4 bg-slate-900 border border-brand-gold/20 text-brand-gold rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold hover:text-slate-950 transition-all"
                                    >
                                        {isLoading ? "PROBING NETWORK..." : "Probe Node Anchor"}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : showConfirmation ? (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex flex-col items-center py-6 bg-slate-950/80 rounded-[2.5rem] border border-brand-gold/10 relative overflow-hidden">
                                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 blur-3xl rounded-full"></div>
                                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4">Confirmed Transfer</p>
                                 <p className="text-5xl font-black text-white font-mono tracking-tighter">{amount} <span className="text-xl text-brand-gold">UBT</span></p>
                            </div>

                            {isSending ? (
                                <div className="p-6 bg-black/60 rounded-[2rem] border border-white/5 font-mono text-[10px] space-y-2 text-brand-gold">
                                    {protocolLogs.map((log, i) => <div key={i} className="animate-fade-in">{log}</div>)}
                                    <div className="w-2 h-3 bg-brand-gold animate-terminal-cursor mt-2 shadow-[0_0_8px_#D4AF37]"></div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Source Node</p>
                                            <p className="text-sm font-black text-white">{currentUser.name}</p>
                                        </div>
                                        <div className="h-px w-12 bg-white/10"></div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Target Node</p>
                                            <p className="text-sm font-black text-brand-gold">{selectedUser.name}</p>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-red-950/30 border border-red-900/50 rounded-3xl flex gap-4 items-start">
                                        <AlertTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                                        <p className="text-[10px] text-red-200/80 leading-relaxed uppercase font-black tracking-tight">
                                            Protocol Action is irreversible. Funds will be moved to target node.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!isSending && (
                                <div className="flex flex-col gap-4">
                                    <button
                                        onClick={handleFinalSend}
                                        className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-3xl active:scale-95 shadow-glow-gold uppercase tracking-[0.2em] text-xs"
                                    >
                                        Authorise & Sign Dispatch
                                    </button>
                                    <button onClick={() => setShowConfirmation(false)} className="py-2 text-[9px] font-black text-gray-600 uppercase tracking-widest hover:text-white transition-colors">Correction Protocol</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-slate-950/80 p-5 rounded-[2rem] border border-white/5 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/5"><UserCircleIcon className="h-10 w-10 text-brand-gold/60" /></div>
                                    <div className="min-w-0">
                                        <p className="font-black text-white text-lg tracking-tight truncate uppercase">{selectedUser.name}</p>
                                        <p className="text-[9px] text-gray-500 font-black tracking-widest uppercase">{selectedUser.circle}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedUser(null)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[9px] font-black text-gray-400 rounded-xl transition-all uppercase tracking-widest border border-white/5">Change</button>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] pl-1">Transfer Quantum</label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="block w-full bg-slate-950/80 border border-white/10 rounded-[2rem] py-6 px-8 text-white text-5xl font-black font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold/30 transition-all placeholder-gray-900"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
                                        <span className="text-gray-700 font-black tracking-tighter text-xl">UBT</span>
                                    </div>
                                </div>
                                <div className="flex justify-between mt-4 px-4">
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Holding: <span className="text-brand-gold">{(currentUser.ubtBalance || 0).toFixed(2)}</span></span>
                                    <button onClick={() => setAmount(String(currentUser.ubtBalance || 0))} className="text-[10px] font-black text-brand-gold hover:text-brand-gold-light uppercase tracking-widest transition-colors">Maximum Quantum</button>
                                </div>
                            </div>

                            <button onClick={handleInitiateSend} disabled={!amount || parseFloat(amount) <= 0} className="w-full py-5 bg-slate-900 border border-brand-gold/20 hover:border-brand-gold/50 text-white font-black rounded-[2rem] active:scale-95 disabled:opacity-30 uppercase tracking-[0.2em] text-xs shadow-xl">Review Protocol</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
