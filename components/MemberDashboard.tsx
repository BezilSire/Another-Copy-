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
import { PulseHub } from './PulseHub';
import { cryptoService } from '../services/cryptoService';
import { SovereignUpgradeBanner } from './SovereignUpgradeBanner';
import { GenesisNodeFlow } from './GenesisNodeFlow';

type MemberView = 'home' | 'ventures' | 'community' | 'more' | 'profile' | 'knowledge' | 'pitch' | 'myinvestments' | 'sustenance' | 'earn' | 'notifications' | 'launchpad' | 'wallet' | 'chats' | 'ledger' | 'hub' | 'versions';

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
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { addToast } = useToast();
  const [typeFilter, setTypeFilter] = useState<FilterType>('foryou');
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);

  const hasVault = cryptoService.hasVault();

  const handlePostCreated = (ccapAwarded: number) => {
    if (ccapAwarded > 0) {
      addToast(`Post created! You've been awarded ${ccapAwarded} CCAP.`, 'success');
    } else {
      addToast('Post created successfully!', 'success');
    }
    setIsNewPostModalOpen(false);
  };
  
  const handleUpgradeComplete = async (mnemonic: string, pin: string) => {
    await cryptoService.saveVault({ mnemonic }, pin);
    const pubKey = cryptoService.getPublicKey();
    if (pubKey) {
        await onUpdateUser({ publicKey: pubKey });
    }
    setIsUpgrading(false);
    addToast("Identity Anchored. Your node is now Sovereign.", "success");
  };

  const renderMainContent = () => {
    if (isUpgrading) {
        return <div className="flex justify-center py-10 animate-fade-in"><GenesisNodeFlow onComplete={handleUpgradeComplete} onBack={() => setIsUpgrading(false)} /></div>;
    }

    switch (view) {
      case 'home':
        return (
            <div className="space-y-6">
              {!hasVault && <SovereignUpgradeBanner onUpgrade={() => setIsUpgrading(true)} />}
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
      case 'chats':
        return <ChatsPage user={user} initialTarget={selectedChat} onClose={() => { setSelectedChat(null); setView('home'); }} onViewProfile={onViewProfile as (userId: string) => void} onNewMessageClick={() => setIsNewChatModalOpen(true)} onNewGroupClick={() => setIsNewGroupModalOpen(true)} />;
      case 'wallet':
        return <WalletPage user={user} />;
      case 'ledger':
        return <LedgerPage />;
      case 'hub':
        return <PulseHub user={user} />;
      case 'ventures':
        return <VenturesPage currentUser={user} onViewProfile={onViewProfile as (userId: string) => void} onNavigateToPitchAssistant={() => setView('pitch')} />;
      case 'profile':
        return <MemberProfile currentUser={user} onUpdateUser={onUpdateUser} onViewProfile={onViewProfile as (userId: string) => void} onGetVerifiedClick={() => setIsVerificationModalOpen(true)} />;
      case 'more':
        return <MorePage user={user} onNavigate={setView as any} onLogout={onLogout} notificationCount={unreadCount} />;
      default:
        return <PostsFeed user={user} onViewProfile={onViewProfile as (userId: string) => void} typeFilter={typeFilter} />;
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6">
            <div className="hidden md:block md:col-span-3 lg:col-span-3">
                <div className="sticky top-24">
                    <CommunityHubSidebar activeView={view} onChangeView={setView} user={user} currentFilter={typeFilter} onFilterChange={setTypeFilter} />
                </div>
            </div>
            <div className="col-span-1 md:col-span-9 lg:col-span-6">
                <div className="min-h-[80vh] main-layout-container">
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
      <FloatingActionMenu onNewPostClick={() => setIsNewPostModalOpen(true)} onDistressClick={() => setIsDistressModalOpen(true)} user={user} />
      {isNewChatModalOpen && <MemberSearchModal isOpen={isNewChatModalOpen} onClose={() => setIsNewChatModalOpen(false)} currentUser={user} onSelectUser={setSelectedChat} />}
      {isNewPostModalOpen && <NewPostModal isOpen={isNewPostModalOpen} onClose={() => setIsNewPostModalOpen(false)} user={user} onPostCreated={handlePostCreated} />}
       {isDistressModalOpen && <DistressCallDialog isOpen={isDistressModalOpen} onClose={() => setIsDistressModalOpen(false)} onConfirm={async (c) => { setIsDistressLoading(true); try { await api.sendDistressPost(user, c); addToast('Distress call sent.', 'success'); setIsDistressModalOpen(false); } catch (e:any) { addToast(e.message, 'error'); } finally { setIsDistressLoading(false); } }} isLoading={isDistressLoading} />}
      <VerificationRedirectModal isOpen={isVerificationModalOpen} onClose={() => setIsVerificationModalOpen(false)} />
    </div>
  );
};