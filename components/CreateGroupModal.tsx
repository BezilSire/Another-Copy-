import React, { useState, useEffect, useMemo } from 'react';
import { User, PublicUserProfile } from '../types';
import { api } from '../services/apiService';
import { XCircleIcon } from './icons/XCircleIcon';
import { SearchIcon } from './icons/SearchIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { useDebounce } from '../hooks/useDebounce';
import { LoaderIcon } from './icons/LoaderIcon';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [searchResults, setSearchResults] = useState<PublicUserProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<PublicUserProfile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (isOpen && debouncedSearch.length > 1) {
        setIsLoading(true);
        api.searchUsers(debouncedSearch, currentUser)
            .then(users => {
                // Filter out already selected members from new search results
                const selectedIds = new Set(selectedMembers.map(m => m.id));
                setSearchResults(users.filter(u => !selectedIds.has(u.id)));
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    } else {
        setSearchResults([]);
    }
  }, [isOpen, debouncedSearch, currentUser, selectedMembers]);
  
  const toggleMember = (member: PublicUserProfile) => {
    if (selectedMembers.some(sm => sm.id === member.id)) {
        setSelectedMembers(prev => prev.filter(sm => sm.id !== member.id));
    } else {
        setSelectedMembers(prev => [...prev, member]);
        setSearchQuery(''); // Clear search after selecting
        setSearchResults([]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;

    try {
        const memberIds = [currentUser.id, ...selectedMembers.map(m => m.id)];
        const memberNames = selectedMembers.reduce((acc, member) => {
            acc[member.id] = member.name;
            return acc;
        }, {} as {[key: string]: string});
        memberNames[currentUser.id] = currentUser.name;

        await api.createGroupChat(groupName, memberIds, memberNames);
        onClose();
    } catch (error) {
        console.error("Failed to create group", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black bg-opacity-75" onClick={onClose}></div>
        <div className="bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full z-10">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Create Group Chat</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
            </div>
            <input type="text" placeholder="Group Name" value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-4 text-white mb-2" />
            
            {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-slate-900/50 rounded-md mb-2">
                    {selectedMembers.map(member => (
                        <div key={member.id} className="flex items-center gap-2 bg-slate-700 px-2 py-1 rounded-full text-sm">
                            <span>{member.name}</span>
                            <button onClick={() => toggleMember(member)} className="text-gray-400 hover:text-white"><XCircleIcon className="h-4 w-4" /></button>
                        </div>
                    ))}
                </div>
            )}

            <div className="relative mb-2">
                <input type="text" placeholder="Search members to add..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-10 pr-4 text-white" />
                <SearchIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                {isLoading && <LoaderIcon className="h-5 w-5 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
            </div>
            <div className="h-48 overflow-y-auto border border-slate-700 rounded-md">
                {searchResults.length > 0 ? (
                    <ul>
                        {searchResults.map(member => (
                            <li key={member.id}>
                                <button onClick={() => toggleMember(member)} className="w-full flex items-center space-x-3 p-2 hover:bg-slate-700">
                                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                                    <span>{member.name}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    debouncedSearch.length > 1 && !isLoading && <p className="text-center text-gray-400 p-4">No results found.</p>
                )}
            </div>
          </div>
          <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedMembers.length === 0} className="w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-600">Create Group</button>
            <button onClick={onClose} className="mt-3 sm:mt-0 sm:mr-3 w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-slate-700 text-gray-300 hover:bg-slate-600">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};
