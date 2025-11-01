import React, { useState, useEffect } from 'react';
import { User, Conversation, PublicUserProfile } from '../types';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { GroupInfoPanel } from './GroupInfoPanel';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface ChatsPageProps {
  user: User;
  initialTarget: Conversation | null;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
  onNewMessageClick: () => void;
  onNewGroupClick: () => void;
}

export const ChatsPage: React.FC<ChatsPageProps> = ({ user, initialTarget, onClose, onViewProfile, onNewMessageClick, onNewGroupClick }) => {
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(initialTarget);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  useEffect(() => {
    setSelectedConvo(initialTarget);
  }, [initialTarget]);

  const handleSelectConvo = (convo: Conversation) => {
    setSelectedConvo(convo);
    setIsGroupInfoOpen(false); // Close info panel when switching convos
  };

  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-40 flex flex-col">
        <div className="relative flex-1 overflow-hidden">
           <div className={`absolute top-0 left-0 w-full h-full transition-transform duration-300 ease-in-out ${selectedConvo ? '-translate-x-full' : 'translate-x-0'}`}>
            <ConversationList
              currentUser={user}
              onSelectConversation={handleSelectConvo}
              onNewMessageClick={onNewMessageClick}
              onNewGroupClick={onNewGroupClick}
              onBack={onClose}
            />
          </div>
          <div className={`absolute top-0 left-0 w-full h-full transition-transform duration-300 ease-in-out ${selectedConvo ? 'translate-x-0' : 'translate-x-full'}`}>
            {selectedConvo && (
              <ChatWindow
                conversation={selectedConvo}
                currentUser={user}
                onBack={() => setSelectedConvo(null)}
                onHeaderClick={() => {
                  if (selectedConvo.isGroup) {
                    setIsGroupInfoOpen(true)
                  } else {
                    const otherMemberId = selectedConvo.members.find(id => id !== user.id);
                    if (otherMemberId) onViewProfile(otherMemberId);
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center" onClick={onClose}>
        <div className="bg-slate-800 w-full h-full max-w-4xl max-h-[80vh] rounded-lg shadow-2xl flex overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="w-1/3 border-r border-slate-700 flex flex-col">
                <ConversationList
                    currentUser={user}
                    onSelectConversation={handleSelectConvo}
                    onNewMessageClick={onNewMessageClick}
                    onNewGroupClick={onNewGroupClick}
                    onBack={onClose}
                    selectedConversationId={selectedConvo?.id}
                />
            </div>
            <div className="w-2/3 flex flex-col">
                {selectedConvo ? (
                    <ChatWindow 
                        conversation={selectedConvo} 
                        currentUser={user} 
                        onHeaderClick={() => {
                            if (selectedConvo.isGroup) {
                                setIsGroupInfoOpen(true)
                            } else {
                                const otherMemberId = selectedConvo.members.find(id => id !== user.id);
                                if (otherMemberId) onViewProfile(otherMemberId);
                            }
                        }}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                        <UserCircleIcon className="h-24 w-24 text-slate-700" />
                        <h2 className="mt-4 text-xl font-semibold text-white">Select a conversation</h2>
                        <p>Or start a new one.</p>
                    </div>
                )}
            </div>
            {selectedConvo && selectedConvo.isGroup && isGroupInfoOpen && (
                <div className="w-1/3 border-l border-slate-700 flex flex-col">
                   <GroupInfoPanel conversation={selectedConvo} currentUser={user} onClose={() => setIsGroupInfoOpen(false)} />
                </div>
            )}
        </div>
    </div>
  );
};