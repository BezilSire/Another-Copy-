import React, { useState, useEffect } from 'react';
import { Conversation, User } from '../types';
import { formatTimeAgo } from '../utils';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { UsersIcon } from './icons/UsersIcon';
import { api } from '../services/apiService';

interface ConversationListProps {
  conversations: Conversation[];
  currentUser: User;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string | null;
  onViewProfile: (userId: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({ conversations, currentUser, onSelectConversation, selectedConversationId, onViewProfile }) => {
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const oneOnOnePartnerIds = conversations
      .filter(c => !c.isGroup)
      .map(c => c.members.find(id => id !== currentUser.id))
      .filter((id): id is string => !!id);
    
    if (oneOnOnePartnerIds.length > 0) {
      const unsubscribe = api.listenForUsersPresence(oneOnOnePartnerIds, (statuses) => {
        setOnlineStatuses(prev => ({ ...prev, ...statuses }));
      });
      return () => unsubscribe();
    }
  }, [conversations, currentUser.id]);
  
  const getOtherMember = (convo: Conversation) => {
    if (convo.isGroup) return { name: convo.name, id: null };
    const otherMemberId = convo.members.find(id => id !== currentUser.id);
    return { 
        name: convo.memberNames[otherMemberId || ''] || 'Unknown User',
        id: otherMemberId || null
    };
  };

  return (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
            {conversations.length > 0 ? (
                <ul>
                    {conversations.map(convo => {
                        const isUnread = !convo.readBy.includes(currentUser.id) && convo.lastMessageSenderId !== currentUser.id;
                        const isSelected = convo.id === selectedConversationId;
                        const partner = getOtherMember(convo);
                        const isOnline = partner.id ? onlineStatuses[partner.id] : false;

                        return (
                        <li key={convo.id}>
                            <button
                                onClick={() => onSelectConversation(convo)}
                                className={`w-full text-left p-3 flex items-center space-x-3 transition-colors ${isSelected ? 'bg-green-600/20' : 'hover:bg-slate-700/50'}`}
                            >
                                <div className="relative flex-shrink-0">
                                    {convo.isGroup ? 
                                        <UsersIcon className="h-10 w-10 text-gray-400" /> : 
                                        <UserCircleIcon className="h-10 w-10 text-gray-400" />
                                    }
                                    {!convo.isGroup && isOnline && (
                                        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-slate-800" title="Online"></span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (partner.id) onViewProfile(partner.id);
                                            }}
                                            disabled={!partner.id || convo.isGroup}
                                            className={`font-semibold text-left truncate disabled:cursor-default ${isUnread ? 'text-white' : 'text-gray-200'} ${!convo.isGroup ? 'hover:underline' : ''}`}
                                        >
                                            {partner.name}
                                        </button>
                                        <p className={`text-xs flex-shrink-0 ${isUnread ? 'text-green-400' : 'text-gray-500'}`}>{convo.lastMessageTimestamp ? formatTimeAgo(convo.lastMessageTimestamp.toDate().toISOString()) : ''}</p>
                                    </div>
                                    <p className={`text-sm truncate ${isUnread ? 'text-gray-300 font-medium' : 'text-gray-400'}`}>{convo.lastMessage}</p>
                                </div>
                                {isUnread && <div className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0 ml-2"></div>}
                            </button>
                        </li>
                    )})}
                </ul>
            ) : (
                <div className="p-4 text-center text-gray-400">No conversations yet.</div>
            )}
        </div>
    </div>
  );
};