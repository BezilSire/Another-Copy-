import React, { useState, useEffect } from 'react';
import { Conversation, User, MemberUser, PublicUserProfile } from '../types';
import { api } from '../services/apiService';
import { XCircleIcon } from './icons/XCircleIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { UsersPlusIcon } from './icons/UsersPlusIcon';
import { DoorOpenIcon } from './icons/DoorOpenIcon';
import { useDebounce } from '../hooks/useDebounce';
import { SearchIcon } from './icons/SearchIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { useToast } from '../contexts/ToastContext';

interface GroupInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentUser: User;
  onViewProfile: (userId: string) => void;
}

export const GroupInfoPanel: React.FC<GroupInfoPanelProps> = ({ isOpen, onClose, conversation, currentUser, onViewProfile }) => {
  const [members, setMembers] = useState<MemberUser[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [potentialMembers, setPotentialMembers] = useState<PublicUserProfile[]>([]);
  const [membersToAdd, setMembersToAdd] = useState<PublicUserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen && Array.isArray(conversation.members)) {
      api.getGroupMembers(conversation.members).then(setMembers);
    }
  }, [isOpen, conversation]);
  
  useEffect(() => {
      if (isAddingMembers && debouncedSearch.length > 1) {
          setIsLoadingSearch(true);
          api.searchUsers(debouncedSearch, currentUser)
              .then(all => {
                  const currentMemberIds = new Set(conversation.members);
                  setPotentialMembers(all.filter(m => !currentMemberIds.has(m.id)));
              })
              .catch(() => addToast("Could not search for members.", "error"))
              .finally(() => setIsLoadingSearch(false));
      } else {
          setPotentialMembers([]);
      }
  }, [isAddingMembers, debouncedSearch, conversation, currentUser, addToast]);
  
  const handleAddMembers = async () => {
    if (membersToAdd.length === 0) {
        setIsAddingMembers(false);
        return;
    }
    const newMemberIds = [...conversation.members, ...membersToAdd.map(m => m.id)];
    const newMemberNames = { ...conversation.memberNames };
    membersToAdd.forEach(m => { newMemberNames[m.id] = m.name });

    await api.updateGroupMembers(conversation.id, newMemberIds, newMemberNames);
    setIsAddingMembers(false);
    setMembersToAdd([]);
  };

  const handleLeaveGroup = async () => {
    if (window.confirm("Are you sure you want to leave this group?")) {
        await api.leaveGroup(conversation.id, currentUser.id);
        onClose(); // This should also trigger a view change in parent
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-full md:w-1/3 border-l border-slate-700 flex flex-col transition-transform transform absolute top-0 right-0 h-full bg-slate-800 md:relative z-20">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">{isAddingMembers ? "Add Members" : "Group Info"}</h3>
            <button onClick={isAddingMembers ? () => setIsAddingMembers(false) : onClose} className="p-1 text-gray-400 hover:text-white rounded-full"><XCircleIcon className="h-6 w-6" /></button>
        </div>
        {!isAddingMembers ? (
            <div className="flex-1 p-4 overflow-y-auto">
                <h4 className="font-semibold text-gray-300 mb-2">{members.length} Members</h4>
                <ul>
                    {members.map(m => (
                        <li key={m.id}>
                            <button 
                                onClick={() => onViewProfile(m.id)}
                                disabled={m.id === currentUser.id}
                                className="w-full text-left flex items-center space-x-3 p-2 rounded-md hover:bg-slate-700/50 disabled:cursor-default disabled:hover:bg-transparent"
                            >
                                <UserCircleIcon className="h-8 w-8 text-gray-400"/>
                                <span>{m.name} {m.id === currentUser.id && '(You)'}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        ) : (
            <div className="flex-1 p-4 overflow-y-auto flex flex-col">
                <div className="relative mb-2">
                    <input type="text" placeholder="Search members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-10 pr-4 text-white" />
                    <SearchIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    {isLoadingSearch && <LoaderIcon className="h-5 w-5 animate-spin text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />}
                </div>
                <ul className="flex-1 overflow-y-auto">
                    {potentialMembers.map(m => (
                        <li key={m.id}>
                            <label className="flex items-center space-x-3 p-2 hover:bg-slate-700 cursor-pointer">
                                <input type="checkbox" onChange={() => setMembersToAdd(prev => prev.some(pm => pm.id === m.id) ? prev.filter(pm => pm.id !== m.id) : [...prev, m])} checked={membersToAdd.some(pm => pm.id === m.id)} className="text-green-600 bg-slate-900 border-slate-600 focus:ring-green-500" />
                                <UserCircleIcon className="h-8 w-8 text-gray-400" />
                                <span>{m.name}</span>
                            </label>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        <div className="p-4 border-t border-slate-700 space-y-2">
            {!isAddingMembers ? (
                <>
                    <button onClick={() => setIsAddingMembers(true)} className="w-full flex items-center justify-center space-x-2 p-2 bg-slate-700 hover:bg-slate-600 rounded-md"><UsersPlusIcon className="h-5 w-5"/><span>Add Members</span></button>
                    <button onClick={handleLeaveGroup} className="w-full flex items-center justify-center space-x-2 p-2 text-red-400 hover:bg-red-900/50 rounded-md"><DoorOpenIcon className="h-5 w-5"/><span>Leave Group</span></button>
                </>
            ) : (
                 <button onClick={handleAddMembers} disabled={membersToAdd.length === 0} className="w-full p-2 bg-green-600 hover:bg-green-700 rounded-md disabled:bg-slate-600">Add Selected Members</button>
            )}
        </div>
    </aside>
  );
};