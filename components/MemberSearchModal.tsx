import React, { useState, useEffect } from 'react';
import { User, PublicUserProfile } from '../types';
import { api } from '../services/apiService';
import { XCircleIcon } from './icons/XCircleIcon';
import { SearchIcon } from './icons/SearchIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { useDebounce } from '../hooks/useDebounce';

interface MemberSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (user: PublicUserProfile) => void;
    currentUser: User;
    title?: string;
}

export const MemberSearchModal: React.FC<MemberSearchModalProps> = ({ isOpen, onClose, onSelect, currentUser, title = "Search Members" }) => {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<PublicUserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        if (debouncedSearch.length < 2) {
            setResults([]);
            return;
        }
        setIsLoading(true);
        api.searchUsers(debouncedSearch, currentUser)
            .then(setResults)
            .finally(() => setIsLoading(false));
    }, [debouncedSearch, currentUser]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative z-10 w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white uppercase tracking-widest">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <input 
                            type="text" 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            placeholder="Search by name or email..." 
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-700 outline-none focus:ring-1 focus:ring-brand-gold/30"
                            autoFocus
                        />
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-2 no-scrollbar">
                        {isLoading ? (
                            <div className="py-10 text-center"><LoaderIcon className="h-8 w-8 animate-spin text-brand-gold mx-auto opacity-40" /></div>
                        ) : results.length > 0 ? (
                            results.map(user => (
                                <button key={user.id} onClick={() => onSelect(user)} className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl border border-transparent hover:border-white/5 transition-all group">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center group-hover:bg-brand-gold/10 transition-colors"><UserCircleIcon className="h-6 w-6 text-gray-600 group-hover:text-brand-gold" /></div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-white uppercase tracking-tight">{user.name}</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{user.circle}</p>
                                    </div>
                                </button>
                            ))
                        ) : search.length > 1 ? (
                            <p className="py-10 text-center text-xs text-gray-600 uppercase tracking-widest">No members found</p>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};
