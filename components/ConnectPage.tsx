import React, { useState, useEffect } from 'react';
import { User, MemberUser, Conversation } from '../types';
import { api } from '../services/apiService';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { MemberSearchModal } from './MemberSearchModal';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { ChatHeader } from './ChatHeader';
import { CreateGroupModal } from './CreateGroupModal';
import { GroupInfoPanel } from './GroupInfoPanel';
import { useToast } from '../contexts/ToastContext';
import { UsersPlusIcon } from './icons/UsersPlusIcon';

interface ConnectPageProps {
  user: User;
  initialTarget?: Conversation | null;
  onViewProfile: (userId: string) => void;
}

export const ConnectPage: React.FC<ConnectPageProps> = ({ user, initialTarget, onViewProfile }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isGroupInfoPanelOpen, setIsGroupInfoPanelOpen] = useState(false);
  const [chatContacts, setChatContacts] = useState<User[]>([]);
  const { addToast } = useToast();

  useEffect(() => {
    if (user.role === 'member' && (user as MemberUser).status !== 'active') return;
    const unsubscribe = api.listenForConversations(
      user.id,
      (convos) => {
        setConversations(convos);
      },
      (error) => {
        console.error('Failed to listen for conversations:', error);
        addToast('Could not load conversations.', 'error');
      },
    );
    return () => unsubscribe();
  }, [user.id, user.role, (user as MemberUser).status, addToast]);
  
  useEffect(() => {
    api.getChatContacts(user).then(setChatContacts);
  }, [user]);

  useEffect(() => {
    if (initialTarget) {
      setSelectedConversation(initialTarget);
    }
  }, [initialTarget]);

  const handleSelectConversation = async (convo: Conversation) => {
    setSelectedConversation(convo);
    if (convo.isGroup) {
      if (!isGroupInfoPanelOpen || selectedConversation?.id !== convo.id) {
        setIsGroupInfoPanelOpen(false);
      }
    } else {
      setIsGroupInfoPanelOpen(false);
    }
  };

  const handleNewChatSelect = (newConversation: Conversation) => {
    // Optimistically add to the list if it's not there to prevent flicker
    if (!conversations.some(c => c.id === newConversation.id)) {
        setConversations(prev => [newConversation, ...prev]);
    }
    setSelectedConversation(newConversation);
    setIsNewChatModalOpen(false);
  };
  
  return (
    <div className="animate-fade-in">
        <MemberSearchModal 
            isOpen={isNewChatModalOpen} 
            onClose={() => setIsNewChatModalOpen(false)}
            currentUser={user}
            onSelectUser={handleNewChatSelect}
            usersForSearch={chatContacts}
        />
        <CreateGroupModal
            isOpen={isNewGroupModalOpen}
            onClose={() => setIsNewGroupModalOpen(false)}
            currentUser={user}
        />
        
        <div className="mb-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-slate-700 text-white rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 font-semibold"
            >
                <MessageSquareIcon className="h-5 w-5 mr-2" />
                New Message
            </button>
            <button
                onClick={() => setIsNewGroupModalOpen(true)}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-slate-700 text-white rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 font-semibold"
            >
                <UsersPlusIcon className="h-5 w-5 mr-2" />
                Create Group
            </button>
        </div>

        <div className="flex h-[calc(100vh-250px)] bg-slate-800 rounded-lg shadow-lg overflow-hidden">
            <aside className="w-full md:w-1/3 border-r border-slate-700 flex-shrink-0">
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
                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-4">
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