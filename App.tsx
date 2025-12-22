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
import { LogoIcon } from './components/icons/LogoIcon';
import { LoaderIcon } from './components/icons/LoaderIcon';
import { PinVaultLogin } from './components/PinVaultLogin';

const BootSequence: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const sequence = [
    "> INITIALIZING UBUNTIUM OS...",
    "> LOADING IDENTITY_VAULT...",
    "> SYNC GLOBAL_LEDGER... [ OK ]",
    "> ESTABLISHING ENCRYPTED TUNNEL...",
    "> PROTOCOL HANDSHAKE READY.",
    "> ACCESS GRANTED."
  ];

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < sequence.length) {
        setLogs(prev => [...prev, sequence[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 150);
      }
    }, 120); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center p-8 font-mono text-brand-gold">
      <div className="w-24 h-24 mb-12 relative">
        <LogoIcon className="w-full h-full text-brand-gold animate-pulse" />
        <div className="absolute inset-0 border border-brand-gold/10 rounded-full animate-ping scale-150 opacity-20"></div>
      </div>
      <div className="w-full max-w-xs space-y-2 border-l border-brand-gold/20 pl-6">
        {logs.map((log, idx) => (
          <div key={idx} className="text-[10px] tracking-widest font-black uppercase text-brand-gold/90">{log}</div>
        ))}
        <div className="w-2.5 h-3.5 bg-brand-gold animate-terminal-cursor mt-2 shadow-[0_0_10px_#D4AF37]"></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { currentUser, isLoadingAuth, isProcessingAuth, logout, updateUser, firebaseUser, isSovereignLocked, unlockSovereignSession } = useAuth();
  const [isBooting, setIsBooting] = useState(true);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const { addToast } = useToast();
  const isOnline = useOnlineStatus();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // UI State
  const [agentView, setAgentView] = useState<any>('dashboard');
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
    if (currentUser) {
        api.getBroadcasts().then(setBroadcasts).catch(() => {});
        const unsubNotifications = api.listenForNotifications(currentUser.id, (notifications) => {
            setUnreadNotificationCount(notifications.filter(n => !n.read).length);
        }, (error) => {
            console.error('Notification error:', error);
        });
        return () => unsubNotifications();
    }
  }, [currentUser]);

  const requestLogout = () => setIsLogoutConfirmOpen(true);
  const confirmLogout = async () => {
    await logout();
    setIsLogoutConfirmOpen(false);
  };
  
  const handleOpenChat = (target?: Conversation | 'main') => setChatTarget(target || 'main');
  
  const handleViewProfile = (userId: string | null) => {
    setChatTarget(null);
    setViewingProfileId(userId);
  };
  
  const renderContent = () => {
    // 1. Initial Identity Syncing or background auto-login
    if (isLoadingAuth || isProcessingAuth) {
      return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-10 font-mono">
            <LoaderIcon className="h-8 w-8 animate-spin text-brand-gold mb-4 opacity-50" />
            <div className="text-[10px] uppercase tracking-[0.6em] text-brand-gold/60 animate-pulse">Syncing Node Identity...</div>
        </div>
      );
    }

    // 2. Sovereign PIN Gate
    if (isSovereignLocked) {
        return (
            <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4">
                <div className="absolute inset-0 blueprint-grid opacity-[0.05] pointer-events-none"></div>
                <PinVaultLogin onUnlock={unlockSovereignSession} onReset={() => addToast("Restoration protocol available via identity anchor.", "info")} />
            </div>
        );
    }

    // 3. Cloud Gate (Email Login)
    if (!currentUser) {
      return <AuthPage />;
    }

    // 4. Feature Routing
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
          onStartChat={async (id) => {
             const target = await api.getPublicUserProfile(id);
             if (target) {
               const convo = await api.startChat(currentUser, target);
               setViewingProfileId(null);
               setChatTarget(convo);
             }
          }}
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
        return <div className="p-4 sm:p-6 lg:p-8"><CompleteProfilePage user={currentUser} onProfileComplete={() => {}} /></div>;
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
    <div className="min-h-screen bg-black text-white selection:bg-brand-gold selection:text-black">
      {isBooting && <BootSequence onComplete={() => setIsBooting(false)} />}
      
      {!isBooting && (
          <div className="animate-fade-in">
            {!isSovereignLocked && currentUser && (
                <Header 
                    user={currentUser} 
                    onLogout={requestLogout} 
                    onViewProfile={handleViewProfile} 
                    onChatClick={() => handleOpenChat('main')}
                    onRadarClick={() => setIsRadarOpen(true)} 
                    onScanClick={() => setIsScanOpen(true)}
                />
            )}
            {renderContent()}
            
            {currentUser && !isSovereignLocked && (
                <NotificationPermissionBanner permission={permission} onRequestPermission={requestPermission} />
            )}

            {currentUser && isRadarOpen && (
                <RadarModal 
                    isOpen={isRadarOpen}
                    onClose={() => setIsRadarOpen(false)}
                    currentUser={currentUser}
                    onViewProfile={handleViewProfile}
                    onStartChat={async (id) => {
                    const target = await api.getPublicUserProfile(id);
                    if (target) {
                        const convo = await api.startChat(currentUser, target);
                        setIsRadarOpen(false);
                        setChatTarget(convo);
                    }
                    }}
                />
            )}

            {currentUser && isScanOpen && (
                <UBTScan
                    currentUser={currentUser}
                    onTransactionComplete={() => {}}
                    onClose={() => setIsScanOpen(false)}
                />
            )}

            {currentUser && isNewChatModalOpen && (
                <MemberSearchModal 
                    isOpen={isNewChatModalOpen} 
                    onClose={() => setIsNewChatModalOpen(false)}
                    currentUser={currentUser}
                    onSelectUser={(convo) => {
                    setChatTarget(convo);
                    setIsNewChatModalOpen(false);
                    }}
                />
            )}
            
            <ToastContainer />
            <AppInstallBanner />
            <AndroidApkBanner />
            <ConfirmationDialog
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                onConfirm={confirmLogout}
                title="Disconnect Node"
                message="Terminate secure session and exit the sovereign protocol?"
                confirmButtonText="Terminate"
            />
          </div>
      )}
    </div>
  );
};

export default App;