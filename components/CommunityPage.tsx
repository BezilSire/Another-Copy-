import React, { useState, useEffect, useMemo } from 'react';
import { User, PublicUserProfile } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { SearchIcon } from './icons/SearchIcon';
import { useDebounce } from '../hooks/useDebounce';
import { UserCard } from './UserCard';

interface CommunityPageProps {
  currentUser: User;
  onViewProfile: (userId: string | null) => void;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({ currentUser, onViewProfile }) => {
  const [members, setMembers] = useState<PublicUserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { addToast } = useToast();

  const filteredMembers = useMemo(() => {
    if (!debouncedSearch) return members;
    return members.filter(member =>
      member.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      member.circle.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      member.profession?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [members, debouncedSearch]);

  useEffect(() => {
    setIsLoading(true);
    api.getSearchableUsers(currentUser)
      .then((users) => {
        setMembers(users);
      })
      .catch(() => addToast("Could not load community members.", "error"))
      .finally(() => setIsLoading(false));
  }, [currentUser, addToast]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search members by name, circle, or profession..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48"><LoaderIcon className="h-8 w-8 animate-spin text-green-500" /></div>
      ) : filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMembers.map((user) => (
            <UserCard key={user.id} user={user} currentUser={currentUser} onClick={() => onViewProfile(user.id)} />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-16 bg-slate-800 rounded-lg">
          <p className="font-semibold text-lg text-white">No members found</p>
          <p>Try adjusting your search query.</p>
        </div>
      )}
    </div>
  );
};