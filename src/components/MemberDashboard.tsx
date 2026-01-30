
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
import { OracleHUD } from './OracleHUD';
import { EarnPage } from './EarnPage';

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
  const [view, setView] = useState<any>('home');
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
      setView(forcedView);
      if (clearForcedView) clearForcedView();
    }
  }, [forcedView, clearForcedView]);

  const handlePostCreated = (ccapAwarded: number) => {
    addToast(ccapAwarded > 0 ? `Shared! Earned ${ccapAwarded} points.` : 'Posted successfully.', 'success');
    setIsNewPostModalOpen(false);
  };
  
  const handleUpgradeComplete = async (mnemonic: string, pin: string) => {
    const encryptedVault = await cryptoService.saveVault({ mnemonic }, pin);
    const pubKey = cryptoService.getPublicKey();
    if (pubKey) await onUpdateUser({ publicKey: pubKey, encryptedVault } as any);
    setIsUpgrading(false);
    addToast("Your account is now safe.", "success");
  };

  const renderMainContent = () => {
    if (isUpgrading) return <div className="flex justify-center py-10 animate-fade-in"><GenesisNodeFlow onComplete={handleUpgradeComplete} onBack={() => setIsUpgrading(false)} /></div>;
    
    if (isAnonymous && !['meeting', 'knowledge', 'home'].includes(view)) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="p-5 bg-slate-800 rounded-full mb-6 text-slate-500"><LockIcon className="h-10 w-10" /></div>
                <h3 className="text-xl font-bold text-white mb-2">Member Only Feature</h3>
                <p className="text-sm text-slate-400 mb-8 max-w-xs">Register your identity to access the full community features.</p>
                <button onClick={() => window.location.reload()} className="px-8 py-3 bg-brand-gold text-slate-900 font-bold rounded-xl shadow-lg">Sign Up Now</button>
            </div>
        );
    }

    switch (view) {
      case 'home': return ( 
        <div className="space-y-6"> 
          {!hasLocalVault && <SovereignUpgradeBanner onUpgrade={() => setIsUpgrading(true)} user={user} />} 
          <OracleHUD user={user} />
          <PostsFeed user={user} onViewProfile={onViewProfile as any} typeFilter="all" /> 
        </div> 
      );
      case 'wallet': return <WalletPage user={user} />;
      case 'hub': return <PulseHub user={user} />;
      case 'chats': return <ChatsPage user={user} initialTarget={selectedChat} onClose={() => { setSelectedChat(null); setView('home'); }} onViewProfile={onViewProfile as any} onNewMessageClick={() => setIsNewChatModalOpen(true)} onNewGroupClick={() => {}} />;
      case 'earn': return <EarnPage user={user} onUpdateUser={onUpdateUser} onNavigateToRedemption={() => setView('wallet')} onNavigateToInvestments={() => setView('wallet')} />;
      case 'more': return <MorePage user={user} onNavigate={setView as any} onLogout={onLogout} notificationCount={unreadCount} />;
      case 'governance': return <GovernancePage user={user} />;
      case 'meeting': return <MeetingHub user={user} />;
      case 'state': return <StateRegistry user={user} />;
      case 'security': return <div className="max-w-2xl mx-auto"><IdentityVault onRestore={() => setView('home')} /></div>;
      case 'audit': return <ProtocolReconciliation user={user} onClose={() => setView('home')} />;
      case 'community': return <CommunityPage currentUser={user} onViewProfile={onViewProfile as any} />;
      case 'profile': return <MemberProfile currentUser={user} onUpdateUser={onUpdateUser} onViewProfile={onViewProfile as any} onGetVerifiedClick={() => {}} />;
      case 'notifications': return <NotificationsPage user={user} onNavigate={() => {}} onViewProfile={onViewProfile as any} />;
      case 'knowledge': return <KnowledgeBasePage currentUser={user} onUpdateUser={onUpdateUser} />;
      default: return <PostsFeed user={user} onViewProfile={onViewProfile as any} typeFilter="all" />;
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="hidden lg:block md:col-span-3">
                <div className="sticky top-24">
                    <CommunityHubSidebar activeView={view} onChangeView={setView} user={user} />
                </div>
            </div>
            <div className="col-span-1 lg:col-span-9">
                <div className="min-h-[80vh]">{renderMainContent()}</div>
            </div>
        </div>
      </div>
      <MemberBottomNav activeView={view as any} setActiveView={setView as any} unreadNotificationCount={unreadCount} />
      <FloatingActionMenu onNewPostClick={() => setIsNewPostModalOpen(true)} onDistressClick={() => setIsDistressModalOpen(true)} user={user} />
      {isNewChatModalOpen && <MemberSearchModal isOpen={isNewChatModalOpen} onClose={() => setIsNewChatModalOpen(false)} currentUser={user} onSelectUser={setSelectedChat} />}
      {isNewPostModalOpen && <NewPostModal isOpen={isNewPostModalOpen} onClose={() => setIsNewPostModalOpen(false)} user={user} onPostCreated={handlePostCreated} />}
      {isDistressModalOpen && <DistressCallDialog isOpen={isDistressModalOpen} onClose={() => setIsDistressModalOpen(false)} onConfirm={async (c) => { setIsDistressLoading(true); try { await api.sendDistressPost(user, c); addToast('Emergency call sent to your circle.', 'success'); setIsDistressModalOpen(false); } catch (e:any) { addToast(e.message, 'error'); } finally { setIsDistressLoading(false); } }} isLoading={isDistressLoading} />}
    </div>
  );
};
