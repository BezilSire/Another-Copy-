import React, { useState, useEffect, useMemo } from 'react';
import { User, Conversation } from '../types';
import { api } from '../services/apiService';
import { XCircleIcon } from './icons/XCircleIcon';
import { SearchIcon } from './icons/SearchIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';

interface MemberSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSelectUser: (conversation: Conversation) => void;
  usersForSearch: User[];
}

export const MemberSearchModal: React.FC<MemberSearchModalProps> = ({ isOpen, onClose, currentUser, onSelectUser, usersForSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
        setSearchQuery(''); // Reset search on close
    }
  }, [isOpen]);
  
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return usersForSearch;
    return usersForSearch.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, usersForSearch]);

  const handleSelect = async (user: User) => {
    try {
        const newConversation = await api.startChat(currentUser.id, user.id, currentUser.name, user.name);
        onSelectUser(newConversation);
    } catch (error) {
        console.error("Failed to start chat:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-slate-800 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-white" id="modal-title">
                Start a New Conversation
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search for a member or agent..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoFocus
                />
            </div>
            <div className="mt-4 h-96 overflow-y-auto">
                {usersForSearch.length === 0 ? (
                    <p className="text-center text-gray-400 py-4">Loading users...</p>
                ) : filteredUsers.length > 0 ? (
                    <ul className="divide-y divide-slate-700">
                        {filteredUsers.map(user => (
                            <li key={user.id}>
                                <button
                                    onClick={() => handleSelect(user)}
                                    className="w-full text-left flex items-center space-x-3 p-3 hover:bg-slate-700 rounded-md transition-colors"
                                >
                                    <UserCircleIcon className="h-10 w-10 text-gray-400 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-white">{user.name}</p>
                                        <p className="text-sm text-gray-400 capitalize">
                                            {user.role} {user.circle && `• ${user.circle}`}
                                        </p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-gray-400 py-4">No users found.</p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};