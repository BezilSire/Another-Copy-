import React, { useState } from 'react';
import { MemberUser, Broadcast, User, Post } from '../types';
import { MemberBottomNav } from './MemberBottomNav';
import { PostsFeed } from './PostsFeed';
import { MemberProfile } from './MemberProfile';
import { ConnectPage } from './ConnectPage';
import { ProposalsPage } from './ProposalsPage';
import { VenturesPage } from './VenturesPage';
import { KnowledgeBasePage } from './KnowledgeBasePage';
import { ProjectLaunchpad } from './ProjectLaunchpad';
import { EarnPage } from './EarnPage';
import { SustenancePage } from './SustenancePage';
import { MyInvestmentsPage } from './MyInvestmentsPage';
import { RedemptionPage } from './RedemptionPage';
import { ProposalDetailsPage } from './ProposalDetailsPage';
import { PublicProfile } from './PublicProfile';
import { AIVenturePitchAssistant } from './AIVenturePitchAssistant';
import { MorePage } from './MorePage';
import { PostTypeFilter } from './PostTypeFilter';
import { FilterType } from '../types';
import { NewPostModal } from './NewPostModal';
import { DistressCallDialog } from './DistressCallDialog';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { SirenIcon } from './icons/SirenIcon';
import { NotificationsPage } from './NotificationsPage';
import { FloatingActionMenu } from './FloatingActionMenu';


type MemberView = 
  | 'home' 
  | 'connect' 
  | 'ventures' 
  | 'more' 
  // Sub-views from 'more'
  | 'profile' 
  | 'notifications' 
  | 'sustenance' 
  | 'myinvestments' 
  | 'knowledge' 
  | 'launchpad'
  | 'earn'
  // Sub-sub-views
  | 'proposals'
  | 'proposal-details'
  | 'redemption'
  | 'pitch-assistant';

interface MemberDashboardProps {
  user: MemberUser;
  broadcasts: Broadcast[];
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  unreadCount: number;
  onLogout: () => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ user, broadcasts, onUpdateUser, unreadCount, onLogout }) => {
  const [view, setView] = useState<MemberView>('home');
  const [activeSubViewId, setActiveSubViewId] = useState<string | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const { addToast } = useToast();

  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [isDistressModalOpen, setIsDistressModalOpen] = useState(false);
  const [isSendingDistress, setIsSendingDistress] = useState(false);
  
  const handleNavigation = (targetView: MemberView, id: string | null = null) => {
    setView(targetView);
    setActiveSubViewId(id);
    setViewingProfileId(null); // Clear profile view when navigating
  }

  const handlePostCreated = (ccapAwarded: number) => {
      setIsNewPostModalOpen(false);
      addToast(`Post created successfully! You earned ${ccapAwarded} CCAP.`, 'success');
  };

  const handleSendDistress = async (content: string) => {
      setIsSendingDistress(true);
      try {
          await api.sendDistressPost(user, content);
          await onUpdateUser({}); // Trigger user refresh
          addToast("Distress call sent. Your circle and admins have been notified.", 'success');
          setIsDistressModalOpen(false);
      } catch (error) {
          addToast(error instanceof Error ? error.message : "Failed to send distress call.", 'error');
      } finally {
          setIsSendingDistress(false);
      }
  };
  
   const handleStartChat = async (targetUserId: string) => {
    // A simplified start chat that just switches view.
    // Full implementation would require a chat context.
    setView('connect');
  };

  if (viewingProfileId) {
    return (
        <PublicProfile
            userId={viewingProfileId}
            currentUser={user}
            onBack={() => setViewingProfileId(null)}
            onStartChat={handleStartChat}
            onViewProfile={setViewingProfileId}
        />
    );
  }


  const renderContent = () => {
    switch (view) {
      case 'home':
        return (
          <>
            <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} />
            <PostsFeed user={user} onViewProfile={setViewingProfileId} typeFilter={typeFilter} />
          </>
        );
      case 'connect':
        return <ConnectPage user={user} onViewProfile={setViewingProfileId} />;
      case 'ventures':
        return <VenturesPage currentUser={user} onViewProfile={setViewingProfileId} onNavigateToPitchAssistant={() => handleNavigation('pitch-assistant')} />;
      case 'more':
        return <MorePage user={user} onNavigate={handleNavigation} onLogout={onLogout} notificationCount={unreadCount} />;
      
      // Sub-views from More
      case 'profile':
        return <MemberProfile currentUser={user} onUpdateUser={onUpdateUser} onViewProfile={setViewingProfileId} />;
      case 'notifications':
        return <NotificationsPage user={user} onNavigate={() => {}} onViewProfile={setViewingProfileId} />;
      case 'knowledge':
        return <KnowledgeBasePage currentUser={user} onUpdateUser={onUpdateUser} />;
      case 'launchpad':
        return <ProjectLaunchpad />;
      case 'earn':
        return <EarnPage user={user} onUpdateUser={onUpdateUser} onNavigateToRedemption={() => handleNavigation('redemption')} onNavigateToInvestments={() => handleNavigation('myinvestments')} />;
      case 'sustenance':
        return <SustenancePage user={user} />;
      case 'myinvestments':
        return <MyInvestmentsPage user={user} onViewProfile={setViewingProfileId} onNavigateToMarketplace={() => handleNavigation('ventures')} />;
      case 'proposals':
        return <ProposalsPage currentUser={user} onNavigateToDetails={(id) => handleNavigation('proposal-details', id)} />;

      // Sub-sub-views
      case 'redemption':
        return <RedemptionPage user={user} onUpdateUser={onUpdateUser} onBack={() => handleNavigation('earn')} />;
      case 'proposal-details':
        return <ProposalDetailsPage proposalId={activeSubViewId!} currentUser={user} onBack={() => handleNavigation('proposals')} />;
      case 'pitch-assistant':
        return <AIVenturePitchAssistant user={user} onUpdateUser={onUpdateUser} onBack={() => handleNavigation('ventures')} />;
      default:
        return (
          <>
            <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} />
            <PostsFeed user={user} onViewProfile={setViewingProfileId} typeFilter={typeFilter} />
          </>
        );
    }
  };

  return (
    <>
      <main className="pb-24">
        {renderContent()}
      </main>

      <FloatingActionMenu
        user={user}
        onNewPostClick={() => setIsNewPostModalOpen(true)}
        onDistressClick={() => setIsDistressModalOpen(true)}
      />

      <MemberBottomNav activeView={view as any} setActiveView={handleNavigation} unreadNotificationCount={unreadCount} onLogout={onLogout} />

      <NewPostModal 
        isOpen={isNewPostModalOpen}
        onClose={() => setIsNewPostModalOpen(false)}
        user={user}
        onPostCreated={handlePostCreated}
      />
      <DistressCallDialog
        isOpen={isDistressModalOpen}
        onClose={() => setIsDistressModalOpen(false)}
        onConfirm={handleSendDistress}
        isLoading={isSendingDistress}
      />
    </>
  );
};
