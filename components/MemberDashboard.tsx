import React, { useState, useEffect } from 'react';
import { MemberUser, Broadcast, Post, User, Conversation, NotificationItem } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { MemberProfile } from './MemberProfile';
import { PostsFeed } from './PostsFeed';
import { DistressCallDialog } from './DistressCallDialog';
import { ConnectPage } from './ConnectPage';
import { NotificationsPage } from './NotificationsPage';
import { MemberBottomNav } from './MemberBottomNav';
import { NewPostModal } from './NewPostModal';
import { SirenIcon } from './icons/SirenIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { CommunityPage, CommunityHubView } from './CommunityPage';
import { PostTypeFilter } from './PostTypeFilter';
import { KnowledgeBasePage } from './KnowledgeBasePage';
import { AIVenturePitchAssistant } from './AIVenturePitchAssistant';
import { ProposalDetailsPage } from './ProposalDetailsPage';
import { EarnPage } from './EarnPage';
import { MyInvestmentsPage } from './MyInvestmentsPage';
import { RedemptionPage } from './RedemptionPage';
import { SustenancePage } from './SustenancePage';

type MemberActiveView = 'feed' | 'community' | 'connect' | 'notifications' | 'profile' | 'knowledge' | 'pitchAssistant' | 'proposalDetails' | 'earn' | 'investments' | 'redemption' | 'sustenance';

interface MemberDashboardProps {
  user: MemberUser;
  broadcasts: Broadcast[];
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  unreadCount: number;
  onViewProfile: (userId: string | null) => void;
  initialChat: { target: Conversation; role: User['role'] } | null;
  onInitialChatConsumed: () => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ user, broadcasts, onUpdateUser, unreadCount, onViewProfile, initialChat, onInitialChatConsumed }) => {
  const [activeView, setActiveView] = useState<MemberActiveView>('feed');
  const [viewContext, setViewContext] = useState<{ proposalId?: string } | null>(null);
  const [communityInitialTab, setCommunityInitialTab] = useState<CommunityHubView>();

  const [typeFilter, setTypeFilter] = useState<Post['types'] | 'all'>('all');
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isDistressDialogOpen, setIsDistressDialogOpen] = useState(false);
  const [isSubmittingDistress, setIsSubmittingDistress] = useState(false);
  
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const { addToast } = useToast();
  
  const [chatTarget, setChatTarget] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (initialChat && initialChat.role === user.role) {
        setChatTarget(initialChat.target);
        setActiveView('connect');
        onInitialChatConsumed();
    }
  }, [initialChat, user.role, onInitialChatConsumed]);

   useEffect(() => {
    if (activeView !== 'community') {
      setCommunityInitialTab(undefined);
    }
  }, [activeView]);

  useEffect(() => {
    if (user.status === 'active') {
        const unsubscribe = api.listenForConversations(
            user.id, 
            (conversations) => {
                setConversations(conversations);
                const count = conversations.filter(c => !c.readBy.includes(user.id) && c.lastMessageSenderId !== user.id).length;
                setUnreadChatCount(count);
            },
            (error) => {
                console.error("Failed to load conversations:", error);
                addToast("Could not load your conversations. You may have insufficient permissions.", "error");
            }
        );
        return () => unsubscribe();
    }
  }, [user.id, user.status, addToast]);
  
  const handleViewChange = (view: MemberActiveView, context: { proposalId?: string } | null = null) => {
      setActiveView(view);
      setViewContext(context);
  }

  const navigateToRedemption = () => {
    setActiveView('redemption');
  };

  const handleDistressCall = async (content: string) => {
    if (user.distress_calls_available <= 0) {
        addToast("You have no distress calls available.", "error");
        return;
    }
    setIsSubmittingDistress(true);
    try {
        const updatedUser = await api.createDistressPost(user, content);
        // This is a partial update; onUpdateUser merges it into the context state
        onUpdateUser({ 
            distress_calls_available: (updatedUser as MemberUser).distress_calls_available,
            last_distress_post_id: (updatedUser as MemberUser).last_distress_post_id,
        });
        addToast("Distress call sent. Admins have been alerted.", "success");
        setIsDistressDialogOpen(false);
        setActiveView('feed'); // Go to feed to see the post
    } catch (error) {
        addToast("Failed to send distress call.", "error");
    } finally {
        setIsSubmittingDistress(false);
    }
  };
  
  const handleStartChat = async (targetUserId: string) => {
      try {
        const targetUser = await api.getPublicUserProfile(targetUserId);
        if (!targetUser) {
            addToast("Could not find user to chat with.", "error");
            return;
        }
        const newConvo = await api.startChat(user.id, targetUserId, user.name, targetUser.name);
        setChatTarget(newConvo);
        onViewProfile(null); // Close profile if open
        setActiveView('connect');
      } catch (error) {
        addToast("Failed to start chat.", "error");
      }
  };

  const handleNavigate = (item: NotificationItem) => {
      switch (item.type) {
          case 'NEW_MESSAGE':
          case 'NEW_CHAT':
              const convo = conversations.find(c => c.id === item.link);
              if (convo) {
                  setChatTarget(convo);
                  setActiveView('connect');
              } else {
                 addToast("Could not find the conversation.", "error");
              }
              break;
          case 'POST_LIKE':
          case 'NEW_MEMBER':
          case 'NEW_POST_OPPORTUNITY':
          case 'NEW_POST_PROPOSAL':
          case 'NEW_POST_OFFER':
          case 'NEW_POST_GENERAL':
          case 'POST_COMMENT':
          case 'NEW_FOLLOWER':
              const profileId = item.itemType === 'notification' ? item.causerId : (item.causerId || item.link);
              onViewProfile(profileId);
              break;
          default:
              addToast("Navigation for this item is not available.", "info");
      }
  };

  const handlePostCreated = () => {
    setIsNewPostOpen(false);
    setActiveView('feed'); // Switch to home feed to see the new post
    addToast("Post created successfully!", "success");
  }
  
  const FeedHeader = () => (
     <div className="mb-4 sticky top-[68px] z-20 bg-slate-900/80 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-700">
            <h2 className="py-4 text-lg font-semibold text-white inline-flex items-center"><GlobeIcon className="h-5 w-5 mr-2" /> For You</h2>
        </div>
    </div>
  );


  const renderContent = () => {
    switch (activeView) {
        case 'feed':
            return (
                <>
                    <FeedHeader />
                    <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} />
                    <PostsFeed 
                        user={user} 
                        feedType="all" 
                        typeFilter={typeFilter} 
                        onViewProfile={onViewProfile} 
                    />
                </>
            );
        case 'community':
            return <CommunityPage currentUser={user} onViewProfile={onViewProfile} broadcasts={broadcasts} onNavigate={handleViewChange} initialTab={communityInitialTab} />;
        case 'earn':
            return <EarnPage user={user} onUpdateUser={onUpdateUser} onNavigateToRedemption={navigateToRedemption} />;
        case 'redemption':
            return <RedemptionPage user={user} onUpdateUser={onUpdateUser} onBack={() => setActiveView('earn')} />;
        case 'investments':
            return <MyInvestmentsPage 
                user={user} 
                onViewProfile={onViewProfile as (userId: string) => void}
                onNavigateToMarketplace={() => {
                    setCommunityInitialTab('ventures');
                    setActiveView('community');
                }}
            />;
        case 'sustenance':
            return <SustenancePage user={user} />;
        case 'connect':
            return <ConnectPage user={user} initialTarget={chatTarget} onViewProfile={onViewProfile as (userId: string) => void} />;
        case 'notifications':
            return <NotificationsPage user={user} onNavigate={handleNavigate} onViewProfile={onViewProfile as (userId: string) => void}/>;
        case 'profile':
            return <MemberProfile memberId={user.member_id} currentUser={user} onUpdateUser={onUpdateUser} onViewProfile={onViewProfile as (userId: string) => void} />;
        case 'knowledge':
            return <KnowledgeBasePage currentUser={user} onUpdateUser={onUpdateUser} />;
        case 'pitchAssistant':
            return <AIVenturePitchAssistant user={user} onUpdateUser={onUpdateUser} onBack={() => setActiveView('community')} />;
        case 'proposalDetails':
            if (viewContext?.proposalId) {
                return <ProposalDetailsPage proposalId={viewContext.proposalId} currentUser={user} onBack={() => setActiveView('community')} />;
            }
            return null; // Or a fallback view
        default:
            return null;
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
        <NewPostModal 
            isOpen={isNewPostOpen}
            onClose={() => setIsNewPostOpen(false)}
            user={user}
            onPostCreated={handlePostCreated}
        />
        <DistressCallDialog
            isOpen={isDistressDialogOpen}
            onClose={() => setIsDistressDialogOpen(false)}
            onConfirm={handleDistressCall}
            isLoading={isSubmittingDistress}
        />
        
        <div className="mt-0">
            {renderContent()}
        </div>

        {user.status === 'active' && activeView === 'feed' && (
            <div className="fixed bottom-24 right-4 sm:right-6 lg:right-8 z-20 flex flex-col items-center space-y-3">
                <button
                    onClick={() => setIsDistressDialogOpen(true)}
                    className="flex items-center justify-center w-16 h-16 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500"
                    title="Send Distress Call"
                    aria-label="Send Distress Call"
                >
                    <SirenIcon className="h-8 w-8" />
                </button>
                <button
                    onClick={() => setIsNewPostOpen(true)}
                    className="flex items-center justify-center w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500"
                    title="Create New Post"
                    aria-label="Create New Post"
                >
                    <PlusCircleIcon className="h-7 w-7" />
                </button>
            </div>
        )}


        <MemberBottomNav 
            activeView={activeView}
            setActiveView={setActiveView}
            notificationCount={unreadCount + unreadChatCount}
        />
    </div>
  );
};