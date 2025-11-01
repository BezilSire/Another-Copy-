import React, { useState, useEffect } from 'react';
import { User, Conversation, MemberUser } from '../types';
import { api } from '../services/apiService';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { UsersIcon } from './icons/UsersIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { DoorOpenIcon } from './icons/DoorOpenIcon';
import { UsersPlusIcon } from './icons/UsersPlusIcon';
import { MemberSearchModal } from './MemberSearchModal'; // Re-use for adding members

interface GroupInfoPanelProps {
  conversation: Conversation;
  currentUser: User;
  onClose: () => void;
}

export const GroupInfoPanel: React.FC<GroupInfoPanelProps> = ({ conversation, currentUser, onClose }) => {
    const [members, setMembers] = useState<MemberUser[]>([]);
    const [isAddingMembers, setIsAddingMembers] = useState(false);
    
    useEffect(() => {
        api.getGroupMembers(conversation.members).then(setMembers);
    }, [conversation.members]);

    const handleAddMembers = async (newMember: MemberUser) => {
        // This is simplified for the modal. A real implementation would handle multiple selections.
        const newMemberIds = [...conversation.members, newMember.id];
        const newMemberNames = { ...conversation.memberNames, [newMember.id]: newMember.name };
        
        await api.updateGroupMembers(conversation.id, newMemberIds, newMemberNames);
        setIsAddingMembers(false);
    };

    const handleLeaveGroup = async () => {
        if (window.confirm("Are you sure you want to leave this group?")) {
            await api.leaveGroup(conversation.id, currentUser.id);
            onClose(); // Close the panel after leaving
        }
    };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {isAddingMembers && (
          <MemberSearchModal
            isOpen={isAddingMembers}
            onClose={() => setIsAddingMembers(false)}
            currentUser={currentUser}
            onSelectUser={() => { /* Simplified */ }}
          />
      )}
      <div className="p-4 border-b border-slate-700 flex items-center space-x-3">
        <button onClick={onClose} className="p-1"><ArrowLeftIcon className="h-6 w-6" /></button>
        <h3 className="text-xl font-bold">Group Info</h3>
      </div>
      <div className="p-4 flex flex-col items-center">
        <UsersIcon className="h-24 w-24 text-gray-500 bg-slate-800 p-4 rounded-full" />
        <h2 className="mt-4 text-2xl font-bold">{conversation.name}</h2>
        <p className="text-sm text-gray-400">{conversation.members.length} members</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">Members</h4>
        <ul>
          {members.map(member => (
            <li key={member.id} className="flex items-center p-2 rounded-lg hover:bg-slate-800">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <span className="ml-3">{member.name}</span>
            </li>
          ))}
        </ul>
      </div>
       <div className="p-4 border-t border-slate-700 space-y-2">
            <button onClick={() => setIsAddingMembers(true)} className="w-full flex items-center p-3 rounded-lg hover:bg-slate-800 text-green-400">
                <UsersPlusIcon className="h-5 w-5 mr-3" /> Add Members
            </button>
            <button onClick={handleLeaveGroup} className="w-full flex items-center p-3 rounded-lg hover:bg-slate-800 text-red-400">
                <DoorOpenIcon className="h-5 w-5 mr-3" /> Leave Group
            </button>
        </div>
    </div>
  );
};