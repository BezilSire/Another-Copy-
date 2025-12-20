
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
  const { addToast } = useToast();
  const [typeFilter, setTypeFilter] = useState<FilterType>('foryou');
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);

  // Local state for ledger nav
  const [localLedgerTarget, setLocalLedgerTarget] = useState<LedgerViewParams | undefined>(initialLedgerTarget);

  useEffect(() => {
    if (initialLedgerTarget) {
      setLocalLedgerTarget(initialLedgerTarget);
      setView('ledger');
    }
  }, [initialLedgerTarget]);

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
      await onUpdateUser({}); 
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

  const renderVersionControl = () => (
      <div className="space-y-8 animate-fade-in">
          <div className="glass-card p-10 rounded-[3rem] border-white/5 space-y-6">
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase gold-text leading-none">Temporal Ledger</h2>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Rollback & State Recovery Protocols</p>
              
              <div className="space-y-4 pt-6">
                  {[
                      { v: "2.5.0", label: "Identity Vault & QR Logic", date: "Present", active: true },
                      { v: "2.4.8", label: "Pulse Hub Implementation", date: "2 hours ago", active: false },
                      { v: "2.4.0", label: "Venture Marketplace Alpha", date: "Yesterday", active: false },
                      { v: "2.0.0", label: "Core Node Architecture", date: "3 days ago", active: false }
                  ].map((ver) => (
                      <div key={ver.v} className={`p-6 rounded-[2rem] border border-white/5 flex justify-between items-center transition-all ${ver.active ? 'bg-brand-gold/10 border-brand-gold/20' : 'bg-black/40 hover:bg-black/60'}`}>
                          <div className="flex items-center gap-6">
                              <span className={`font-mono text-xl font-black ${ver.active ? 'text-brand-gold' : 'text-gray-600'}`}>v{ver.v}</span>
                              <div>
                                  <p className="font-black text-white text-sm uppercase tracking-widest">{ver.label}</p>
                                  <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Snapshot Anchored: {ver.date}</p>
                              </div>
                          </div>
                          {!ver.active ? (
                              <button 
                                onClick={() => addToast(`Initiating rollback sequence to v${ver.v}...`, "info")}
                                className="px-6 py-3 bg-white/5 hover:bg-red-500 hover:text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                              >
                                  Revert State
                              </button>
                          ) : (
                              <div className="flex items-center gap-2 text-green-500">
                                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                  <span className="text-[10px] font-black uppercase tracking-widest">Active Node</span>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const renderMainContent = () => {
    switch (view) {
      case 'home':
        return (
            <div className="space-y-6">
              {user.status !== 'active' && (
                <VerificationHub 
                  onGetVerifiedClick={() => setIsVerificationModalOpen(true)}
                  onLearnMoreClick={() => setView('knowledge')}
                />
              )}
              {/* Mobile Filter */}
              <div className="md:hidden">
                 <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} />
              </div>
              <PostsFeed user={user} onViewProfile={onViewProfile as (userId: string) => void} typeFilter={typeFilter} />
            </div>
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
      case 'hub':
        return <PulseHub user={user} />;
      case 'ledger': 
        return <LedgerPage initialTarget={localLedgerTarget} />;
      case 'ventures':
        return <VenturesPage currentUser={user} onViewProfile={onViewProfile as (userId: string) => void} onNavigateToPitchAssistant={() => setView('pitch')} />;
      case 'pitch':
        return <AIVenturePitchAssistant user={user} onUpdateUser={onUpdateUser} onBack={() => setView('ventures')} />;
      case 'community':
        return <CommunityPage currentUser={user} onViewProfile={onViewProfile as (userId: string) => void} />;
      case 'more':
        return <MorePage user={user} onNavigate={handleNav as any} onLogout={onLogout} notificationCount={unreadCount} />;
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
      case 'versions':
        return renderVersionControl();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6">
            
            {/* Left Sidebar (Desktop Only) */}
            <div className="hidden md:block md:col-span-3 lg:col-span-3">
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

            {/* Center Content */}
            <div className="col-span-1 md:col-span-9 lg:col-span-6">
                <div className="min-h-[80vh] main-layout-container">
                     {renderMainContent()}
                </div>
            </div>

            {/* Right Sidebar (Desktop Only) */}
            <div className="hidden lg:block lg:col-span-3">
                <div className="sticky top-24">
                    <RightSidebar user={user} />
                </div>
            </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden">
         <MemberBottomNav activeView={view as any} setActiveView={setView as any} unreadNotificationCount={unreadCount} />
      </div>

      {/* Floating Action */}
      <FloatingActionMenu
        onNewPostClick={() => setIsNewPostModalOpen(true)}
        onDistressClick={() => setIsDistressModalOpen(true)}
        user={user}
      />
      
      {/* Modals */}
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
      />
    </div>
  );
};
