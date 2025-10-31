import React, { useState, useEffect } from 'react';
import { User, PublicUserProfile } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { UserCard } from './UserCard';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { SearchIcon } from './icons/SearchIcon';

interface CommunityPageProps {
  currentUser: User;
  onViewProfile: (userId: string) => void;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({ currentUser, onViewProfile }) => {
  const [users, setUsers] = useState<PublicUserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToast();
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    setIsLoading(true);
    let isMounted = true;

    const fetchUsers = async () => {
      try {
        const results = await (debouncedSearch.length > 1
          ? api.searchUsers(debouncedSearch, currentUser)
          : api.findCollaborators(currentUser));
        
        if (isMounted) {
          setUsers(results);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Could not load community members.";
        addToast(errorMessage, "error");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUsers();

    return () => { isMounted = false; };
  }, [currentUser, debouncedSearch, addToast]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Community</h1>

      <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
              type="text"
              placeholder="Search for members by name or skill..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="block w-full bg-slate-800 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48"><LoaderIcon className="h-8 w-8 animate-spin text-green-500" /></div>
      ) : users.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(user => (
            <UserCard 
              key={user.id} 
              user={user} 
              currentUser={currentUser} 
              onClick={() => onViewProfile(user.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-16 bg-slate-800 rounded-lg">
          <p className="font-semibold text-lg text-white">No members found</p>
          <p>
            {debouncedSearch.length > 1
                ? "Try refining your search."
                : "No potential collaborators found at this time. Complete your profile to get better recommendations!"}
            </p>
        </div>
      )}
    </div>
  );
};
