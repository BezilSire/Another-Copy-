




import React, { useState, useEffect } from 'react';
import { AgentDashboard } from './components/AgentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { MemberDashboard } from './components/MemberDashboard';
import { AuthPage } from './components/AuthPage';
import { Header } from './components/Header';
import { User, Agent, Broadcast, MemberUser, Admin, Conversation } from './types';
import { useToast } from './contexts/ToastContext';
import { ToastContainer } from './components/Toast';
import { api } from './services/apiService';
import { Sidebar } from './components/Sidebar';
import { BottomNavBar } from './components/BottomNavBar';
import { useAuth } from './contexts/AuthContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { AppInstallBanner } from './components/AppInstallBanner';
import { useProfileCompletionReminder } from './hooks/useProfileCompletionReminder';
import { PublicProfile } from './components/PublicProfile';
import { CompleteProfilePage } from './components/CompleteProfilePage';
import { ChatBot } from './components/ChatBot';
import { SparkleIcon } from './components/icons/SparkleIcon';
import { UbtVerificationPage } from './components/UbtVerificationPage';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { KnowledgeBasePage } from './components/KnowledgeBasePage';

type AgentView = 'dashboard' | 'members' | 'profile' | 'notifications' | 'knowledge';

const App: React.FC = () => {
  const { currentUser, isLoadingAuth, logout, updateUser } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const { addToast } = useToast();
  const isOnline = useOnlineStatus();
  const [hasSyncedOnConnect, setHasSyncedOnConnect] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // State for Agent Dashboard UI
  const [agentView, setAgentView] = useState<AgentView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Global state for viewing a user profile from anywhere (e.g., search)
  const [globalViewingProfileId, setGlobalViewingProfileId] = useState<string | null>(null);
  
  // State to trigger opening a chat from a global component like PublicProfile
  const [initialChat, setInitialChat] = useState<{ target: Conversation, role: User['role']} | null>(null);
  const onInitialChatConsumed = () => setInitialChat(null);
  
  // State for the AI Chat Bot
  const [isChatBotOpen, setIsChatBotOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);


  // Hook to remind users to complete their profile
  useProfileCompletionReminder(currentUser);


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
        }, (error) => {
            console.error('Error listening for notifications:', error);
            addToast('Could not retrieve notifications.', 'error');
        });
        return () => unsubNotifications();
    }
  }, [currentUser, addToast]);

  useEffect(() => {
    // When the user comes online, check if a sync is needed.
    if (isOnline && !hasSyncedOnConnect) {
      addToast("You're back online! Syncing data...", "info");
      // This is a background task that should only be run by admins to avoid permission errors for other users.
      if (currentUser?.role === 'admin') {
        api.processPendingWelcomeMessages().then(count => {
          if (count > 0) {
            addToast(`Successfully generated ${count} welcome message(s) for newly synced members.`, 'success');
          }
        });
      }
      // Mark as synced to prevent re-syncing on every online event within the same session.
      setHasSyncedOnConnect(true);
    } else if (!isOnline) {
      // Reset the sync flag when the user goes offline.
      setHasSyncedOnConnect(false);
    }
  }, [isOnline, hasSyncedOnConnect, addToast, currentUser]);

  const requestLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const confirmLogout = async () => {
    await logout();
    setIsLogoutConfirmOpen(false);
  };

  const handleSendBroadcast = async (message: string) => {
    if (!currentUser) throw new Error("Not authenticated.");
    try {
        const newBroadcast = await api.sendBroadcast(currentUser, message);
        setBroadcasts(prev => [newBroadcast, ...prev]);
        addToast('Broadcast sent successfully!', 'success');
    } catch (error) {
        addToast('Failed to send broadcast.', 'error');
        throw error;
    }
  };
  
  const handleProfileComplete = async (updatedData: Partial<User>) => {
    await updateUser({ ...updatedData, isProfileComplete: true, isCompletingProfile: true });
    addToast('Profile complete! Welcome to the commons.', 'success');
  };

  const handleStartChat = async (targetUserId: string) => {
    if (!currentUser || currentUser.role === 'agent') {
        addToast("Messaging is not available for agents.", "info");
        return;
    }
    try {
        const targetUser = await api.getPublicUserProfile(targetUserId);
        if (!targetUser) {
            addToast("Could not find user to chat with.", "error");
            return;
        }
        const newConvo = await api.startChat(currentUser.id, targetUserId, currentUser.name, targetUser.name);
        setGlobalViewingProfileId(null); // Close profile view
        setInitialChat({ target: newConvo, role: currentUser.role });
    } catch (error) {
        addToast("Failed to start chat.", "error");
    }
  };


  const renderContent = () => {
    if (isLoadingAuth) {
      return <div className="text-center p-10 text-gray-400">Loading...</div>;
    }

    if (!currentUser) {
      return <AuthPage />;
    }

    if (currentUser.status === 'pending') {
        return (
            <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-100px)]">
                <UbtVerificationPage user={currentUser} onLogout={requestLogout} />
            </div>
        );
    }

    if (!currentUser.isProfileComplete) {
        return <div className="p-4 sm:p-6 lg:p-8"><CompleteProfilePage user={currentUser} onProfileComplete={handleProfileComplete} /></div>;
    }

    if (globalViewingProfileId) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <PublicProfile 
                    userId={globalViewingProfileId}
                    currentUser={currentUser}
                    onBack={() => setGlobalViewingProfileId(null)}
                    onStartChat={handleStartChat}
                    onViewProfile={setGlobalViewingProfileId}
                />
            </div>
        );
    }
    
    const isDesktop = window.innerWidth >= 768; // md breakpoint

    if (currentUser.role === 'admin') {
      return (
        <div className="p-4 sm:p-6 lg:p-8">
            <AdminDashboard 
                user={currentUser as Admin} 
                broadcasts={broadcasts} 
                onSendBroadcast={handleSendBroadcast} 
                onUpdateUser={updateUser}
                unreadCount={unreadNotificationCount}
                onViewProfile={setGlobalViewingProfileId}
                initialChat={initialChat}
                onInitialChatConsumed={onInitialChatConsumed}
            />
        </div>
      );
    }

    if (currentUser.role === 'agent') {
      return (
        <>
            {isDesktop && (
                <Sidebar 
                    agent={currentUser as Agent}
                    activeView={agentView}
                    setActiveView={setAgentView}
                    onLogout={requestLogout}
                    isCollapsed={isSidebarCollapsed}
                    onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    unreadCount={unreadNotificationCount}
                />
            )}
             <main className={`transition-all duration-300 ${isDesktop && !isSidebarCollapsed ? 'md:ml-64' : ''} ${isDesktop && isSidebarCollapsed ? 'md:ml-20' : ''} pb-24 md:pb-0`}>
                <AgentDashboard 
                    user={currentUser as Agent} 
                    broadcasts={broadcasts} 
                    onUpdateUser={updateUser} 
                    activeView={agentView}
                    setActiveView={setAgentView}
                    onViewProfile={setGlobalViewingProfileId}
                />
            </main>
            {!isDesktop && (
                <BottomNavBar 
                    agent={currentUser as Agent}
                    activeView={agentView}
                    setActiveView={setAgentView}
                    onLogout={requestLogout}
                    unreadCount={unreadNotificationCount}
                />
            )}
        </>
      );
    }
    
    // Default to member dashboard
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <MemberDashboard 
                user={currentUser as MemberUser} 
                broadcasts={broadcasts} 
                onUpdateUser={updateUser}
                unreadCount={unreadNotificationCount}
                onViewProfile={setGlobalViewingProfileId}
                initialChat={initialChat}
                onInitialChatConsumed={onInitialChatConsumed}
            />
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white dark">
      <Header user={currentUser} onLogout={requestLogout} onViewProfile={setGlobalViewingProfileId} />
      {renderContent()}
      <ToastContainer />
      <AppInstallBanner />
      {currentUser && (
        <>
          <ChatBot isOpen={isChatBotOpen} onClose={() => setIsChatBotOpen(false)} currentUser={currentUser} />
          {!isChatBotOpen && (
            <button
              onClick={() => setIsChatBotOpen(true)}
              className="fixed bottom-6 right-6 z-30 w-16 h-16 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 transform transition-transform hover:scale-110 animate-fade-in"
              aria-label="Open AI Assistant"
            >
              <SparkleIcon className="h-8 w-8" />
            </button>
          )}
        </>
      )}
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
