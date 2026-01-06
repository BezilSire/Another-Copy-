
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
import { cryptoService } from './services/cryptoService';
import { RadarModal } from './components/RadarModal';
import { LedgerPage } from './components/LedgerPage';

const BootSequence: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const sequence = ["> BOOTING UBUNTIUM_CORE_v5.2.1...", "> INITIALIZING CRYPTO_LAYER...", "> SYNCING_GLOBAL_DAG...", "> RESOLVING_SOVEREIGN_ID...", "> WELCOME CITIZEN."];
  useEffect(() => {
    let i = 0;
    const interval = window.setInterval(() => { if (i < sequence.length) { setLogs(prev => [...prev, sequence[i]]); i++; } else { window.clearInterval(interval); setTimeout(onComplete, 300); } }, 40); // Faster boot
    return () => window.clearInterval(interval);
  }, [onComplete]);
  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8 font-mono text-brand-gold">
      <div className="w-24 h-24 mb-16 relative"><LogoIcon className="h-full w-full text-brand-gold animate-pulse" /><div className="absolute inset-0 border border-brand-gold/20 rounded-full animate-ping scale-150 opacity-20"></div></div>
      <div className="w-full max-w-xs space-y-2 border-l-2 border-brand-gold/30 pl-6"> {logs.map((log, idx) => ( <div key={idx} className="text-[10px] tracking-widest font-black uppercase text-brand-gold/90 animate-fade-in">{log}</div> ))} <div className="w-2.5 h-3.5 bg-brand-gold animate-terminal-cursor mt-2 shadow-[0_0_10px_#D4AF37]"></div> </div>
    </div>
  );
};

const App: React.FC = () => {
  const { currentUser, isLoadingAuth, isProcessingAuth, logout, updateUser, firebaseUser } = useAuth();
  
  const isExplorer = process.env.SITE_MODE === 'EXPLORER';
  
  const [isBooting, setIsBooting] = useState(false); 
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState<Conversation | 'main' | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [forceView, setForceView] = useState<string | null>(null);

  const [hasSkippedProfile, setHasSkippedProfile] = useState(() => sessionStorage.getItem('ugc_skip_anchor') === 'true');

  const handleSkipProfile = () => {
      sessionStorage.setItem('ugc_skip_anchor', 'true');
      setHasSkippedProfile(true);
  };

  useEffect(() => {
    if (currentUser && !firebaseUser?.isAnonymous) {
        const unsubNotifs = api.listenForNotifications(currentUser.id, (notifications) => setUnreadNotificationCount(notifications.filter(n => !n.read).length));
        return () => unsubNotifs();
    }
  }, [currentUser, firebaseUser]);

  const confirmLogout = async () => { 
      sessionStorage.removeItem('ugc_skip_anchor');
      await logout(); 
      setIsLogoutConfirmOpen(false); 
      window.location.reload(); 
  };
  
  const handleOpenChat = () => setChatTarget('main');
  const handleOpenMeet = () => setForceView('meeting');
  const handleOpenVote = () => setForceView('governance');
  const handleViewProfile = (userId: string | null) => { setChatTarget(null); setViewingProfileId(userId); };
  
  const renderMainContent = () => {
    if (isExplorer) return <LedgerPage />;
    if (isBooting) return null;
    
    if (currentUser || firebaseUser) {
        const userToRender = currentUser || ({ 
            id: firebaseUser?.uid, 
            name: firebaseUser?.email?.split('@')[0] || 'Citizen', 
            role: 'member', 
            status: 'active',
            circle: 'GLOBAL',
            isProfileComplete: false,
            ccap: 0,
            ubtBalance: 0,
            distress_calls_available: 0
        } as any);

        if (chatTarget) return <ChatsPage user={userToRender} initialTarget={chatTarget === 'main' ? null : chatTarget as Conversation | null} onClose={() => setChatTarget(null)} onViewProfile={handleViewProfile} onNewMessageClick={() => {}} onNewGroupClick={() => {}} />;
        if (viewingProfileId) return <div className="main-container py-10"><PublicProfile userId={viewingProfileId} currentUser={userToRender} onBack={() => setViewingProfileId(null)} onStartChat={async (id) => { const target = await api.getPublicUserProfile(id); if (target) { const convo = await api.startChat(userToRender, target); setViewingProfileId(null); setChatTarget(convo); } }} onViewProfile={(id) => setViewingProfileId(id)} isAdminView={userToRender.role === 'admin'} /></div>;
        
        if (!userToRender.isProfileComplete && !firebaseUser?.isAnonymous && !hasSkippedProfile) {
            return (
                <div className="main-container py-12">
                    <CompleteProfilePage 
                        user={userToRender} 
                        onProfileComplete={async (data) => { await updateUser(data); }} 
                        onCancel={handleSkipProfile}
                    />
                </div>
            );
        }
        
        if (userToRender.role === 'admin') return <AdminDashboard user={userToRender as Admin} onUpdateUser={updateUser} unreadCount={unreadNotificationCount} onOpenChat={handleOpenChat} onViewProfile={handleViewProfile} />;
        if (userToRender.role === 'agent') return <AgentDashboard user={userToRender as Agent} broadcasts={[]} onUpdateUser={updateUser} activeView="dashboard" setActiveView={() => {}} onViewProfile={handleViewProfile} />;
        return <MemberDashboard user={userToRender as MemberUser} onUpdateUser={updateUser} unreadCount={unreadNotificationCount} onLogout={() => setIsLogoutConfirmOpen(true)} onViewProfile={handleViewProfile} forcedView={forceView} clearForcedView={() => setForceView(null)} />;
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
                <div className="space-y-4">
                    <div className="text-[10px] uppercase font-black tracking-[0.5em] text-white/30 font-mono italic">Synchronizing_Protocol_State</div>
                    <div className="w-48 h-1 bg-white/5 mx-auto rounded-full overflow-hidden">
                        <div className="h-full bg-brand-gold/40 animate-scan-move"></div>
                    </div>
                </div>
            </div>
        );
    }

    return <AuthPage />;
  };

  return (
    <div className={`flex flex-col min-h-screen selection:bg-brand-gold/30 bg-black`}>
      {!isExplorer && isBooting && <BootSequence onComplete={() => setIsBooting(false)} />}
      {(isExplorer || !isBooting) && (
          <div className="flex-1 flex flex-col animate-fade-in">
            { (currentUser || firebaseUser) && !firebaseUser?.isAnonymous && !isExplorer && (
                <Header 
                    user={currentUser || { name: 'Citizen', role: 'member' } as any} 
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
            <ConfirmationDialog isOpen={isLogoutConfirmOpen} onClose={() => setIsLogoutConfirmOpen(false)} onConfirm={confirmLogout} title="Disconnect Node" message="End your secure session with the global ledger?" confirmButtonText="Terminate" />
            {isRadarOpen && currentUser && <RadarModal isOpen={isRadarOpen} onClose={() => setIsRadarOpen(false)} currentUser={currentUser} onViewProfile={handleViewProfile} onStartChat={async (id) => { const target = await api.getPublicUserProfile(id); if (target) { const convo = await api.startChat(currentUser, target); setViewingProfileId(null); setChatTarget(convo); } }} />}
          </div>
      )}
    </div>
  );
};

export default App;
