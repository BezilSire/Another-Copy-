import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User } from '../types';
import { api } from '../services/apiService';
import { SearchIcon } from './icons/SearchIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface GlobalSearchProps {
  onProfileSelect: (userId: string) => void;
  currentUser: User;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onProfileSelect, currentUser }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch all searchable users once when the component mounts.
    api.getSearchableUsers(currentUser).then(users => {
      // The API service now handles filtering out the current user.
      setAllUsers(users);
    }).catch(error => {
      console.error("Failed to load users for search:", error);
    });
  }, [currentUser]); // Depend on the whole currentUser to refetch on follow/unfollow

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    
    // Simple client-side search
    const lowerCaseQuery = query.toLowerCase();
    const filteredResults = allUsers.filter(user =>
      user.name.toLowerCase().includes(lowerCaseQuery)
    ).slice(0, 10); // Limit to 10 results
    
    setResults(filteredResults);

  }, [query, allUsers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (userId: string) => {
    onProfileSelect(userId);
    setQuery('');
    setResults([]);
    setIsFocused(false);
  };
  
  const showResults = isFocused && query.length > 0;

  return (
    <div className="relative w-full max-w-xs" ref={searchContainerRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search for members..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="block w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-10 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-white">
                <XCircleIcon className="h-5 w-5"/>
            </button>
          </div>
        )}
      </div>

      {showResults && (
        <div className="absolute mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            <ul>
              {results.map(user => (
                <li key={user.id}>
                  <button
                    onClick={() => handleSelect(user.id)}
                    className="w-full text-left flex items-center space-x-3 p-3 hover:bg-slate-700 transition-colors"
                  >
                    <UserCircleIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-white text-sm">{user.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{user.role} &bull; {user.circle}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-gray-400">
              No users found matching "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};