import React, { useState, useEffect } from 'react';
import { Conversation, User, MemberUser } from '../types';
import { api } from '../services/apiService';
import { XCircleIcon } from './icons/XCircleIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { UsersPlusIcon } from './icons/UsersPlusIcon';
import { DoorOpenIcon } from './icons/DoorOpenIcon';

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
  const [potentialMembers, setPotentialMembers] = useState<User[]>([]);
  const [membersToAdd, setMembersToAdd] = useState<User[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.getGroupMembers(conversation.members).then(setMembers);
      if (isAddingMembers) {
          api.getChatContacts(currentUser, true).then(all => {
              const currentMemberIds = new Set(conversation.members);
              setPotentialMembers(all.filter(m => !currentMemberIds.has(m.id)));
          });
      }
    }
  }, [isOpen, isAddingMembers, conversation.members, currentUser]);
  
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
            <div className="flex-1 p-4 overflow-y-auto">
                {/* A simple search could go here */}
                <ul>
                    {potentialMembers.map(m => (
                        <li key={m.id}>
                            <label className="flex items-center space-x-3 p-2 hover:bg-slate-700 cursor-pointer">
                                <input type="checkbox" onChange={() => setMembersToAdd(prev => prev.some(pm => pm.id === m.id) ? prev.filter(pm => pm.id !== m.id) : [...prev, m])} className="text-green-600 bg-slate-900 border-slate-600 focus:ring-green-500" />
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
                 <button onClick={handleAddMembers} className="w-full p-2 bg-green-600 hover:bg-green-700 rounded-md">Confirm Add</button>
            )}
        </div>
    </aside>
  );
};