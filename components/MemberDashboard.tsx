import React, { useState, useEffect } from 'react';
import { MemberUser, Broadcast, User, Post, Conversation, FilterType } from '../types';
import { MemberBottomNav } from './MemberBottomNav';
import { PostsFeed } from './PostsFeed';
import { MemberProfile } from './MemberProfile';
import { ProposalsPage } from './ProposalsPage';
import { VenturesPage } from './VenturesPage';
import { KnowledgeBasePage } from './KnowledgeBasePage';
import { ProjectLaunchpad } from './ProjectLaunchpad';
import { EarnPage } from './EarnPage';
import { SustenancePage } from './SustenancePage';
import { MyInvestmentsPage } from './MyInvestmentsPage';
import { RedemptionPage } from './RedemptionPage';
import { ProposalDetailsPage } from './ProposalDetailsPage';
import { AIVenturePitchAssistant } from './AIVenturePitchAssistant';
import { MorePage } from './MorePage';
import { PostTypeFilter } from './PostTypeFilter';
import { NewPostModal } from './NewPostModal';
import { DistressCallDialog } from './DistressCallDialog';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { ConfirmationDialog } from './ConfirmationDialog';
import { UbtVerificationPage } from './UbtVerificationPage';
import { NotificationsPage } from './NotificationsPage';
import { FloatingActionMenu } from './FloatingActionMenu';
import { CommunityPage } from './CommunityPage';


type MemberView = 
  | 'home' 
  | 'ventures' 
  | 'community'
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
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  unreadCount: number;
  onLogout: () => void;
  onOpenChat: (target: Conversation) => void;
  onViewProfile: (userId: string | null) => void;
  onNewMessageClick: () => void;
  onNewGroupClick: () => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = (props) => {
  const { user, onUpdateUser, unreadCount, onLogout, onOpenChat, onViewProfile, onNewMessageClick, onNewGroupClick } = props;
  const [view, setView] = useState<MemberView>('home');
  const [activeSubViewId, setActiveSubViewId] = useState<string | null>(null);
  const { addToast } = useToast();
  
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [isDistressModalOpen, setIsDistressModalOpen] = useState(false);
  const [isSendingDistress, setIsSendingDistress] = useState(false);
  
  const [isVerificationPromptOpen, setIsVerificationPromptOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleNavigation = (targetView: MemberView, id: string | null = null) => {
    setView(targetView);
    setActiveSubViewId(id);
    onViewProfile(null);
  }
  
  const handleActionAttempt = () => {
    if (user.status === 'pending') {
      setIsVerificationPromptOpen(true);
      return false;
    }
    return true;
  };

  const handlePostCreated = (ccapAwarded: number) => {
      setIsNewPostModalOpen(false);
      addToast(`Post created successfully! You earned ${ccapAwarded} CCAP.`, 'success');
  };

  const handleSendDistress = async (content: string) => {
      setIsSendingDistress(true);
      try {
          await api.sendDistressPost(user, content);
          await onUpdateUser({});
          addToast("Distress call sent. Your circle and admins have been notified.", 'success');
          setIsDistressModalOpen(false);
      } catch (error) {
          addToast(error instanceof Error ? error.message : "Failed to send distress call.", 'error');
      } finally {
          setIsSendingDistress(false);
      }
  };
  
  if (isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <UbtVerificationPage user={user} onLogout={onLogout} />
      </div>
    );
  }

  const renderContent = () => {
    switch (view) {
      case 'home':
        return ( <> <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} /> <PostsFeed user={user} onViewProfile={onViewProfile} typeFilter={typeFilter} /> </> );
      case 'ventures':
        return <VenturesPage currentUser={user} onViewProfile={onViewProfile} onNavigateToPitchAssistant={() => handleNavigation('pitch-assistant')} />;
      case 'community':
        return <CommunityPage currentUser={user} onViewProfile={onViewProfile} onOpenChat={onOpenChat} unreadCount={unreadCount} onNewMessageClick={onNewMessageClick} onNewGroupClick={onNewGroupClick} />;
      case 'more':
        return <MorePage user={user} onNavigate={handleNavigation} onLogout={onLogout} notificationCount={unreadCount} />;
      
      case 'profile':
        return <MemberProfile currentUser={user} onUpdateUser={onUpdateUser} onViewProfile={onViewProfile} />;
      case 'notifications':
        return <NotificationsPage user={user} onNavigate={() => {}} onViewProfile={onViewProfile} />;
      case 'knowledge':
        return <KnowledgeBasePage currentUser={user} onUpdateUser={onUpdateUser} />;
      case 'launchpad':
        return <ProjectLaunchpad />;
      case 'earn':
        return <EarnPage user={user} onUpdateUser={onUpdateUser} onNavigateToRedemption={() => handleNavigation('redemption')} onNavigateToInvestments={() => handleNavigation('myinvestments')} />;
      case 'sustenance':
        return <SustenancePage user={user} />;
      case 'myinvestments':
        return <MyInvestmentsPage user={user} onViewProfile={onViewProfile} onNavigateToMarketplace={() => handleNavigation('ventures')} />;
      case 'proposals':
        return <ProposalsPage currentUser={user} onNavigateToDetails={(id) => handleNavigation('proposal-details', id)} />;
      case 'redemption':
        return <RedemptionPage user={user} onUpdateUser={onUpdateUser} onBack={() => handleNavigation('earn')} />;
      case 'proposal-details':
        return <ProposalDetailsPage proposalId={activeSubViewId!} currentUser={user} onBack={() => handleNavigation('proposals')} />;
      case 'pitch-assistant':
        return <AIVenturePitchAssistant user={user} onUpdateUser={onUpdateUser} onBack={() => handleNavigation('ventures')} />;
      default:
        return ( <> <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} /> <PostsFeed user={user} onViewProfile={onViewProfile} typeFilter={typeFilter} /> </> );
    }
  };

  return (
    <>
      <main className="pb-24">
        {renderContent()}
      </main>

      <FloatingActionMenu
        user={user}
        onNewPostClick={() => { if (handleActionAttempt()) setIsNewPostModalOpen(true); }}
        onDistressClick={() => { if (handleActionAttempt()) setIsDistressModalOpen(true); }}
      />

      <MemberBottomNav activeView={view as any} setActiveView={handleNavigation} unreadNotificationCount={unreadCount} />

      <NewPostModal isOpen={isNewPostModalOpen} onClose={() => setIsNewPostModalOpen(false)} user={user} onPostCreated={handlePostCreated} />
      <DistressCallDialog isOpen={isDistressModalOpen} onClose={() => setIsDistressModalOpen(false)} onConfirm={handleSendDistress} isLoading={isSendingDistress} />
      <ConfirmationDialog
        isOpen={isVerificationPromptOpen}
        onClose={() => setIsVerificationPromptOpen(false)}
        onConfirm={() => { setIsVerificationPromptOpen(false); setIsVerifying(true); }}
        title="Membership Verification Required"
        message="To create posts and use all features of the commons, you must be a verified member. This requires confirming you hold at least $10 worth of $UBT."
        confirmButtonText="Verify Now"
      />
    </>
  );
};