
import React, { useState, useEffect } from 'react';
import { MemberUser, Conversation, User, NotificationItem, FilterType } from '../types';
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
import { MarkdownRenderer } from './MarkdownRenderer';
import { formatTimeAgo } from '../utils';
import { PostTypeFilter } from './PostTypeFilter';
import { VerificationHub } from './VerificationHub';
import { VerificationRedirectModal } from './VerificationRedirectModal';
import { WalletPage } from './WalletPage';
import { ChatsPage } from './ChatsPage';
import { MemberSearchModal } from './MemberSearchModal';
import { CreateGroupModal } from './CreateGroupModal';

type MemberView = 'home' | 'ventures' | 'community' | 'more' | 'profile' | 'knowledge' | 'pitch' | 'myinvestments' | 'sustenance' | 'earn' | 'notifications' | 'launchpad' | 'wallet' | 'chats';

interface MemberDashboardProps {
  user: MemberUser;
  onUpdateUser: (updatedData: Partial<User>) => Promise<void>;
  unreadCount: number;
  onLogout: () => void;
  onViewProfile: (userId: string | null) => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ user, onUpdateUser, unreadCount, onLogout, onViewProfile }) => {
  const [view, setView] = useState<MemberView>('home');
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [isDistressModalOpen, setIsDistressModalOpen] = useState(false);
  const [isDistressLoading, setIsDistressLoading] = useState(false);
  const { addToast } = useToast();
  const [typeFilter, setTypeFilter] = useState<FilterType>('foryou');
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  
  // Chat state for internal dashboard view
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);

  const handlePostCreated = (ccapAwarded: number) => {
    if (ccapAwarded > 0) {
      addToast(`Post created! You've been awarded ${ccapAwarded} CCAP.`, 'success');
    } else {
      addToast('Post created successfully!', 'success');
    }
    setIsNewPostModalOpen(false);
  };
  
  const handleSendDistress = async (content: string) => {
    setIsDistressLoading(true);
    try {
      await api.sendDistressPost(user, content);
      addToast('Distress call sent. Your circle has been notified.', 'success');
      await onUpdateUser({}); // Trigger user refresh to update distress call count
      setIsDistressModalOpen(false);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to send distress call.', 'error');
    } finally {
      setIsDistressLoading(false);
    }
  };
  
  const handleNav = (newView: MemberView) => setView(newView);

  const handleNotificationNavigate = (item: NotificationItem) => {
    if (item.type === 'NEW_CHAT' || item.type === 'NEW_MESSAGE') {
      setView('chats');
    } else if (item.link) {
      onViewProfile(item.link);
    }
  };

  const handleNewChatSelect = (newConversation: Conversation) => {
    setSelectedChat(newConversation);
    setIsNewChatModalOpen(false);
  };

  const renderContent = () => {
    switch (view) {
      case 'home':
        return (
            <>
              {user.status !== 'active' && (
                <VerificationHub 
                  onGetVerifiedClick={() => setIsVerificationModalOpen(true)}
                  onLearnMoreClick={() => setView('knowledge')}
                />
              )}
              <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} />
              <PostsFeed user={user} onViewProfile={onViewProfile as (userId: string) => void} typeFilter={typeFilter} />
            </>
          );
      case 'chats':
        return (
            <ChatsPage
              user={user}
              initialTarget={selectedChat}
              onClose={() => {
                  setSelectedChat(null);
                  setView('home');
              }}
              onViewProfile={onViewProfile as (userId: string) => void}
              onNewMessageClick={() => setIsNewChatModalOpen(true)}
              onNewGroupClick={() => setIsNewGroupModalOpen(true)}
            />
        );
      case 'wallet':
        return <WalletPage user={user} />;
      case 'ventures':
        return <VenturesPage currentUser={user} onViewProfile={onViewProfile as (userId: string) => void} onNavigateToPitchAssistant={() => setView('pitch')} />;
      case 'pitch':
        return <AIVenturePitchAssistant user={user} onUpdateUser={onUpdateUser} onBack={() => setView('ventures')} />;
      case 'community':
        return <CommunityPage currentUser={user} onViewProfile={onViewProfile as (userId: string) => void} />;
      case 'more':
        return <MorePage user={user} onNavigate={handleNav} onLogout={onLogout} notificationCount={unreadCount} />;
      case 'profile':
        return <MemberProfile currentUser={user} onUpdateUser={onUpdateUser} onViewProfile={onViewProfile as (userId: string) => void} onGetVerifiedClick={() => setIsVerificationModalOpen(true)} />;
      case 'knowledge':
        return <KnowledgeBasePage currentUser={user} onUpdateUser={onUpdateUser} />;
      case 'myinvestments':
        return <MyInvestmentsPage user={user} onViewProfile={onViewProfile as (userId: string) => void} onNavigateToMarketplace={() => setView('ventures')} />;
      case 'sustenance':
        return <SustenancePage user={user} />;
      case 'earn':
        return <EarnPage user={user} onUpdateUser={onUpdateUser} onNavigateToRedemption={() => setView('home')} onNavigateToInvestments={() => setView('myinvestments')} />;
       case 'notifications':
        return <NotificationsPage user={user} onNavigate={handleNotificationNavigate} onViewProfile={onViewProfile as (userId: string) => void} />;
      case 'launchpad':
        return <ProjectLaunchpad />;
      default:
        return (
            <>
              <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} />
              <PostsFeed user={user} onViewProfile={onViewProfile as (userId: string) => void} typeFilter={typeFilter} />
            </>
        );
    }
  };

  return (
    <>
      <div className="pb-24"> 
        {renderContent()}
      </div>
      <MemberBottomNav activeView={view as any} setActiveView={setView as any} unreadNotificationCount={unreadCount} />
      <FloatingActionMenu
        onNewPostClick={() => setIsNewPostModalOpen(true)}
        onDistressClick={() => setIsDistressModalOpen(true)}
        user={user}
      />
      
      {isNewChatModalOpen && (
        <MemberSearchModal 
            isOpen={isNewChatModalOpen} 
            onClose={() => setIsNewChatModalOpen(false)}
            currentUser={user}
            onSelectUser={handleNewChatSelect}
        />
      )}
      
      {isNewGroupModalOpen && (
        <CreateGroupModal
            isOpen={isNewGroupModalOpen}
            onClose={() => setIsNewGroupModalOpen(false)}
            currentUser={user}
        />
      )}

      {isNewPostModalOpen && (
        <NewPostModal
          isOpen={isNewPostModalOpen}
          onClose={() => setIsNewPostModalOpen(false)}
          user={user}
          onPostCreated={handlePostCreated}
        />
      )}
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
        buyUrl="https://ubuntium.org/buy-ubt"
      />
    </>
  );
};
