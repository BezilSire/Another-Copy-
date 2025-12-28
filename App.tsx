import React, { useState, useEffect } from 'react';
import { AgentDashboard } from './components/AgentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { MemberDashboard } from './components/MemberDashboard';
import { AuthPage } from './components/AuthPage';
import { Header } from './components/Header';
import { User, Agent, MemberUser, Admin, Conversation } from './types';
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
import { AlertTriangleIcon } from './components/icons/AlertTriangleIcon';
import { PinVaultLogin } from './components/PinVaultLogin';
import { RecoveryProtocol } from './components/RecoveryProtocol';
import { cryptoService, VaultData } from './services/cryptoService';
import { usePushNotifications } from './hooks/usePushNotifications';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';

const BootSequence: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const sequence = [
    "> BOOTING UBUNTIUM_CORE_v5.1.0...",
    "> INITIALIZING CRYPTO_LAYER... [ OK ]",
    "> CONNECTING TO GLOBAL_DAG_MAINNET...",
    "> RESOLVING SOVEREIGN_ID_PROVENANCE...",
    "> WELCOME CITIZEN."
  ];

  useEffect(() => {
    let i = 0;
    const interval = window.setInterval(() => {
      if (i < sequence.length) {
        setLogs(prev => [...prev, sequence[i]]);
        i++;
      } else {
        window.clearInterval(interval);
        setTimeout(onComplete, 300);
      }
    }, 70);
    return () => window.clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8 font-mono text-brand-gold">
      <div className="w-24 h-24 mb-16 relative">
        <LogoIcon className="h-full w-full text-brand-gold animate-pulse" />
      </div>
      <div className="w-full max-w-xs space-y-2 border-l-2 border-brand-gold/30 pl-6">
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

  const { permission, requestPermission } = usePushNotifications(currentUser);

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
    window.location.reload();
  };

  const handleSecurityRecoveryComplete = (mnemonic: string, pin: string, data: VaultData) => {
    cryptoService.saveVault({ mnemonic }, pin).then(() => {
        unlockSovereignSession(data, pin).then(() => {
            setIsRecovering(false);
        });
    });
  };
  
  const renderMainContent = () => {
    if (isBooting) return null;

    if (isSovereignLocked || (cryptoService.hasVault() && !sessionStorage.getItem('ugc_node_unlocked'))) {
        if (isRecovering) {
            return (
                <div className="flex-1 flex flex-col justify-center items-center px-4 min-h-screen bg-black">
                    <RecoveryProtocol onBack={() => setIsRecovering(false)} onComplete={handleSecurityRecoveryComplete} />
                </div>
            );
        }
        return (
            <div className="flex-1 flex flex-col justify-center items-center px-4 min-h-screen bg-black">
                <PinVaultLogin onUnlock={unlockSovereignSession} onReset={() => setIsRecovering(true)} />
            </div>
        );
    }

    if (currentUser) {
        if (chatTarget) {
            return (
                <ChatsPage
                    user={currentUser}
                    initialTarget={chatTarget === 'main' ? null : chatTarget as Conversation | null}
                    onClose={() => setChatTarget(null)}
                    onViewProfile={(id) => setViewingProfileId(id)}
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
                        onViewProfile={(id) => setViewingProfileId(id)}
                        isAdminView={currentUser.role === 'admin'}
                    />
                </div>
            );
        }

        if (currentUser.role === 'admin') {
            return <AdminDashboard user={currentUser as Admin} onUpdateUser={updateUser} unreadCount={unreadNotificationCount} onOpenChat={() => setChatTarget('main')} onViewProfile={(id) => setViewingProfileId(id)} />;
        }

        if (currentUser.role === 'agent') {
            return <AgentDashboard user={currentUser as Agent} broadcasts={[]} onUpdateUser={updateUser} activeView="dashboard" setActiveView={() => {}} onViewProfile={(id) => setViewingProfileId(id)} />;
        }
        
        return <MemberDashboard user={currentUser as MemberUser} onUpdateUser={updateUser} unreadCount={unreadNotificationCount} onLogout={() => setIsLogoutConfirmOpen(true)} onViewProfile={(id) => setViewingProfileId(id)} />;
    }

    if (isLoadingAuth || isProcessingAuth) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black p-10 text-center animate-fade-in">
            <LoaderIcon className="h-14 w-14 animate-spin text-brand-gold opacity-40 mb-8" />
            <div className="text-[10px] uppercase font-black tracking-[0.5em] text-white/30 font-mono">Synchronizing_Node_State</div>
        </div>
      );
    }

    return <AuthPage />;
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {isBooting && <BootSequence onComplete={() => setIsBooting(false)} />}
      {!isBooting && (
          <div className="flex-1 flex flex-col animate-fade-in">
            {!isSovereignLocked && currentUser && (
                <Header user={currentUser} onLogout={() => setIsLogoutConfirmOpen(true)} onViewProfile={(id) => setViewingProfileId(id)} onChatClick={() => setChatTarget('main')} />
            )}
            <main className="flex-1">{renderMainContent()}</main>
            <NotificationPermissionBanner permission={permission} onRequestPermission={requestPermission} />
            <ToastContainer />
            <ConfirmationDialog isOpen={isLogoutConfirmOpen} onClose={() => setIsLogoutConfirmOpen(false)} onConfirm={confirmLogout} title="Disconnect Node" message="Terminate handshake protocol?" confirmButtonText="Terminate" />
          </div>
      )}
    </div>
  );
};

export default App;