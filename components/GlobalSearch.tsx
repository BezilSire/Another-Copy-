import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SearchIcon } from './icons/SearchIcon';
import { api } from '../services/apiService';
import { PublicUserProfile, User } from '../types';
import { LoaderIcon } from './icons/LoaderIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';

interface GlobalSearchProps {
  onViewProfile: (userId: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onViewProfile }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PublicUserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const { currentUser } = useAuth();
    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        if (debouncedQuery.length > 1 && currentUser) {
            setIsLoading(true);
            api.searchUsers(debouncedQuery, currentUser)
                .then(setResults)
                .catch(err => console.error("Search failed:", err))
                .finally(() => setIsLoading(false));
        } else {
            setResults([]);
        }
    }, [debouncedQuery, currentUser]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleSelect = (userId: string) => {
        onViewProfile(userId);
        // Reset state after selection for a cleaner UI
        setQuery('');
        setResults([]);
        setIsFocused(false);
    };

    const showResults = isFocused && query.length > 0;

    return (
        <div ref={searchRef} className="relative w-full max-w-lg mx-auto">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="search"
                    placeholder="Search for members..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    className="block w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                 {isLoading && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <LoaderIcon className="h-5 w-5 text-gray-400 animate-spin" />
                    </div>
                )}
            </div>

            {showResults && (
                <div className="absolute mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
                    {results.length === 0 && !isLoading && debouncedQuery.length > 1 ? (
                         <div className="p-4 text-center text-sm text-gray-400">No members found for "{query}"</div>
                    ) : (
                        <ul>
                            {results.map(user => (
                                <li key={`user-${user.id}`}>
                                    <button onClick={() => handleSelect(user.id)} className="w-full text-left flex items-center space-x-3 p-3 hover:bg-slate-700">
                                        <UserCircleIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                                        <div>
                                            <p className="font-medium text-white">{user.name}</p>
                                            <p className="text-sm text-gray-400 capitalize">{user.role} &bull; {user.circle}</p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};