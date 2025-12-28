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
import { RadarModal } from './components/RadarModal';
import { usePushNotifications } from './hooks/usePushNotifications';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';

const BootSequence: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const sequence = [
    "> BOOTING UBUNTIUM_CORE_v5.1.0...",
    "> INITIALIZING CRYPTO_LAYER... [ OK ]",
    "> CONNECTING TO GLOBAL_DAG_MAINNET...",
    "> RESOLVING SOVEREIGN_ID_PROVENANCE...",
    "> HANDSHAKE STABILIZED. NODE_ONLINE.",
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
        <div className="absolute inset-0 border border-brand-gold/20 rounded-full animate-ping scale-150 opacity-20"></div>
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
  const [isRadarOpen, setIsRadarOpen] = useState(false);

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
  
  const handleOpenChat = () => setChatTarget('main');
  const handleViewProfile = (userId: string | null) => {
    setChatTarget(null);
    setViewingProfileId(userId);
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

        const isLegacyOrSpecial = currentUser.role === 'admin' || currentUser.role === 'agent' || currentUser.status === 'active';
        
        if (!isLegacyOrSpecial) {
            if (firebaseUser && !firebaseUser.emailVerified && (currentUser.isProfileComplete || currentUser.status === 'pending')) {
                return <VerifyEmailPage user={currentUser} onLogout={() => setIsLogoutConfirmOpen(true)} />;
            }
            
            if (currentUser.status === 'pending' && currentUser.role === 'member') {
                return <UbtVerificationPage user={currentUser} onLogout={() => setIsLogoutConfirmOpen(true)} />;
            }

            if (!currentUser.isProfileComplete) {
                return <div className="main-container py-12"><CompleteProfilePage user={currentUser} onProfileComplete={async (data) => { await updateUser(data); }} /></div>;
            }
        }
        
        if (currentUser.role === 'admin') {
            return (
                <AdminDashboard 
                    user={currentUser as Admin} onUpdateUser={updateUser}
                    unreadCount={unreadNotificationCount} onOpenChat={handleOpenChat}
                    onViewProfile={handleViewProfile}
                />
            );
        }

        if (currentUser.role === 'agent') {
            return (
                <AgentDashboard 
                    user={currentUser as Agent} broadcasts={[]} onUpdateUser={updateUser} 
                    activeView="dashboard" setActiveView={() => {}}
                    onViewProfile={handleViewProfile}
                />
            );
        }
        
        return (
            <MemberDashboard 
                user={currentUser as MemberUser} onUpdateUser={updateUser}
                unreadCount={unreadNotificationCount} onLogout={() => setIsLogoutConfirmOpen(true)}
                onViewProfile={handleViewProfile}
            />
        );
    }

    if (isLoadingAuth || isProcessingAuth) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black p-10 text-center animate-fade-in">
            <div className="relative mb-8">
                <LoaderIcon className="h-14 w-14 animate-spin text-brand-gold opacity-40" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-brand-gold rounded-full animate-ping"></div>
                </div>
            </div>
            <div className="text-[10px] uppercase font-black tracking-[0.5em] text-white/30 font-mono">Synchronizing_Node_State</div>
        </div>
      );
    }

    if (!firebaseUser) {
        return <AuthPage />;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6 text-center animate-fade-in">
            <AlertTriangleIcon className="h-12 w-12 text-brand-gold mb-6 opacity-40" />
            <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-4">Identity Not Indexed</h2>
            <p className="text-sm text-gray-400 max-w-xs mx-auto uppercase tracking-widest leading-loose">
                Session verified but citizen record missing. Re-sign to establishing node anchor.
            </p>
            <div className="flex flex-col gap-4 mt-10 w-full max-w-xs">
                <button onClick={() => window.location.reload()} className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-glow-gold">Retry Handshake</button>
                <button onClick={confirmLogout} className="w-full py-4 bg-white/5 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all">Sign Out</button>
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-black selection:bg-brand-gold/30">
      {isBooting && <BootSequence onComplete={() => setIsBooting(false)} />}
      {!isBooting && (
          <div className="flex-1 flex flex-col animate-fade-in">
            {!isSovereignLocked && currentUser && !firebaseUser?.isAnonymous && (
                <Header 
                    user={currentUser} 
                    onLogout={() => setIsLogoutConfirmOpen(true)} 
                    onViewProfile={handleViewProfile} 
                    onChatClick={() => handleOpenChat()}
                    onRadarClick={() => setIsRadarOpen(true)}
                />
            )}
            
            <main className="flex-1">
                {renderMainContent()}
            </main>
            
            <NotificationPermissionBanner permission={permission} onRequestPermission={requestPermission} />
            <ToastContainer />
            <ConfirmationDialog
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                onConfirm={confirmLogout}
                title="Disconnect Node"
                message="Are you sure you want to end the secure protocol handshake?"
                confirmButtonText="Terminate"
            />
            {isRadarOpen && currentUser && (
              <RadarModal 
                isOpen={isRadarOpen} 
                onClose={() => setIsRadarOpen(false)} 
                currentUser={currentUser} 
                onViewProfile={handleViewProfile}
                onStartChat={async (id) => {
                    const target = await api.getPublicUserProfile(id);
                    if (target) {
                        const convo = await api.startChat(currentUser, target);
                        setChatTarget(convo);
                    }
                }}
              />
            )}
          </div>
      )}
    </div>
  );
};

export default App;