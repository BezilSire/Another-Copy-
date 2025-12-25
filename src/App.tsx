
import React, { useState, useEffect } from 'react';
import { AgentDashboard } from './components/AgentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { MemberDashboard } from './components/MemberDashboard';
import { AuthPage } from './components/AuthPage';
import { Header } from './components/Header';
import { User, Agent, MemberUser, Admin, Conversation } from './types';
import { useToast } from './contexts/ToastContext';
import { ToastContainer } from './components/Toast';
import { api } from './services/apiService';
import { useAuth } from './contexts/AuthContext';
import { CompleteProfilePage } from './components/CompleteProfilePage';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { VerifyEmailPage } from './components/VerifyEmailPage';
import { ChatsPage } from './components/ChatsPage';
import { PublicProfile } from './components/PublicProfile';
import { UbtVerificationPage } from './components/UbtVerificationPage';
import { LogoIcon } from './components/icons/LogoIcon';
import { LoaderIcon } from './components/icons/LoaderIcon';
import { PinVaultLogin } from './components/PinVaultLogin';
import { RecoveryProtocol } from './components/RecoveryProtocol';
import { cryptoService } from './services/cryptoService';

const BootSequence: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const sequence = [
    "> BOOTING UBUNTIUM_KERNEL_v4.5.2...",
    "> MOUNTING ENCRYPTED_VAULT... [ SUCCESS ]",
    "> CONNECTING TO GLOBAL_DAG_MAINNET...",
    "> VERIFYING SOVEREIGN_IDENTITY_ROOT...",
    "> HANDSHAKE PROTOCOL STABILIZED.",
    "> ACCESS GRANTED. WELCOME CITIZEN."
  ];

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < sequence.length) {
        setLogs(prev => [...prev, sequence[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 400);
      }
    }, 180);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8 font-mono text-brand-gold">
      <div className="w-24 h-24 mb-16 relative">
        <LogoIcon className="w-full h-full text-brand-gold animate-pulse" />
        <div className="absolute inset-0 border border-brand-gold/10 rounded-full animate-ping scale-150 opacity-20"></div>
      </div>
      <div className="w-full max-w-xs space-y-2 border-l border-brand-gold/20 pl-6">
        {logs.map((log, idx) => (
          <div key={idx} className="text-[10px] tracking-widest font-black uppercase text-brand-gold/90 animate-fade-in">{log}</div>
        ))}
        <div className="w-2.5 h-3.5 bg-brand-gold animate-terminal-cursor mt-2 shadow-[0_0_10px_#D4AF37]"></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { currentUser, isLoadingAuth, isProcessingAuth, logout, updateUser, firebaseUser, isSovereignLocked, unlockSovereignSession } = useAuth();
  const [isBooting, setIsBooting] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState<Conversation | 'main' | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
        const unsubNotifs = api.listenForNotifications(currentUser.id, (notifications) => {
            setUnreadNotificationCount(notifications.filter(n => !n.read).length);
        }, () => {});
        return () => unsubNotifs();
    }
  }, [currentUser]);

  const confirmLogout = async () => {
    await logout();
    setIsLogoutConfirmOpen(false);
  };
  
  const handleOpenChat = () => setChatTarget('main');
  const handleViewProfile = (userId: string | null) => {
    setChatTarget(null);
    setViewingProfileId(userId);
  };
  
  const renderMainContent = () => {
    // 1. GLOBAL LOADING GATE
    // If the system is booting, or authenticating, or HAS a user session but NO profile yet: WAIT.
    if (isLoadingAuth || isProcessingAuth || (firebaseUser && !currentUser)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
            <LoaderIcon className="h-10 w-10 animate-spin text-brand-gold mb-4" />
            <div className="text-[10px] uppercase font-black tracking-[0.4em] text-white/30">Synchronizing Ledger...</div>
        </div>
      );
    }

    // 2. SOVEREIGN PIN GATE
    if (isSovereignLocked || (cryptoService.hasVault() && !sessionStorage.getItem('ugc_node_unlocked'))) {
        if (isRecovering) {
            return (
                <div className="flex-1 flex flex-col justify-center items-center px-4 min-h-screen bg-black">
                    <RecoveryProtocol 
                        onBack={() => setIsRecovering(false)} 
                        onComplete={async (m, p) => { 
                            await cryptoService.saveVault({mnemonic: m}, p); 
                            setIsRecovering(false); 
                        }} 
                    />
                </div>
            );
        }
        return (
            <div className="flex-1 flex flex-col justify-center items-center px-4 min-h-screen bg-black">
                <PinVaultLogin onUnlock={unlockSovereignSession} onReset={() => setIsRecovering(true)} />
            </div>
        );
    }

    // 3. AUTH GATE
    // We ONLY show the AuthPage if there is definitely NO firebase session.
    if (!firebaseUser && !currentUser) return <AuthPage />;

    // 4. PROTOCOL CONTENT
    // At this point, currentUser MUST exist because of the loading guard in step 1.
    const user = currentUser!;
    
    if (chatTarget) {
      return (
        <ChatsPage
          user={user}
          initialTarget={chatTarget === 'main' ? null : chatTarget as Conversation | null}
          onClose={() => setChatTarget(null)}
          onViewProfile={handleViewProfile}
          onNewMessageClick={() => {}}
          onNewGroupClick={() => {}}
        />
      );
    }

    if (viewingProfileId) {
      return (
        <div className="main-container py-10">
            <PublicProfile
                userId={viewingProfileId}
                currentUser={user}
                onBack={() => setViewingProfileId(null)}
                onStartChat={async (id) => {
                    const target = await api.getPublicUserProfile(id);
                    if (target) {
                        const convo = await api.startChat(user, target);
                        setViewingProfileId(null);
                        setChatTarget(convo);
                    }
                }}
                onViewProfile={handleViewProfile}
                isAdminView={user.role === 'admin'}
            />
        </div>
      );
    }

    // 5. INDUCTION & VERIFICATION FLOWS
    const isLegacyOrSpecial = user.role === 'admin' || user.role === 'agent' || user.status === 'active';
    
    if (!isLegacyOrSpecial) {
        if (firebaseUser && !firebaseUser.emailVerified && (user.isProfileComplete || user.status === 'pending')) {
            return <VerifyEmailPage user={user} onLogout={() => setIsLogoutConfirmOpen(true)} />;
        }
        
        if (user.status === 'pending' && user.role === 'member') {
            return <UbtVerificationPage user={user} onLogout={() => setIsLogoutConfirmOpen(true)} />;
        }

        if (!user.isProfileComplete) {
            return <div className="main-container py-12"><CompleteProfilePage user={user} onProfileComplete={() => {}} /></div>;
        }
    }
    
    // 6. DASHBOARDS
    if (user.role === 'admin') {
      return (
        <div className="main-container py-8">
            <AdminDashboard 
                user={user as Admin} 
                onUpdateUser={updateUser}
                unreadCount={unreadNotificationCount}
                onOpenChat={handleOpenChat}
                onViewProfile={handleViewProfile}
            />
        </div>
      );
    }

    if (user.role === 'agent') {
      return (
        <div className="main-container py-8">
            <AgentDashboard 
                user={user as Agent} broadcasts={[]} onUpdateUser={updateUser} 
                activeView="dashboard" setActiveView={() => {}}
                onViewProfile={handleViewProfile}
            />
        </div>
      );
    }
    
    return (
        <div className="main-container">
            <MemberDashboard 
                user={user as MemberUser} onUpdateUser={updateUser}
                unreadCount={unreadNotificationCount} onLogout={() => setIsLogoutConfirmOpen(true)}
                onViewProfile={handleViewProfile}
            />
        </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {isBooting && <BootSequence onComplete={() => setIsBooting(false)} />}
      {!isBooting && (
          <div className="flex-1 flex flex-col animate-fade-in">
            {!isSovereignLocked && currentUser && (
                <Header 
                    user={currentUser} 
                    onLogout={() => setIsLogoutConfirmOpen(true)} 
                    onViewProfile={handleViewProfile} 
                    onChatClick={() => handleOpenChat()}
                />
            )}
            
            <main className="flex-1">
                {renderMainContent()}
            </main>
            
            <ToastContainer />
            <ConfirmationDialog
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                onConfirm={confirmLogout}
                title="End Protocol Session"
                message="Are you sure you want to terminate the secure handshake?"
                confirmButtonText="Terminate"
            />
          </div>
      )}
    </div>
  );
};

export default App;
