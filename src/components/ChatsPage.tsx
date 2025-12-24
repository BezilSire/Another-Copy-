
import React, { useState, useEffect } from 'react';
import { User, Conversation, PublicUserProfile } from '../types';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { GroupInfoPanel } from './GroupInfoPanel';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';

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
    setIsGroupInfoOpen(false);
  };

  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col animate-fade-in">
        <div className="relative flex-1 overflow-hidden">
           <div className={`absolute top-0 left-0 w-full h-full transition-transform duration-500 ease-protocol ${selectedConvo ? '-translate-x-full' : 'translate-x-0'}`}>
            <ConversationList
              currentUser={user}
              onSelectConversation={handleSelectConvo}
              onNewMessageClick={onNewMessageClick}
              onNewGroupClick={onNewGroupClick}
              onBack={onClose}
            />
          </div>
          <div className={`absolute top-0 left-0 w-full h-full transition-transform duration-500 ease-protocol ${selectedConvo ? 'translate-x-0' : 'translate-x-full'}`}>
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
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-6" onClick={onClose}>
        <div className="module-frame bg-slate-950 w-full h-full max-w-6xl max-h-[85vh] rounded-[3rem] shadow-[0_0_150px_-30px_rgba(212,175,55,0.1)] flex overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="corner-tl"></div><div className="corner-tr"></div><div className="corner-bl"></div><div className="corner-br"></div>
            
            <div className="w-80 lg:w-96 border-r border-white/5 flex flex-col bg-black/40">
                <ConversationList
                    currentUser={user}
                    onSelectConversation={handleSelectConvo}
                    onNewMessageClick={onNewMessageClick}
                    onNewGroupClick={onNewGroupClick}
                    onBack={onClose}
                    selectedConversationId={selectedConvo?.id}
                />
            </div>
            <div className="flex-1 flex flex-col bg-slate-900/30 relative">
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
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                        <div className="w-24 h-24 bg-slate-950 rounded-[2rem] border border-white/5 flex items-center justify-center mb-8 shadow-inner">
                            <MessageSquareIcon className="h-10 w-10 text-gray-800" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter gold-text leading-none">Comms Offline</h2>
                        <p className="label-caps mt-4 !text-gray-600 !tracking-[0.4em]">Select an active node to initiate handshake</p>
                    </div>
                )}
            </div>
            {selectedConvo && selectedConvo.isGroup && isGroupInfoOpen && (
                <div className="w-80 lg:w-96 border-l border-white/5 flex flex-col animate-slide-left bg-black/40">
                   <GroupInfoPanel conversation={selectedConvo} currentUser={user} onClose={() => setIsGroupInfoOpen(false)} />
                </div>
            )}
        </div>
    </div>
  );
};
