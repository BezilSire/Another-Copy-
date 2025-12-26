
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
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { GenesisNodeFlow } from './GenesisNodeFlow';

interface SendUbtModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    onTransactionComplete: () => void;
}

export const SendUbtModal: React.FC<SendUbtModalProps> = ({ isOpen, onClose, currentUser, onTransactionComplete }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PublicUserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<PublicUserProfile | null>(null);
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [protocolLogs, setProtocolLogs] = useState<string[]>([]);
    const debouncedSearch = useDebounce(searchQuery, 300);
    const { addToast } = useToast();

    const hasVault = cryptoService.hasVault();
    const canSign = !!localStorage.getItem('gcn_sign_secret_key');

    // Reset state on open/close
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
            setSelectedUser(null);
            setAmount('');
            setProtocolLogs([]);
            setIsUpgrading(false);
        }
    }, [isOpen]);

    useEffect(() => {
        const resolveInput = async () => {
            if (debouncedSearch.length < 2 || selectedUser) return;
            if (debouncedSearch.startsWith('UBT-') && debouncedSearch.length > 25) {
                setIsLoading(true);
                try {
                    const resolvedNode = await api.getUserByPublicKey(debouncedSearch);
                    if (resolvedNode) {
                        setSelectedUser(resolvedNode as PublicUserProfile);
                        addToast("Node Resolved.", "success");
                    }
                } catch (e) {
                    console.error("Address resolution error:", e);
                } finally {
                    setIsLoading(false);
                }
                return;
            }
            setIsLoading(true);
            try {
                const results = await api.searchUsers(debouncedSearch, currentUser);
                setSearchResults(results);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        resolveInput();
    }, [debouncedSearch, currentUser, selectedUser, addToast]);

    const handleSelectUser = (user: PublicUserProfile) => {
        setSelectedUser(user);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleSend = async () => {
        if (!selectedUser) return;
        const sendAmount = parseFloat(amount);
        if (isNaN(sendAmount) || sendAmount <= 0) return;
        if (sendAmount > (currentUser.ubtBalance || 0)) {
            addToast("Liquidity Breach: Insufficient Node Balance.", "error");
            return;
        }

        if (!canSign) {
            addToast("IDENTITY_LOCK: Local vault required to sign dispatch.", "error");
            return;
        }

        setIsSending(true);
        setProtocolLogs(["> Initializing Digital Handshake..."]);
        
        try {
            const timestamp = Date.now();
            const nonce = cryptoService.generateNonce();
            setTimeout(() => setProtocolLogs(p => [...p, "> Generating Ed25519 Signature..."]), 400);
            setTimeout(() => setProtocolLogs(p => [...p, "> Encrypting Dispatch Package..."]), 800);
            setTimeout(() => setProtocolLogs(p => [...p, "> Syncing Global Mainnet Ledger..."]), 1200);

            const payloadToSign = `${currentUser.id}:${selectedUser.id}:${sendAmount}:${timestamp}:${nonce}`;
            const signature = cryptoService.signTransaction(payloadToSign);
            const txId = `dispatch-${Date.now().toString(36)}`;
            
            const transaction: UbtTransaction = {
                id: txId,
                senderId: currentUser.id,
                receiverId: selectedUser.id,
                amount: sendAmount,
                timestamp: timestamp,
                nonce: nonce,
                signature: signature,
                hash: payloadToSign,
                senderPublicKey: currentUser.publicKey || "",
                parentHash: 'GENESIS_CHAIN',
                type: 'P2P_HANDSHAKE',
                protocol_mode: 'MAINNET'
            };

            await api.processUbtTransaction(transaction);
            
            setTimeout(() => {
                addToast(`Sync Successful. ${sendAmount} UBT transferred.`, "success");
                onTransactionComplete();
                onClose();
            }, 1800);
        } catch (error: any) {
            console.error("Dispatch failure:", error);
            const errorDetail = error.message || "Unknown Protocol Error";
            addToast(`Dispatch Failure: ${errorDetail}`, "error");
            setIsSending(false);
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) setSearchQuery(text.trim());
        } catch (err) {
            addToast("Access to clipboard denied.", "error");
        }
    };

    const handleUpgradeComplete = async (mnemonic: string, pin: string) => {
        await cryptoService.saveVault({ mnemonic }, pin);
        setIsUpgrading(false);
        addToast("Identity Sealed. Authorized for Dispatch.", "success");
    };

    if (!isOpen) return null;

    if (isUpgrading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose}></div>
                <div className="relative z-10 w-full max-w-2xl">
                    <GenesisNodeFlow onComplete={handleUpgradeComplete} onBack={() => setIsUpgrading(false)} />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose}></div>
            <div className="module-frame bg-slate-950 w-full max-w-lg rounded-[3rem] border-white/10 shadow-[0_0_100px_-20px_rgba(212,175,55,0.2)] relative z-10 overflow-hidden font-sans">
                <div className="corner-tl"></div><div className="corner-tr"></div><div className="corner-bl"></div><div className="corner-br"></div>
                
                <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter gold-text">Quantum Dispatch</h3>
                    <button onClick={onClose} className="p-2 text-gray-600 hover:text-brand-gold transition-colors"><XCircleIcon className="h-6 w-6" /></button>
                </div>

                <div className="p-10 space-y-10">
                    {!canSign && (
                        <div className="bg-red-950/20 border border-red-500/30 p-6 rounded-[2rem] space-y-4 animate-fade-in">
                            <div className="flex items-center gap-3 text-red-500">
                                <AlertTriangleIcon className="h-6 w-6" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Node Lock Active</span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Your node identity is not sealed on this device. Cryptographic signatures are required for asset dispatch.
                            </p>
                            <button 
                                onClick={() => setIsUpgrading(true)}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all border border-white/10"
                            >
                                Seal Node Identity Now
                            </button>
                        </div>
                    )}

                    {isSending ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-8">
                             <div className="relative">
                                <LoaderIcon className="h-20 w-20 animate-spin text-brand-gold opacity-20" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <ShieldCheckIcon className="h-8 w-8 text-brand-gold animate-pulse" />
                                </div>
                             </div>
                             <div className="w-full font-mono text-[10px] text-brand-gold/70 space-y-2 text-center">
                                {protocolLogs.map((log, i) => <div key={i} className="animate-fade-in">{log}</div>)}
                                <div className="w-2 h-3 bg-brand-gold animate-terminal-cursor mx-auto mt-2"></div>
                             </div>
                        </div>
                    ) : !selectedUser ? (
                        <div className="space-y-6">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <SearchIcon className="h-5 w-5 text-gray-600 group-focus-within:text-brand-gold transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="PASTE ADDRESS OR SEARCH NAME..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-[2rem] py-6 pl-14 pr-16 text-white text-xs font-black tracking-widest uppercase focus:outline-none focus:ring-1 focus:ring-brand-gold/30 placeholder-gray-800"
                                    autoFocus
                                />
                                <button 
                                    onClick={handlePaste}
                                    className="absolute inset-y-0 right-0 pr-6 flex items-center text-gray-600 hover:text-brand-gold transition-colors"
                                    title="Paste from Clipboard"
                                >
                                    <ClipboardIcon className="h-5 w-5" />
                                </button>
                                {isLoading && <LoaderIcon className="h-5 w-5 text-brand-gold animate-spin absolute right-16 top-1/2 -translate-y-1/2" />}
                            </div>

                            {searchResults.length > 0 && (
                                <div className="max-h-60 overflow-y-auto no-scrollbar rounded-[2rem] bg-black/40 border border-white/5 animate-fade-in">
                                    {searchResults.map(user => (
                                        <button key={user.id} onClick={() => handleSelectUser(user)} className="w-full text-left p-6 hover:bg-brand-gold/5 border-b border-white/5 flex items-center gap-5 group transition-all">
                                            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center border border-white/10 group-hover:border-brand-gold/50"><UserCircleIcon className="h-8 w-8 text-gray-700" /></div>
                                            <div className="min-w-0">
                                                <p className="font-black text-white text-sm tracking-tighter truncate uppercase">{user.name}</p>
                                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">{user.circle}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {debouncedSearch.length > 5 && !isLoading && searchResults.length === 0 && (
                                <div className="p-10 text-center bg-black/20 rounded-[2rem] border border-dashed border-white/5">
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No Node Detected</p>
                                    <p className="text-[9px] text-gray-700 mt-2">Ensure the address starts with UBT- and is correct.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-10 animate-fade-in">
                            <div className="bg-slate-950/80 p-6 rounded-[2rem] border border-white/5 flex items-center justify-between shadow-inner">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center border border-brand-gold/20 shadow-glow-gold/10"><UserCircleIcon className="h-8 w-8 text-brand-gold/60" /></div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Recipient Identity</p>
                                        <p className="text-xl font-black text-white truncate uppercase tracking-tighter">{selectedUser.name}</p>
                                        <p className="text-[8px] font-mono text-gray-700 uppercase truncate max-w-[150px]">{selectedUser.publicKey}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedUser(null)} className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest pr-2 transition-colors">Abort</button>
                            </div>

                            <div className="space-y-4">
                                <label className="label-caps !text-[10px] !tracking-[0.4em] pl-2">Sync Volume</label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="block w-full bg-slate-950 border border-white/10 rounded-[2.5rem] py-8 px-8 text-white text-6xl font-black font-mono focus:outline-none focus:ring-1 focus:ring-brand-gold/30 transition-all placeholder-gray-900 shadow-inner"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    <div className="absolute inset-y-0 right-10 flex items-center pointer-events-none">
                                        <span className="text-gray-700 font-black tracking-widest text-2xl">UBT</span>
                                    </div>
                                </div>
                                <div className="flex justify-between px-6">
                                     <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Node Liquidity: <span className="text-brand-gold">{(currentUser.ubtBalance || 0).toFixed(2)}</span></span>
                                     <button onClick={() => setAmount(String(currentUser.ubtBalance || 0))} className="text-[10px] font-black text-brand-gold hover:text-white uppercase tracking-widest transition-colors">Max Stake</button>
                                </div>
                            </div>

                            <button
                                onClick={handleSend}
                                disabled={isSending || !amount || parseFloat(amount) <= 0 || !canSign}
                                className="w-full py-7 bg-brand-gold text-slate-950 font-black rounded-[2rem] active:scale-95 shadow-glow-gold uppercase tracking-[0.4em] text-xs transition-all disabled:opacity-20"
                            >
                                Authorize Signed Dispatch
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="p-6 bg-brand-gold/5 border-t border-white/5">
                    <p className="text-[9px] text-gray-600 text-center font-black uppercase tracking-[0.2em] leading-loose">
                        Mainnet Asset Sync &bull; Secure Ed25519 Anchor &bull; Peer-to-Peer
                    </p>
                </div>
            </div>
        </div>
    );
};
