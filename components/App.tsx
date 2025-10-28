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
import { CompleteProfilePage } from './components/CompleteProfilePage';
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
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // State for Agent Dashboard UI
  const [agentView, setAgentView] = useState<AgentView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Hook to remind users to complete their profile
  useProfileCompletionReminder(currentUser);

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
        }, (error) => {
            console.error('Error listening for notifications:', error);
            // Don't toast on this error, as it can be noisy due to index requirements
        });
        return () => unsubNotifications();
    }
  }, [currentUser, addToast]);

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

  const renderContent = () => {
    if (isLoadingAuth) {
      return <div className="text-center p-10 text-gray-400">Loading...</div>;
    }

    if (!currentUser) {
      return <AuthPage />;
    }

    if (currentUser.status === 'pending' && currentUser.role !== 'agent') {
        return (
            <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-100px)]">
                <UbtVerificationPage user={currentUser} onLogout={requestLogout} />
            </div>
        );
    }

    if (!currentUser.isProfileComplete) {
        return <div className="p-4 sm:p-6 lg:p-8"><CompleteProfilePage user={currentUser} onProfileComplete={handleProfileComplete} /></div>;
    }
    
    if (currentUser.role === 'admin') {
      return (
        <div className="p-4 sm:p-6 lg:p-8">
            <AdminDashboard 
                user={currentUser as Admin} 
                broadcasts={broadcasts} 
                onSendBroadcast={handleSendBroadcast} 
                onUpdateUser={updateUser}
                unreadCount={unreadNotificationCount}
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
                onLogout={requestLogout}
            />
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white dark">
      {/* Header is now simpler as profile view logic is in dashboards */}
      <Header user={currentUser} onLogout={requestLogout} />
      {renderContent()}
      <ToastContainer />
      <AppInstallBanner />
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