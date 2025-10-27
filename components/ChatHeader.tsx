import React from 'react';
import { Conversation, User } from '../types';
import { SettingsIcon } from './icons/SettingsIcon';
import { UsersIcon } from './icons/UsersIcon';

interface ChatHeaderProps {
  conversation: Conversation;
  currentUser: User;
  onShowInfo: () => void;
  onViewProfile: (userId: string) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ conversation, currentUser, onShowInfo, onViewProfile }) => {
  const getChatPartner = () => {
    if (conversation.isGroup) {
      return { name: conversation.name, id: null };
    }
    const otherMemberId = conversation.members.find(id => id !== currentUser.id);
    return {
        name: conversation.memberNames[otherMemberId || ''] || 'Chat',
        id: otherMemberId || null
    };
  };

  const chatPartner = getChatPartner();

  return (
    <div className="p-3 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
      <div className="flex items-center space-x-3">
          {conversation.isGroup && <div className="p-2 bg-slate-700 rounded-full"><UsersIcon className="h-5 w-5 text-gray-300"/></div>}
           <button 
                onClick={() => chatPartner.id && onViewProfile(chatPartner.id)}
                disabled={!chatPartner.id}
                className={`text-lg font-bold text-white ${chatPartner.id ? 'hover:underline' : 'cursor-default'}`}
            >
                {chatPartner.name}
            </button>
      </div>
      {conversation.isGroup && (
        <button onClick={onShowInfo} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-slate-700">
            <SettingsIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};