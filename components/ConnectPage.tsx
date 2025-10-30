import React, { useState, useEffect } from 'react';
import { User, MemberUser, Conversation } from '../types';
import { api } from '../services/apiService';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { ChatHeader } from './ChatHeader';
import { GroupInfoPanel } from './GroupInfoPanel';
import { useToast } from '../contexts/ToastContext';
import { UsersPlusIcon } from './icons/UsersPlusIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface ConnectPageProps {
  user: User;
  initialTarget?: Conversation | null;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
  onNewMessageClick: () => void;
  onNewGroupClick: () => void;
}

export const ConnectPage: React.FC<ConnectPageProps> = ({ user, initialTarget, onClose, onViewProfile, onNewMessageClick, onNewGroupClick }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isGroupInfoPanelOpen, setIsGroupInfoPanelOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (user.role === 'member' && (user as MemberUser).status !== 'active') return;
    const unsubscribe = api.listenForConversations(
      user,
      (convos) => setConversations(convos),
      (error) => {
        console.error('Failed to listen for conversations:', error);
        addToast('Could not load conversations. This may be due to a permissions issue.', 'error');
      },
    );
    return () => unsubscribe();
  }, [user, addToast]);

  useEffect(() => {
    if (initialTarget) {
      setSelectedConversation(initialTarget);
    }
  }, [initialTarget]);

  const handleSelectConversation = (convo: Conversation) => {
    setSelectedConversation(convo);
    if (convo.isGroup) {
      if (!isGroupInfoPanelOpen || selectedConversation?.id !== convo.id) {
        setIsGroupInfoPanelOpen(false);
      }
    } else {
      setIsGroupInfoPanelOpen(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-40 bg-slate-900 flex flex-col animate-fade-in">
        {/* Full Screen Header */}
        <div className="flex-shrink-0 flex items-center p-3 border-b border-slate-700 h-16">
            <button onClick={onClose} className="p-2 text-gray-300 hover:text-white hover:bg-slate-700 rounded-full">
                <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h2 className="text-xl font-bold text-white ml-4">Connect</h2>
            <div className="ml-auto flex items-center space-x-2">
                 <button
                    onClick={onNewMessageClick}
                    className="p-2 text-gray-300 hover:text-white hover:bg-slate-700 rounded-full"
                    title="New Message"
                >
                    <MessageSquareIcon className="h-6 w-6" />
                </button>
                 <button
                    onClick={onNewGroupClick}
                    className="p-2 text-gray-300 hover:text-white hover:bg-slate-700 rounded-full"
                    title="Create Group"
                >
                    <UsersPlusIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
            <aside className="w-full md:w-2/5 lg:w-1/3 border-r border-slate-700 flex-shrink-0">
                <ConversationList
                conversations={conversations}
                currentUser={user}
                onSelectConversation={handleSelectConversation}
                selectedConversationId={selectedConversation?.id}
                onViewProfile={onViewProfile}
                />
            </aside>
            <main className="flex-1 flex flex-col">
                {selectedConversation ? (
                    <>
                        <ChatHeader 
                            conversation={selectedConversation} 
                            currentUser={user} 
                            onShowInfo={() => setIsGroupInfoPanelOpen(p => !p)} 
                            onViewProfile={onViewProfile}
                        />
                        <div className="flex flex-1 overflow-hidden">
                            <ChatWindow conversation={selectedConversation} currentUser={user} />
                            {selectedConversation.isGroup && isGroupInfoPanelOpen && (
                                <GroupInfoPanel
                                    isOpen={isGroupInfoPanelOpen}
                                    onClose={() => setIsGroupInfoPanelOpen(false)}
                                    conversation={selectedConversation}
                                    currentUser={user}
                                    onViewProfile={onViewProfile}
                                />
                            )}
                        </div>
                    </>
                ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center text-gray-400 p-4">
                    <MessageSquareIcon className="h-16 w-16 mb-4 text-slate-600" />
                    <h3 className="text-xl font-semibold text-white">Select a conversation</h3>
                    <p>Or start a new one to connect with other members.</p>
                </div>
                )}
            </main>
        </div>
    </div>
  );
};