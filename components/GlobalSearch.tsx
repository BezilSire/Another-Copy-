import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SearchIcon } from './icons/SearchIcon';
import { api } from '../services/apiService';
import { PublicUserProfile, User } from '../types';
import { LoaderIcon } from './icons/LoaderIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { useAuth } from '../contexts/AuthContext';


export const GlobalSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PublicUserProfile[]>([]);
    const [allUsers, setAllUsers] = useState<PublicUserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const { currentUser } = useAuth();

    useEffect(() => {
        if (!currentUser) return;
        setIsLoading(true);
        api.getSearchableUsers(currentUser).then(users => {
            setAllUsers(users);
        }).catch(err => {
            console.error("Failed to load users for search:", err);
        }).finally(() => {
            setIsLoading(false);
        });
    }, [currentUser]);

    useEffect(() => {
        if (query.length > 1) {
            const lowerCaseQuery = query.toLowerCase();
            const filtered = allUsers.filter(u => 
                u.name.toLowerCase().includes(lowerCaseQuery) ||
                u.circle.toLowerCase().includes(lowerCaseQuery) ||
                u.profession?.toLowerCase().includes(lowerCaseQuery)
            );
            setResults(filtered);
        } else {
            setResults([]);
        }
    }, [query, allUsers]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                    {results.length === 0 && !isLoading ? (
                         <div className="p-4 text-center text-sm text-gray-400">No members found for "{query}"</div>
                    ) : (
                        <ul>
                            {results.map(user => (
                                <li key={`user-${user.id}`}>
                                    {/* In a real app, this would navigate to the user's profile */}
                                    <a href="#" onClick={(e) => { e.preventDefault(); /* onViewProfile(user.id); */ }} className="flex items-center space-x-3 p-3 hover:bg-slate-700">
                                        <UserCircleIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                                        <div>
                                            <p className="font-medium text-white">{user.name}</p>
                                            <p className="text-sm text-gray-400 capitalize">{user.role} &bull; {user.circle}</p>
                                        </div>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};