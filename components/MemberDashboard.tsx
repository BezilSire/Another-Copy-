
import React, { useState, useEffect } from 'react';
import { MemberUser, Conversation, User, NotificationItem, FilterType, LedgerViewParams } from '../types';
import { MemberBottomNav } from './MemberBottomNav';
import { PostsFeed } from './PostsFeed';
import { NewPostModal } from './NewPostModal';
import { DistressCallDialog } from './DistressCallDialog';
import { FloatingActionMenu } from './FloatingActionMenu';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { MemberProfile } from './MemberProfile';
import { KnowledgeBasePage } from './KnowledgeBasePage';
import { CommunityPage } from './CommunityPage';
import { MorePage } from './MorePage';
import { VenturesPage } from './VenturesPage';
import { AIVenturePitchAssistant } from './AIVenturePitchAssistant';
import { MyInvestmentsPage } from './MyInvestmentsPage';
import { SustenancePage } from './SustenancePage';
import { NotificationsPage } from './NotificationsPage';
import { EarnPage } from './EarnPage';
import { ProjectLaunchpad } from './ProjectLaunchpad';
import { PostTypeFilter } from './PostTypeFilter';
import { VerificationHub } from './VerificationHub';
import { VerificationRedirectModal } from './VerificationRedirectModal';
import { WalletPage } from './WalletPage';
import { ChatsPage } from './ChatsPage';
import { MemberSearchModal } from './MemberSearchModal';
import { CreateGroupModal } from './CreateGroupModal';
import { LedgerPage } from './LedgerPage';
import { CommunityHubSidebar } from './CommunityHubSidebar';
import { RightSidebar } from './RightSidebar';

type MemberView = 'home' | 'ventures' | 'community' | 'more' | 'profile' | 'knowledge' | 'pitch' | 'myinvestments' | 'sustenance' | 'earn' | 'notifications' | 'launchpad' | 'wallet' | 'chats' | 'ledger';

interface MemberDashboardProps {
  user: MemberUser;
  onUpdateUser: (updatedData: Partial<User>) => Promise<void>;
  unreadCount: number;
  onLogout: () => void;
  onViewProfile: (userId: string | null) => void;
  initialLedgerTarget?: LedgerViewParams;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ user, onUpdateUser, unreadCount, onLogout, onViewProfile, initialLedgerTarget }) => {
  const [view, setView] = useState<MemberView>('home');
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [isDistressModalOpen, setIsDistressModalOpen] = useState(false);
  const [isDistressLoading, setIsDistressLoading] = useState(false);
  const { addToast } = useToast();
  const [typeFilter, setTypeFilter] = useState<FilterType>('foryou');
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);

  // FIX: Added missing handlePostCreated function to resolve reference error
  const handlePostCreated = (ccapAwarded: number) => {
    if (ccapAwarded > 0) {
      addToast(`Post created! You've been awarded ${ccapAwarded} CCAP.`, 'success');
    } else {
      addToast('Post created successfully!', 'success');
    }
    setIsNewPostModalOpen(false);
  };

  // FIX: Added missing handleSendDistress function to resolve potential reference error
  const handleSendDistress = async (content: string) => {
    setIsDistressLoading(true);
    try {
      await api.sendDistressPost(user, content);
      addToast('Distress call sent. Your circle has been notified.', 'success');
      await onUpdateUser({}); 
      setIsDistressModalOpen(false);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to send distress call.', 'error');
    } finally {
      setIsDistressLoading(false);
    }
  };

  const renderMainContent = () => {
    switch (view) {
      case 'home':
        return (
            <div className="space-y-8 animate-slide-up">
              {user.status !== 'active' && (
                <VerificationHub 
                  onGetVerifiedClick={() => setIsVerificationModalOpen(true)}
                  onLearnMoreClick={() => setView('knowledge')}
                />
              )}
              <div className="md:hidden">
                 <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} />
              </div>
              <PostsFeed user={user} onViewProfile={onViewProfile as (userId: string) => void} typeFilter={typeFilter} />
            </div>
          );
      case 'wallet': return <WalletPage user={user} />;
      case 'profile': return <MemberProfile currentUser={user} onUpdateUser={onUpdateUser} onViewProfile={onViewProfile as (userId: string) => void} onGetVerifiedClick={() => setIsVerificationModalOpen(true)} />;
      case 'earn': return <EarnPage user={user} onUpdateUser={onUpdateUser} onNavigateToRedemption={() => setView('home')} onNavigateToInvestments={() => setView('myinvestments')} />;
      case 'ventures': return <VenturesPage currentUser={user} onViewProfile={onViewProfile as (userId: string) => void} onNavigateToPitchAssistant={() => setView('pitch')} />;
      case 'chats': return <ChatsPage user={user} initialTarget={selectedChat} onClose={() => setView('home')} onViewProfile={onViewProfile as (userId: string) => void} onNewMessageClick={() => {}} onNewGroupClick={() => {}} />;
      default: return <div className="text-center py-20 text-gray-500">Connecting to {view} module...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-brand-navy pb-24 md:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-8">
            
            <div className="hidden md:block md:col-span-3">
                <div className="sticky top-24">
                    <CommunityHubSidebar 
                        activeView={view} 
                        onChangeView={setView} 
                        user={user} 
                        currentFilter={typeFilter}
                        onFilterChange={setTypeFilter}
                    />
                </div>
            </div>

            <div className="col-span-1 md:col-span-9 lg:col-span-6">
                <div className="min-h-[85vh]">
                     {renderMainContent()}
                </div>
            </div>

            <div className="hidden lg:block lg:col-span-3">
                <div className="sticky top-24">
                    <RightSidebar user={user} />
                </div>
            </div>
        </div>
      </div>

      <div className="md:hidden">
         <MemberBottomNav activeView={view as any} setActiveView={setView as any} unreadNotificationCount={unreadCount} />
      </div>

      <FloatingActionMenu
        onNewPostClick={() => setIsNewPostModalOpen(true)}
        onDistressClick={() => setIsDistressModalOpen(true)}
        user={user}
      />
      
      {isNewPostModalOpen && (
        <NewPostModal
          isOpen={isNewPostModalOpen}
          onClose={() => setIsNewPostModalOpen(false)}
          user={user}
          onPostCreated={handlePostCreated}
        />
      )}

      {/* FIX: Added DistressCallDialog component to the return to handle distress call submissions */}
      {isDistressModalOpen && (
        <DistressCallDialog
          isOpen={isDistressModalOpen}
          onClose={() => setIsDistressModalOpen(false)}
          onConfirm={handleSendDistress}
          isLoading={isDistressLoading}
        />
      )}

      <VerificationRedirectModal 
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
      />
    </div>
  );
};
