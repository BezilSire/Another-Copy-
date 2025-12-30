
import React, { useState, useEffect } from 'react';
import { MemberUser, Conversation, User, MemberView } from '../types';
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
import { SustenancePage } from './SustenancePage';
import { NotificationsPage } from './NotificationsPage';
import { WalletPage } from './WalletPage';
import { ChatsPage } from './ChatsPage';
import { MemberSearchModal } from './MemberSearchModal';
import { LedgerPage } from './LedgerPage';
import { CommunityHubSidebar } from './CommunityHubSidebar';
import { RightSidebar } from './RightSidebar';
import { PulseHub } from './PulseHub';
import { cryptoService } from '../services/cryptoService';
import { SovereignUpgradeBanner } from './SovereignUpgradeBanner';
import { GenesisNodeFlow } from './GenesisNodeFlow';
import { StateRegistry } from './StateRegistry';
import { IdentityVault } from './IdentityVault';
import { ProtocolReconciliation } from './ProtocolReconciliation';
import { MeetingHub } from './MeetingHub';
import { GovernancePage } from './GovernancePage';
import { useAuth } from '../contexts/AuthContext';
import { LockIcon } from './icons/LockIcon';

interface MemberDashboardProps {
  user: MemberUser;
  onUpdateUser: (updatedData: Partial<User>) => Promise<void>;
  unreadCount: number;
  onLogout: () => void;
  onViewProfile: (userId: string | null) => void;
  forcedView?: string | null;
  clearForcedView?: () => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ user, onUpdateUser, unreadCount, onLogout, onViewProfile, forcedView, clearForcedView }) => {
  const { firebaseUser } = useAuth();
  const [view, setView] = useState<MemberView>('home');
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [isDistressModalOpen, setIsDistressModalOpen] = useState(false);
  const [isDistressLoading, setIsDistressLoading] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { addToast } = useToast();
  
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);

  const hasLocalVault = cryptoService.hasVault();
  const isAnonymous = firebaseUser?.isAnonymous;

  useEffect(() => {
    if (forcedView) {
      setView(forcedView as MemberView);
      if (clearForcedView) clearForcedView();
    }
  }, [forcedView, clearForcedView]);

  const handlePostCreated = (ccapAwarded: number) => {
    if (ccapAwarded > 0) addToast(`Protocol index updated! Earned ${ccapAwarded} CCAP.`, 'success');
    else addToast('Dispatch recorded.', 'success');
    setIsNewPostModalOpen(false);
  };
  
  const handleUpgradeComplete = async (mnemonic: string, pin: string) => {
    const encryptedVault = await cryptoService.saveVault({ mnemonic }, pin);
    const pubKey = cryptoService.getPublicKey();
    // Law: Sync to server immediately
    if (pubKey) await onUpdateUser({ publicKey: pubKey, encryptedVault } as any);
    setIsUpgrading(false);
    addToast("Identity Anchored globally.", "success");
  };

  const renderMainContent = () => {
    if (isUpgrading) return <div className="flex justify-center py-10 animate-fade-in"><GenesisNodeFlow onComplete={handleUpgradeComplete} onBack={() => setIsUpgrading(false)} /></div>;
    
    if (isAnonymous && view !== 'meeting' && view !== 'knowledge') {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                <div className="p-5 bg-red-500/10 rounded-full border border-red-500/20 text-red-500"><LockIcon className="h-10 w-10" /></div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Protocol Restricted</h3>
                <p className="text-sm text-gray-500 max-w-xs uppercase tracking-widest leading-loose">Anonymous nodes are restricted to Meeting Protocols. Register a Citizen Identity for full access.</p>
                <button onClick={() => window.location.reload()} className="px-8 py-3 bg-brand-gold text-slate-950 font-black rounded-xl text-[10px] uppercase tracking-widest shadow-glow-gold">Upgrade Identity</button>
            </div>
        );
    }

    switch (view) {
      case 'home': return ( 
        <div className="space-y-6"> 
          {!hasLocalVault && <SovereignUpgradeBanner user={user} onUpgrade={() => setIsUpgrading(true)} />} 
          <PostsFeed user={user} onViewProfile={onViewProfile as any} typeFilter="all" /> 
        </div> 
      );
      case 'governance': return <GovernancePage user={user} />;
      case 'meeting': return <MeetingHub user={user} />;
      case 'state': return <StateRegistry user={user} />;
      case 'security': return <div className="max-w-2xl mx-auto"><IdentityVault onRestore={() => setView('home')} /></div>;
      case 'audit': return <ProtocolReconciliation user={user} onClose={() => setView('home')} />;
      case 'hub': return <PulseHub user={user} />;
      case 'sustenance': return <SustenancePage user={user} />;
      case 'wallet': return <WalletPage user={user} />;
      case 'chats': return <ChatsPage user={user} initialTarget={selectedChat} onClose={() => { setSelectedChat(null); setView('home'); }} onViewProfile={onViewProfile as any} onNewMessageClick={() => setIsNewChatModalOpen(true)} onNewGroupClick={() => {}} />;
      case 'ledger': return <LedgerPage />;
      case 'community': return <CommunityPage currentUser={user} onViewProfile={onViewProfile as any} />;
      case 'profile': return <MemberProfile currentUser={user} onUpdateUser={onUpdateUser} onViewProfile={onViewProfile as any} onGetVerifiedClick={() => {}} />;
      case 'notifications': return <NotificationsPage user={user} onNavigate={() => {}} onViewProfile={onViewProfile as any} />;
      case 'knowledge': return <KnowledgeBasePage currentUser={user} onUpdateUser={onUpdateUser} />;
      case 'more': return <MorePage user={user} onNavigate={setView as any} onLogout={onLogout} notificationCount={unreadCount} />;
      default: return <PostsFeed user={user} onViewProfile={onViewProfile as any} typeFilter="all" />;
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-20 md:pb-0">
      <div className="max-w-7xl auto px-0 sm:px-4 lg:px-8 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="hidden md:block md:col-span-3"><div className="sticky top-24"><CommunityHubSidebar activeView={view} onChangeView={setView} user={user} /></div></div>
            <div className="col-span-1 md:col-span-9 lg:col-span-6"><div className="min-h-[80vh] main-layout-container">{renderMainContent()}</div></div>
            <div className="hidden lg:block lg:col-span-3"><div className="sticky top-24"><RightSidebar user={user} /></div></div>
        </div>
      </div>
      <div className="md:hidden"><MemberBottomNav activeView={view as any} setActiveView={setView as any} unreadNotificationCount={unreadCount} /></div>
      <FloatingActionMenu onNewPostClick={() => setIsNewPostModalOpen(true)} onDistressClick={() => setIsDistressModalOpen(true)} user={user} />
      {isNewChatModalOpen && <MemberSearchModal isOpen={isNewChatModalOpen} onClose={() => setIsNewChatModalOpen(false)} currentUser={user} onSelectUser={setSelectedChat} />}
      {isNewPostModalOpen && <NewPostModal isOpen={isNewPostModalOpen} onClose={() => setIsNewPostModalOpen(false)} user={user} onPostCreated={handlePostCreated} />}
       {isDistressModalOpen && <DistressCallDialog isOpen={isDistressModalOpen} onClose={() => setIsDistressModalOpen(false)} onConfirm={async (c) => { setIsDistressLoading(true); try { await api.sendDistressPost(user, c); addToast('Emergency protocol initiated.', 'success'); setIsDistressModalOpen(false); } catch (e:any) { addToast(e.message, 'error'); } finally { setIsDistressLoading(false); } }} isLoading={isDistressLoading} />}
    </div>
  );
};
