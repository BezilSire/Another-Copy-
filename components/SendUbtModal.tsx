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
    const [showConfirmation, setShowConfirmation] = useState(false);
    const debouncedSearch = useDebounce(searchQuery, 300);
    const { addToast } = useToast();

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
            setSelectedUser(null);
            setAmount('');
            setShowConfirmation(false);
            return;
        }
    }, [isOpen]);

    useEffect(() => {
        if (debouncedSearch.length > 1 && !selectedUser) {
            setIsLoading(true);
            api.searchUsers(debouncedSearch, currentUser)
                .then(results => {
                    setSearchResults(results);
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        } else {
            setSearchResults([]);
        }
    }, [debouncedSearch, currentUser, selectedUser]);

    const handleSelectUser = (user: PublicUserProfile) => {
        setSelectedUser(user);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleInitiateSend = () => {
        const sendAmount = parseFloat(amount);
        if (isNaN(sendAmount) || sendAmount <= 0) {
            addToast("Please enter a valid amount.", "error");
            return;
        }
        if (sendAmount > (currentUser.ubtBalance || 0)) {
            addToast("Insufficient funds.", "error");
            return;
        }
        setShowConfirmation(true);
    };

    const handleFinalSend = async () => {
        if (!selectedUser) return;
        
        setIsSending(true);
        try {
            const sendAmount = parseFloat(amount);
            const timestamp = Date.now();
            const nonce = cryptoService.generateNonce();
            const payloadToSign = `${currentUser.id}:${selectedUser.id}:${sendAmount}:${timestamp}:${nonce}`;
            const signature = cryptoService.signTransaction(payloadToSign);
            const txId = Date.now().toString(36) + Math.random().toString(36).substring(2);
            
            const transaction: UbtTransaction = {
                id: txId,
                senderId: currentUser.id,
                receiverId: selectedUser.id,
                amount: sendAmount,
                timestamp: timestamp,
                nonce: nonce,
                signature: signature,
                hash: payloadToSign
            };

            await api.processUbtTransaction(transaction);
            
            addToast(`Successfully sent ${sendAmount} UBT to ${selectedUser.name}!`, "success");
            onTransactionComplete();
            onClose();
        } catch (error) {
            console.error("Send failed:", error);
            addToast(error instanceof Error ? error.message : "Transaction failed.", "error");
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen">
                <div className="fixed inset-0 bg-black bg-opacity-90 transition-opacity backdrop-blur-sm" onClick={onClose}></div>
                <div className="glass-card rounded-[2.5rem] text-left overflow-hidden shadow-glow-gold transform transition-all sm:max-w-md sm:w-full z-10 w-full mx-4 border-brand-gold/20">
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter gold-text">
                                {showConfirmation ? 'Protocol Review' : 'Send $UBT'}
                            </h3>
                            <button onClick={onClose} className="text-gray-500 hover:text-brand-gold transition-colors"><XCircleIcon className="h-8 w-8" /></button>
                        </div>

                        {!selectedUser ? (
                            <div className="space-y-6 animate-fade-in">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <SearchIcon className="h-6 w-6 text-gray-500" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search node by name..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-950/80 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50 placeholder-gray-600 transition-all font-medium"
                                        autoFocus
                                    />
                                    {isLoading && <LoaderIcon className="h-5 w-5 text-brand-gold animate-spin absolute right-4 top-1/2 -translate-y-1/2" />}
                                </div>
                                <div className="max-h-60 overflow-y-auto rounded-3xl bg-black/40 border border-white/5 no-scrollbar">
                                    {searchResults.length > 0 ? (
                                        <ul className="divide-y divide-white/5">
                                            {searchResults.map(user => (
                                                <li key={user.id}>
                                                    <button
                                                        onClick={() => handleSelectUser(user)}
                                                        className="w-full text-left flex items-center space-x-4 p-5 hover:bg-brand-gold/5 transition-all group"
                                                    >
                                                        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center group-hover:border-brand-gold/50 transition-all">
                                                            <UserCircleIcon className="h-8 w-8 text-gray-600 group-hover:text-brand-gold" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-black text-white tracking-tight">{user.name}</p>
                                                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{user.circle}</p>
                                                        </div>
                                                        <ArrowRightIcon className="h-5 w-5 text-gray-800 group-hover:text-brand-gold transition-all" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        debouncedSearch.length > 1 && !isLoading && (
                                            <p className="text-center text-gray-600 py-8 text-sm italic">No verified nodes found.</p>
                                        )
                                    )}
                                    {!debouncedSearch && <p className="text-center text-gray-700 py-10 text-[10px] uppercase tracking-[0.4em] font-black opacity-30">Pulse Scanning Node Network...</p>}
                                </div>
                            </div>
                        ) : showConfirmation ? (
                            <div className="space-y-8 animate-fade-in">
                                <div className="flex flex-col items-center py-6 bg-slate-950/80 rounded-[2.5rem] border border-brand-gold/10 relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 blur-3xl rounded-full"></div>
                                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4">Confirmed Transfer</p>
                                     <p className="text-5xl font-black text-white font-mono tracking-tighter">{amount} <span className="text-xl text-brand-gold">UBT</span></p>
                                </div>

                                <div className="space-y-4 px-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Protocol Sender</span>
                                        <span className="text-sm font-black text-white tracking-tight">{currentUser.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Protocol Receiver</span>
                                        <span className="text-sm font-black text-white tracking-tight">{selectedUser.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Security Token</span>
                                        <span className="text-[10px] font-mono text-green-500/70 select-all">{Math.random().toString(16).substring(2, 14).toUpperCase()}</span>
                                    </div>
                                </div>

                                <div className="p-5 bg-red-950/30 border border-red-900/50 rounded-3xl flex gap-4 items-start">
                                    <AlertTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                                    <p className="text-[10px] text-red-200/80 leading-relaxed uppercase font-black tracking-tight">
                                        Irreversible entry. Final authorization will sign this transaction onto the public ledger.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button
                                        onClick={handleFinalSend}
                                        disabled={isSending}
                                        className="w-full py-5 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-2xl transition-all active:scale-95 shadow-glow-gold disabled:opacity-50 uppercase tracking-[0.2em] text-xs flex justify-center items-center"
                                    >
                                        {isSending ? <LoaderIcon className="h-6 w-6 animate-spin" /> : 'Confirm & Sign Ledger'}
                                    </button>
                                    <button
                                        onClick={() => setShowConfirmation(false)}
                                        disabled={isSending}
                                        className="w-full py-2 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
                                    >
                                        Correction Protocol
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-fade-in">
                                <div className="bg-slate-950/80 p-5 rounded-[2rem] border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/5">
                                            <UserCircleIcon className="h-10 w-10 text-brand-gold/60" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-white text-lg tracking-tight truncate">{selectedUser.name}</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{selectedUser.circle}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedUser(null)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black text-gray-400 rounded-xl transition-all uppercase tracking-widest border border-white/5">Change</button>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] pl-1">Transfer Quantum</label>
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            className="block w-full bg-slate-950/80 border border-white/10 rounded-[2rem] py-6 px-8 text-white text-4xl font-black font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold/30 transition-all placeholder-gray-900"
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

                                <button
                                    onClick={handleInitiateSend}
                                    disabled={!amount || parseFloat(amount) <= 0}
                                    className="w-full py-5 bg-slate-900 border border-brand-gold/20 hover:border-brand-gold/50 text-white font-black rounded-[2rem] transition-all active:scale-95 disabled:opacity-30 uppercase tracking-[0.2em] text-xs shadow-xl"
                                >
                                    Review Protocol
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
