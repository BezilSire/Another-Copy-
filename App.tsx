import React, { useState, useEffect } from 'react';
import { AgentDashboard } from './components/AgentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { MemberDashboard } from './components/MemberDashboard';
import { AuthPage } from './components/AuthPage';
import { Header } from './components/Header';
import { User, Agent, Broadcast, MemberUser, Admin, Conversation, Member } from './types';
import { useToast } from './contexts/ToastContext';
import { ToastContainer } from './components/Toast';
import { api } from './services/apiService';
import { Sidebar } from './components/Sidebar';
import { BottomNavBar } from './components/BottomNavBar';
import { useAuth } from './contexts/AuthContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { AppInstallBanner } from './components/AppInstallBanner';
import { useProfileCompletionReminder } from './hooks/useProfileCompletionReminder';
import { CompleteProfilePage } from './components/CompleteProfilePage';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { VerifyEmailPage } from './components/VerifyEmailPage';
import { ChatsPage } from './components/ChatsPage';
import { PublicProfile } from './components/PublicProfile';
import { MemberSearchModal } from './components/MemberSearchModal';
import { CreateGroupModal } from './components/CreateGroupModal';
import { arrayUnion } from 'firebase/firestore';
import { AndroidApkBanner } from './components/AndroidApkBanner';
import { WalletPage } from './components/WalletPage';
import { UbtVerificationPage } from './components/UbtVerificationPage';
import { usePushNotifications } from './hooks/usePushNotifications';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { RadarModal } from './components/RadarModal';
import { UBTScan } from './components/UBTScan';


type AgentView = 'dashboard' | 'members' | 'profile' | 'notifications' | 'knowledge' | 'wallet';

const App: React.FC = () => {
  const { currentUser, isLoadingAuth, logout, updateUser, firebaseUser } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const { addToast } = useToast();
  const isOnline = useOnlineStatus();
  const [hasSyncedOnConnect, setHasSyncedOnConnect] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // UI State
  const [agentView, setAgentView] = useState<AgentView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState<Conversation | 'main' | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);

  useProfileCompletionReminder(currentUser);
  const { permission, requestPermission } = usePushNotifications(currentUser);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchBroadcasts = async () => {
      try {
        const initialBroadcasts = await api.getBroadcasts();
        setBroadcasts(initialBroadcasts);
      } catch (error) {
        addToast('Could not load broadcasts.', 'error');
      }
    };

    if (currentUser) {
        fetchBroadcasts();
        const unsubNotifications = api.listenForNotifications(currentUser.id, (notifications) => {
            setUnreadNotificationCount(notifications.filter(n => !n.read).length);
            
            notifications.forEach(notif => {
                if (notif.type === 'NEW_CHAT' && !notif.read) {
                    const convoId = notif.link;
                    if (convoId && !currentUser.conversationIds?.includes(convoId)) {
                        console.log(`Discovered new chat ${convoId}, adding to user profile.`);
                        updateUser({ conversationIds: arrayUnion(convoId) as any });
                        api.markNotificationAsRead(currentUser.id, notif.id);
                    }
                }
            });

        }, (error) => {
            console.error('Error listening for notifications:', error);
        });
        return () => unsubNotifications();
    }
  }, [currentUser, addToast, updateUser]);

  useEffect(() => {
    if (isOnline && !hasSyncedOnConnect) {
      addToast("You're back online! Syncing data...", "info");
      if (currentUser?.role === 'admin') {
        api.processPendingWelcomeMessages().then(count => {
          if (count > 0) {
            addToast(`Successfully generated ${count} welcome message(s) for newly synced members.`, 'success');
          }
        });
      }
      setHasSyncedOnConnect(true);
    } else if (!isOnline) {
      setHasSyncedOnConnect(false);
    }
  }, [isOnline, hasSyncedOnConnect, addToast, currentUser]);

  const requestLogout = () => setIsLogoutConfirmOpen(true);
  const confirmLogout = async () => {
    await logout();
    setIsLogoutConfirmOpen(false);
  };
  
  const handleOpenChat = (target?: Conversation | 'main') => setChatTarget(target || 'main');
  
  const handleStartChatFromProfile = async (targetUserId: string) => {
    if (!currentUser) return;
    try {
        const targetUser = await api.getPublicUserProfile(targetUserId);
        if (!targetUser) {
            addToast("Could not find user to chat with.", "error");
            return;
        }
        const newConvo = await api.startChat(currentUser, targetUser);
        setViewingProfileId(null); // Close profile view
        handleOpenChat(newConvo); // Open chat view
    } catch (error) {
        addToast("Failed to start chat.", "error");
        console.error("Failed to start chat from profile:", error);
    }
  };
  
  const handleNewChatSelect = (newConversation: Conversation) => {
    setChatTarget(newConversation);
    setIsNewChatModalOpen(false);
  };

  const handleViewProfile = (userId: string | null) => {
    setChatTarget(null); // Close chat if open
    setViewingProfileId(userId);
  };
  
  const handleProfileComplete = async (updatedData: Partial<User>) => {
    if (!currentUser) return;

    if (currentUser.role !== 'member') {
        const updatePayload: Partial<User> = {
            name_lowercase: currentUser.name.toLowerCase(),
            phone: updatedData.phone,
            address: updatedData.address,
            bio: updatedData.bio,
            id_card_number: updatedData.id_card_number,
            isProfileComplete: true,
        };
        if (currentUser.role === 'agent') {
            updatePayload.circle = updatedData.circle;
        }
        await updateUser({ ...updatePayload, isCompletingProfile: true });
        addToast('Profile complete! Welcome to the commons.', 'success');
        return;
    }

    const memberUser = currentUser as MemberUser;
    if (!memberUser.member_id) {
        addToast("Cannot complete profile: Member ID is missing.", "error");
        return;
    }

    const skillsAsArray = updatedData.skills || [];
    const interestsAsArray = updatedData.interests || [];
    const passionsAsArray = updatedData.passions || [];
    
    const skillsLowercase = skillsAsArray.map(s => s.toLowerCase());

    const userUpdateData: Partial<User> = {
        name_lowercase: currentUser.name.toLowerCase(),
        phone: updatedData.phone,
        address: updatedData.address,
        bio: updatedData.bio,
        profession: updatedData.profession,
        skills: skillsAsArray,
        interests: interestsAsArray,
        passions: passionsAsArray,
        skills_lowercase: skillsLowercase,
        gender: updatedData.gender,
        age: updatedData.age,
        circle: updatedData.circle,
        id_card_number: updatedData.id_card_number,
        isLookingForPartners: updatedData.isLookingForPartners,
        lookingFor: updatedData.lookingFor,
        businessIdea: updatedData.businessIdea,
        isProfileComplete: true,
    };

    const memberUpdateData: Partial<Member> = {
        phone: updatedData.phone,
        address: updatedData.address,
        bio: updatedData.bio,
        profession: updatedData.profession,
        skills: skillsAsArray,
        interests: interestsAsArray,
        passions: passionsAsArray,
        gender: updatedData.gender,
        age: updatedData.age,
        circle: updatedData.circle,
        national_id: updatedData.id_card_number,
        isLookingForPartners: updatedData.isLookingForPartners,
        lookingFor: updatedData.lookingFor,
        businessIdea: updatedData.businessIdea,
        skills_lowercase: skillsLowercase,
    };
    
    try {
        await api.updateMemberAndUserProfile(memberUser.id, memberUser.member_id, userUpdateData, memberUpdateData);
        addToast('Profile complete! Welcome to the commons.', 'success');
    } catch (error: any) {
        console.error("Profile completion failed:", error);
        const errorMessage = error.message || 'Failed to update profile. Please try again.';
        addToast(errorMessage, 'error');
    }
  };

  const renderContent = () => {
    if (isLoadingAuth) {
      return <div className="text-center p-10 text-gray-400">Loading...</div>;
    }

    if (!currentUser) {
      return <AuthPage />;
    }

    if (chatTarget) {
      return (
        <ChatsPage
          user={currentUser}
          initialTarget={chatTarget === 'main' ? null : chatTarget as Conversation | null}
          onClose={() => setChatTarget(null)}
          onViewProfile={handleViewProfile}
          onNewMessageClick={() => setIsNewChatModalOpen(true)}
          onNewGroupClick={() => setIsNewGroupModalOpen(true)}
        />
      );
    }

    if (viewingProfileId) {
      return (
        <PublicProfile
          userId={viewingProfileId}
          currentUser={currentUser}
          onBack={() => setViewingProfileId(null)}
          onStartChat={handleStartChatFromProfile}
          onViewProfile={handleViewProfile}
          isAdminView={currentUser.role === 'admin'}
        />
      );
    }
    
    if (firebaseUser && !firebaseUser.emailVerified && currentUser.isProfileComplete) {
        return <VerifyEmailPage user={currentUser} onLogout={requestLogout} />;
    }
    
    if (currentUser.isProfileComplete && currentUser.status === 'pending' && currentUser.role === 'member') {
        return <div className="p-4 sm:p-6 lg:p-8"><UbtVerificationPage user={currentUser} onLogout={requestLogout} /></div>;
    }

    if (!currentUser.isProfileComplete) {
        return <div className="p-4 sm:p-6 lg:p-8"><CompleteProfilePage user={currentUser} onProfileComplete={handleProfileComplete} /></div>;
    }
    
    if (currentUser.role === 'admin') {
      return (
        <div className="p-4 sm:p-6 lg:p-8">
            <AdminDashboard 
                user={currentUser as Admin} 
                onUpdateUser={updateUser}
                unreadCount={unreadNotificationCount}
                onOpenChat={handleOpenChat}
                onViewProfile={handleViewProfile}
            />
        </div>
      );
    }

    if (currentUser.role === 'agent') {
      return (
        <>
            {isDesktop && (
                <Sidebar 
                    agent={currentUser as Agent} activeView={agentView} setActiveView={setAgentView}
                    onLogout={requestLogout} isCollapsed={isSidebarCollapsed}
                    onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    unreadCount={unreadNotificationCount}
                />
            )}
             <main className={`transition-all duration-300 ${isDesktop && !isSidebarCollapsed ? 'md:ml-64' : ''} ${isDesktop && isSidebarCollapsed ? 'md:ml-20' : ''} pb-24 md:pb-0`}>
                <AgentDashboard 
                    user={currentUser as Agent} broadcasts={broadcasts} onUpdateUser={updateUser} 
                    activeView={agentView} setActiveView={setAgentView}
                    onViewProfile={handleViewProfile}
                />
            </main>
            {!isDesktop && (
                <BottomNavBar 
                    agent={currentUser as Agent} activeView={agentView} setActiveView={setAgentView}
                    onLogout={requestLogout} unreadCount={unreadNotificationCount}
                />
            )}
        </>
      );
    }
    
    // Default to member dashboard
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <MemberDashboard 
                user={currentUser as MemberUser} onUpdateUser={updateUser}
                unreadCount={unreadNotificationCount} onLogout={requestLogout}
                onViewProfile={handleViewProfile}
            />
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white dark">
      <Header 
        user={currentUser} 
        onLogout={requestLogout} 
        onViewProfile={handleViewProfile} 
        onChatClick={() => handleOpenChat('main')}
        onRadarClick={() => setIsRadarOpen(true)} 
        onScanClick={() => setIsScanOpen(true)}
      />
      {renderContent()}
      
      {currentUser && (
         <NotificationPermissionBanner permission={permission} onRequestPermission={requestPermission} />
      )}

      {currentUser && isRadarOpen && (
        <RadarModal 
            isOpen={isRadarOpen}
            onClose={() => setIsRadarOpen(false)}
            currentUser={currentUser}
            onViewProfile={handleViewProfile}
            onStartChat={handleStartChatFromProfile}
        />
      )}

      {currentUser && isScanOpen && (
        <UBTScan
            currentUser={currentUser}
            onTransactionComplete={() => {}} // Listener handles update
            onClose={() => setIsScanOpen(false)}
        />
      )}

      {currentUser && isNewChatModalOpen && (
        <MemberSearchModal 
            isOpen={isNewChatModalOpen} 
            onClose={() => setIsNewChatModalOpen(false)}
            currentUser={currentUser}
            onSelectUser={handleNewChatSelect}
        />
      )}
      
      {currentUser && isNewGroupModalOpen && (
        <CreateGroupModal
            isOpen={isNewGroupModalOpen}
            onClose={() => setIsNewGroupModalOpen(false)}
            currentUser={currentUser}
        />
      )}
      
      <ToastContainer />
      <AppInstallBanner />
      <AndroidApkBanner />
       <ConfirmationDialog
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmButtonText="Logout"
      />
    </div>
  );
};

export default App;