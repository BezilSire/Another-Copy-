import React, { useState, useEffect } from 'react';
import { User, Conversation } from '../types';
import { api } from '../services/apiService';
import { formatTimeAgo } from '../utils';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { UsersIcon } from './icons/UsersIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface ConversationListProps {
  currentUser: User;
  onSelectConversation: (conversation: Conversation) => void;
  onNewMessageClick: () => void;
  onNewGroupClick: () => void;
  onBack: () => void;
  selectedConversationId?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({ currentUser, onSelectConversation, onNewMessageClick, onNewGroupClick, onBack, selectedConversationId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = api.listenForConversations(
      currentUser.id,
      (convos) => {
        setConversations(convos);
        setIsLoading(false);
      },
      (error) => {
        console.error("Failed to listen for conversations:", error);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser.id]);

  return (
    <div className="bg-slate-800 h-full flex flex-col">
       <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <button onClick={onBack} className="md:hidden mr-2 p-1 text-gray-400 hover:text-white"><ArrowLeftIcon className="h-6 w-6" /></button>
            <h2 className="text-xl font-bold text-white">Chats</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={onNewGroupClick} className="text-gray-400 hover:text-white p-1" title="New Group Chat"><UsersIcon className="h-5 w-5"/></button>
            <button onClick={onNewMessageClick} className="text-gray-400 hover:text-white p-1" title="New Message"><PlusCircleIcon className="h-6 w-6" /></button>
          </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full"><LoaderIcon className="h-6 w-6 animate-spin"/></div>
        ) : conversations.length > 0 ? (
          <ul>
            {conversations.map((convo) => {
              const otherMemberId = convo.members.find(id => id !== currentUser.id);
              const otherMemberName = otherMemberId ? convo.memberNames[otherMemberId] : 'Unknown';
              const isUnread = !convo.readBy.includes(currentUser.id);
              
              const lastMessageText = convo.lastMessageSenderId === currentUser.id 
                ? `You: ${convo.lastMessage}`
                : convo.lastMessage;

              return (
                <li key={convo.id}>
                  <button
                    onClick={() => onSelectConversation(convo)}
                    className={`w-full text-left flex items-center p-3 space-x-3 transition-colors ${selectedConversationId === convo.id ? 'bg-slate-700' : 'hover:bg-slate-700/50'}`}
                  >
                    <div className="relative flex-shrink-0">
                        {convo.isGroup ? <UsersIcon className="h-10 w-10 text-gray-400"/> : <UserCircleIcon className="h-10 w-10 text-gray-400" />}
                        {isUnread && <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-slate-800"></span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-white truncate">{convo.isGroup ? convo.name : otherMemberName}</p>
                        <p className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatTimeAgo(convo.lastMessageTimestamp.toDate().toISOString())}</p>
                      </div>
                      <p className={`text-sm truncate ${isUnread ? 'text-white font-medium' : 'text-gray-400'}`}>
                        {lastMessageText}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center p-8 text-gray-500">
            <p>No conversations yet.</p>
            <p className="text-sm">Start a new chat to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};