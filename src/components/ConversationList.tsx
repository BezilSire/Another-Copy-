
import React, { useState, useEffect } from 'react';
import { User, Conversation } from '../types';
import { api } from '../services/apiService';
import { formatTimeAgo } from '../utils';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { UsersIcon } from './icons/UsersIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';

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
    <div className="h-full flex flex-col bg-black">
       <div className="p-8 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-slate-950/50">
          <div className="flex items-center space-x-5">
            <button onClick={onBack} className="md:hidden p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white hover:bg-slate-800 transition-all"><ArrowLeftIcon className="h-5 w-5" /></button>
            <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter gold-text leading-none font-sans">Comms Node</h2>
                <p className="label-caps !text-[8px] !text-emerald-500/80 mt-1.5 font-black !tracking-[0.4em]">Handshake Protocol Active</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={onNewGroupClick} className="text-gray-400 hover:text-brand-gold p-2.5 bg-white/5 rounded-xl transition-all border border-white/5" title="Index Group"><UsersIcon className="h-4 w-4"/></button>
            <button onClick={onNewMessageClick} className="text-gray-400 hover:text-brand-gold p-2.5 bg-white/5 rounded-xl transition-all border border-white/5" title="New Dispatch"><PlusCircleIcon className="h-4 w-4" /></button>
          </div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar py-6 px-4 space-y-2">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-4">
              <LoaderIcon className="h-8 w-8 animate-spin text-brand-gold opacity-50"/>
              <span className="label-caps !text-[8px] opacity-40 font-black">Syncing Channels...</span>
          </div>
        ) : conversations.length > 0 ? (
          <ul className="space-y-2">
            {conversations.map((convo) => {
              const otherMemberId = convo.members.find(id => id !== currentUser.id);
              const otherMemberName = otherMemberId ? convo.memberNames[otherMemberId] : 'Authority Node';
              const isUnread = !convo.readBy.includes(currentUser.id);
              const isActive = selectedConversationId === convo.id;
              
              const lastMessageText = convo.lastMessageSenderId === currentUser.id 
                ? `> ${convo.lastMessage}`
                : convo.lastMessage;

              return (
                <li key={convo.id}>
                  <button
                    onClick={() => onSelectConversation(convo)}
                    className={`w-full text-left flex items-center p-5 rounded-[1.8rem] transition-all duration-500 relative group border
                        ${isActive 
                            ? 'bg-brand-gold border-brand-gold text-slate-950 shadow-glow-gold' 
                            : 'bg-slate-950 border-white/5 hover:bg-slate-900 text-gray-500 hover:text-white'}
                    `}
                  >
                    <div className="relative flex-shrink-0">
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-slate-950 border-slate-950' : 'bg-slate-900 border-white/10 group-hover:border-brand-gold/40'}`}>
                            {convo.isGroup ? <UsersIcon className={`h-6 w-6 ${isActive ? 'text-brand-gold' : 'text-gray-600 group-hover:text-brand-gold/60'}`}/> : <UserCircleIcon className={`h-8 w-8 ${isActive ? 'text-brand-gold' : 'text-gray-600 group-hover:text-brand-gold/60'}`} />}
                        </div>
                        {isUnread && (
                            <span className="absolute -top-1.5 -right-1.5 block h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-black animate-pulse shadow-glow-matrix"></span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 ml-5">
                      <div className="flex justify-between items-center mb-1">
                        <p className={`font-black uppercase tracking-tight truncate text-sm font-sans ${isActive ? 'text-slate-950' : 'text-white group-hover:text-brand-gold'}`}>{convo.isGroup ? convo.name : otherMemberName}</p>
                        <p className={`text-[9px] font-black uppercase font-mono ml-2 ${isActive ? 'text-slate-900/60' : 'text-gray-600 group-hover:text-gray-400'}`}>
                          {convo.lastMessageTimestamp ? formatTimeAgo(convo.lastMessageTimestamp.toDate().toISOString()) : ''}
                        </p>
                      </div>
                      <p className={`text-xs font-bold truncate tracking-tight ${isActive ? 'text-slate-900/80 font-black' : isUnread ? 'text-white' : 'text-gray-600'}`}>
                        {lastMessageText}
                      </p>
                    </div>
                    {!isActive && isUnread && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-brand-gold rounded-full shadow-glow-gold"></div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-24 px-8 opacity-40">
            <MessageSquareIcon className="h-16 w-16 text-gray-800 mx-auto mb-6" />
            <p className="label-caps !text-[12px] !text-gray-600 !tracking-[0.5em] font-black">Node Quiescent</p>
            <p className="text-[10px] text-gray-700 uppercase font-black mt-3 tracking-widest">No active channels indexed</p>
          </div>
        )}
      </div>
    </div>
  );
};
