
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
    const debouncedSearch = useDebounce(searchQuery, 300);
    const { addToast } = useToast();

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
            setSelectedUser(null);
            setAmount('');
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

    const handleSend = async () => {
        if (!selectedUser) {
            addToast("Recipient invalid.", "error");
            return;
        }
        
        const sendAmount = parseFloat(amount);
        if (isNaN(sendAmount) || sendAmount <= 0) {
            addToast("Please enter a valid amount.", "error");
            return;
        }

        if (sendAmount > (currentUser.ubtBalance || 0)) {
            addToast("Insufficient funds.", "error");
            return;
        }

        setIsSending(true);
        try {
            const timestamp = Date.now();
            const nonce = cryptoService.generateNonce();
            const payloadToSign = `${currentUser.id}:${selectedUser.id}:${sendAmount}:${timestamp}:${nonce}`;
            const signature = cryptoService.signTransaction(payloadToSign);
            const txId = Date.now().toString(36) + Math.random().toString(36).substring(2);
            
            // FIX: Added missing properties to UbtTransaction object
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
                parentHash: 'GENESIS_P2P',
                protocol_mode: 'MAINNET'
            };

            await api.processUbtTransaction(transaction);
            
            addToast(`Sent ${sendAmount} UBT to ${selectedUser.name}!`, "success");
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
                <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={onClose}></div>
                <div className="bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-md sm:w-full z-10 w-full mx-4">
                    <div className="p-4 sm:p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Send $UBT</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
                        </div>

                        {!selectedUser ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <SearchIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search recipient by name..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-md py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
                                        autoFocus
                                    />
                                    {isLoading && <LoaderIcon className="h-5 w-5 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
                                </div>
                                <div className="max-h-60 overflow-y-auto border border-slate-700 rounded-md bg-slate-900/50">
                                    {searchResults.length > 0 ? (
                                        <ul className="divide-y divide-slate-700">
                                            {searchResults.map(user => (
                                                <li key={user.id}>
                                                    <button
                                                        onClick={() => handleSelectUser(user)}
                                                        className="w-full text-left flex items-center space-x-3 p-3 hover:bg-slate-700 transition-colors"
                                                    >
                                                        <UserCircleIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                                                        <div>
                                                            <p className="font-medium text-white">{user.name}</p>
                                                            <p className="text-xs text-gray-400">{user.circle}</p>
                                                        </div>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        debouncedSearch.length > 1 && !isLoading && (
                                            <p className="text-center text-gray-500 py-4 text-sm">No verified users found.</p>
                                        )
                                    )}
                                    {!debouncedSearch && <p className="text-center text-gray-500 py-4 text-sm">Start typing to find a recipient.</p>}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                <div className="bg-slate-700/50 p-4 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <UserCircleIcon className="h-10 w-10 text-gray-300" />
                                        <div>
                                            <p className="font-bold text-white">{selectedUser.name}</p>
                                            <p className="text-xs text-green-400 font-mono truncate max-w-[150px]">{selectedUser.circle}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedUser(null)} className="text-sm text-gray-400 hover:text-white">Change</button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Amount to Send</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            className="block w-full bg-slate-700 border border-slate-600 rounded-md py-3 px-4 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <span className="text-gray-400 font-bold">$UBT</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between mt-2 text-xs text-gray-400">
                                        <span>Available Balance: {(currentUser.ubtBalance || 0).toFixed(2)} $UBT</span>
                                        <button onClick={() => setAmount(String(currentUser.ubtBalance || 0))} className="text-green-400 hover:text-green-300">Max</button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSend}
                                    disabled={isSending || !amount}
                                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:bg-slate-600 disabled:cursor-not-allowed flex justify-center items-center"
                                >
                                    {isSending ? <LoaderIcon className="h-5 w-5 animate-spin" /> : 'Confirm Send'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
