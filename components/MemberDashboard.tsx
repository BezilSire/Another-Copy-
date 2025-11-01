import React, { useState, useEffect } from 'react';
import { MemberUser, Conversation, User, NotificationItem, CreatorContent, FilterType } from '../types';
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
import { RedemptionPage } from './RedemptionPage';
import { NotificationsPage } from './NotificationsPage';
import { EarnPage } from './EarnPage';
import { ProjectLaunchpad } from './ProjectLaunchpad';
import { MarkdownRenderer } from './MarkdownRenderer';
import { formatTimeAgo } from '../utils';
import { PostTypeFilter } from './PostTypeFilter';

type MemberView = 'home' | 'ventures' | 'community' | 'more' | 'profile' | 'knowledge' | 'pitch' | 'myinvestments' | 'sustenance' | 'earn' | 'redemption' | 'notifications' | 'launchpad';

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
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');

  const [creatorContent, setCreatorContent] = useState<CreatorContent[]>([]);
  const [isLoadingCreatorContent, setIsLoadingCreatorContent] = useState(true);

  useEffect(() => {
    if (user.referrerId) {
      const unsubscribe = api.listenForContentFromReferrer(user.referrerId, (data) => {
        setCreatorContent(data);
        setIsLoadingCreatorContent(false);
      }, (error) => {
        console.error("Failed to load creator content:", error);
        setIsLoadingCreatorContent(false);
      });
      return () => unsubscribe();
    } else {
      setIsLoadingCreatorContent(false);
    }
  }, [user.referrerId]);

  const CreatorContentFeed = () => {
    if (isLoadingCreatorContent || creatorContent.length === 0) {
        return null; 
    }

    return (
        <div className="space-y-4 mb-6">
            <h2 className="text-2xl font-bold text-white">From Your Mentor</h2>
            {creatorContent.map(item => (
                <div key={item.id} className="bg-slate-800 p-5 rounded-lg shadow-lg border-l-4 border-purple-500/50">
                    <div className="flex justify-between items-start">
                        <div>
                        <h3 className="text-xl font-bold text-white">{item.title}</h3>
                        <p className="text-xs text-gray-400">
                            Posted {item.createdAt ? formatTimeAgo(item.createdAt.toDate().toISOString()) : 'just now'}
                        </p>
                        </div>
                    </div>
                    <div className="text-white mt-4 text-base wysiwyg-content line-clamp-6">
                        <MarkdownRenderer content={item.content} />
                    </div>
                </div>
            ))}
        </div>
    );
  };

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
      // Chat functionality is handled in App.tsx
      console.log('Navigate to chat not implemented here.');
    } else if (item.link) {
      onViewProfile(item.link);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'home':
        return (
            <>
              <CreatorContentFeed />
              <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} />
              <PostsFeed user={user} onViewProfile={onViewProfile as (userId: string) => void} typeFilter={typeFilter} />
            </>
          );
      case 'ventures':
        return <VenturesPage currentUser={user} onViewProfile={onViewProfile as (userId: string) => void} onNavigateToPitchAssistant={() => setView('pitch')} />;
      case 'pitch':
        return <AIVenturePitchAssistant user={user} onUpdateUser={onUpdateUser} onBack={() => setView('ventures')} />;
      case 'community':
        return <CommunityPage currentUser={user} onViewProfile={onViewProfile as (userId: string) => void} />;
      case 'more':
        return <MorePage user={user} onNavigate={handleNav} onLogout={onLogout} notificationCount={unreadCount} />;
      case 'profile':
        return <MemberProfile currentUser={user} onUpdateUser={onUpdateUser} onViewProfile={onViewProfile as (userId: string) => void} />;
      case 'knowledge':
        return <KnowledgeBasePage currentUser={user} onUpdateUser={onUpdateUser} />;
      case 'myinvestments':
        return <MyInvestmentsPage user={user} onViewProfile={onViewProfile as (userId: string) => void} onNavigateToMarketplace={() => setView('ventures')} />;
      case 'sustenance':
        return <SustenancePage user={user} />;
      case 'earn':
        return <EarnPage user={user} onUpdateUser={onUpdateUser} onNavigateToRedemption={() => setView('redemption')} onNavigateToInvestments={() => setView('myinvestments')} />;
      case 'redemption':
        return <RedemptionPage user={user} onUpdateUser={onUpdateUser} onBack={() => setView('earn')} />;
       case 'notifications':
        return <NotificationsPage user={user} onNavigate={handleNotificationNavigate} onViewProfile={onViewProfile as (userId: string) => void} />;
      case 'launchpad':
        return <ProjectLaunchpad />;
      default:
        return (
            <>
              <CreatorContentFeed />
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
    </>
  );
};