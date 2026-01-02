
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
import { ChatsPage } from './components/ChatsPage';
import { PublicProfile } from './components/PublicProfile';
import { LogoIcon } from './components/icons/LogoIcon';
import { LoaderIcon } from './components/icons/LoaderIcon';
import { AlertTriangleIcon } from './components/icons/AlertTriangleIcon';
import { PinVaultLogin } from './components/PinVaultLogin';
import { RecoveryProtocol } from './components/RecoveryProtocol';
import { cryptoService, VaultData } from './services/cryptoService';
import { RadarModal } from './components/RadarModal';
import { RotateCwIcon } from './components/icons/RotateCwIcon';

const BootSequence: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const sequence = [
    "> INITIALIZING UBUNTIUM_SOVEREIGN_v5.2.0...", 
    "> ENABLING Ed25519 CRYPTO_SHIELD...", 
    "> SYNCING WITH GLOBAL_DAG_LEDGER...", 
    "> RESOLVING IDENTITY_ANCHOR_PROVENANCE...", 
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
    }, 80);
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
  const { currentUser, isLoadingAuth, isProcessingAuth, logout, updateUser, firebaseUser, isSovereignLocked, unlockSovereignSession, refreshIdentity } = useAuth();
  const [isBooting, setIsBooting] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState<Conversation | 'main' | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [forceView, setForceView] = useState<string | null>(null);

  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const joinId = params.get('join');
      if (joinId) setActiveMeetingId(joinId);
  }, []);

  useEffect(() => {
    if (currentUser && !firebaseUser?.isAnonymous) {
        const unsubNotifs = api.listenForNotifications(currentUser.id, (notifications) => setUnreadNotificationCount(notifications.filter(n => !n.read).length));
        return () => unsubNotifs();
    }
  }, [currentUser, firebaseUser]);

  const confirmLogout = async () => { await logout(); setIsLogoutConfirmOpen(false); window.location.reload(); };
  const handleOpenChat = () => setChatTarget('main');
  const handleOpenMeet = () => setForceView('meeting');
  const handleOpenVote = () => setForceView('governance');
  const handleViewProfile = (userId: string | null) => { setChatTarget(null); setViewingProfileId(userId); };
  const handleSecurityRecoveryComplete = (mnemonic: string, pin: string, data: VaultData) => { 
    cryptoService.saveVault({ mnemonic }, pin).then(() => { 
        unlockSovereignSession(data, pin).then(() => setIsRecovering(false)); 
    }); 
  };
  
  const renderMainContent = () => {
    if (isBooting) return null;
    
    if (isSovereignLocked || (cryptoService.hasVault() && !sessionStorage.getItem('ugc_node_unlocked'))) {
        if (isRecovering) return <div className="flex-1 flex flex-col justify-center items-center px-4 min-h-screen bg-black"><RecoveryProtocol onBack={() => setIsRecovering(false)} onComplete={handleSecurityRecoveryComplete} /></div>;
        return <div className="flex-1 flex flex-col justify-center items-center px-4 min-h-screen bg-black"><PinVaultLogin onUnlock={unlockSovereignSession} onReset={() => setIsRecovering(true)} /></div>;
    }

    if (currentUser) {
        if (chatTarget) return <ChatsPage user={currentUser} initialTarget={chatTarget === 'main' ? null : chatTarget as Conversation | null} onClose={() => setChatTarget(null)} onViewProfile={handleViewProfile} onNewMessageClick={() => {}} onNewGroupClick={() => {}} />;
        if (viewingProfileId) return <div className="main-container py-10"><PublicProfile userId={viewingProfileId} currentUser={currentUser} onBack={() => setViewingProfileId(null)} onStartChat={async (id) => { const target = await api.getPublicUserProfile(id); if (target) { const convo = await api.startChat(currentUser, target); setViewingProfileId(null); setChatTarget(convo); } }} onViewProfile={(id) => setViewingProfileId(id)} isAdminView={currentUser.role === 'admin'} /></div>;
        
        if (!currentUser.isProfileComplete) return <div className="main-container py-12"><CompleteProfilePage user={currentUser} onProfileComplete={async (data) => { await updateUser(data); }} /></div>;
        
        if (currentUser.role === 'admin') return <AdminDashboard user={currentUser as Admin} onUpdateUser={updateUser} unreadCount={unreadNotificationCount} onOpenChat={handleOpenChat} onViewProfile={handleViewProfile} />;
        if (currentUser.role === 'agent') return <AgentDashboard user={currentUser as Agent} broadcasts={[]} onUpdateUser={updateUser} activeView="dashboard" setActiveView={() => {}} onViewProfile={handleViewProfile} />;
        return <MemberDashboard user={currentUser as MemberUser} onUpdateUser={updateUser} unreadCount={unreadNotificationCount} onLogout={() => setIsLogoutConfirmOpen(true)} onViewProfile={handleViewProfile} forcedView={forceView} clearForcedView={() => setForceView(null)} />;
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
                <div className="text-[10px] uppercase font-black tracking-[0.5em] text-white/30 font-mono">Synchronizing_Protocol_State</div>
            </div>
        );
    }
    
    if (firebaseUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6 text-center animate-fade-in">
                <div className="module-frame glass-module p-10 sm:p-16 rounded-[4rem] border-red-500/20 shadow-premium max-w-md w-full relative">
                    <AlertTriangleIcon className="h-16 w-16 text-brand-gold mx-auto mb-10 opacity-60" />
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 leading-none gold-text">Resync Required</h2>
                    <p className="text-sm text-gray-400 leading-loose uppercase font-black tracking-widest opacity-60 mb-10">
                        Identity authenticated via cloud, but protocol handshake is latent.
                    </p>
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={refreshIdentity} 
                            disabled={isProcessingAuth}
                            className="w-full py-6 bg-brand-gold text-slate-950 font-black rounded-3xl uppercase tracking-[0.4em] text-[10px] shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-3"
                        >
                            {isProcessingAuth ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <><RotateCwIcon className="h-4 w-4" /> Force Re-Anchor</>}
                        </button>
                        <button onClick={confirmLogout} className="w-full py-4 text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors">Abort Session</button>
                    </div>
                </div>
            </div>
        );
    }

    return <AuthPage />;
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
                    onMeetClick={handleOpenMeet} 
                    onVoteClick={handleOpenVote}
                    onRadarClick={() => setIsRadarOpen(true)} 
                />
            )}
            <main className="flex-1">{renderMainContent()}</main>
            <ToastContainer />
            <ConfirmationDialog isOpen={isLogoutConfirmOpen} onClose={() => setIsLogoutConfirmOpen(false)} onConfirm={confirmLogout} title="Disconnect Node" message="Are you sure you want to end the secure protocol handshake?" confirmButtonText="Terminate" />
            {isRadarOpen && currentUser && <RadarModal isOpen={isRadarOpen} onClose={() => setIsRadarOpen(false)} currentUser={currentUser} onViewProfile={handleViewProfile} onStartChat={async (id) => { const target = await api.getPublicUserProfile(id); if (target) { const convo = await api.startChat(currentUser, target); setViewingProfileId(null); setChatTarget(convo); } }} />}
          </div>
      )}
    </div>
  );
};

export default App;
