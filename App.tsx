
import { useState, useEffect } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { MemberDashboard } from './components/MemberDashboard';
import { AuthPage } from './components/AuthPage';
import { Header } from './components/Header';
import { User, MemberUser, Admin } from './types';
import { ToastContainer } from './components/Toast';
import { api } from './services/apiService';
import { useAuth } from './contexts/AuthContext';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { PublicProfile } from './components/PublicProfile';
import { LogoIcon } from './components/icons/LogoIcon';
import { LoaderIcon } from './components/icons/LoaderIcon';
import { cryptoService } from './services/cryptoService';
import { RadarModal } from './components/RadarModal';
import { LedgerPage } from './components/LedgerPage';
import { RecoverySetup } from './components/RecoverySetup';

import { AgenticShell } from './components/AgenticShell';
import { GuardianOracle } from './components/GuardianOracle';

const App = () => {
  const { currentUser, isLoadingAuth, isProcessingAuth, logout, updateUser, firebaseUser, isAuthReady } = useAuth();
  
  const isExplorer = false; // Forced to false to ensure login page shows
  
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [chatTargetId, setChatTargetId] = useState<string | null>(null);
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'oracle'>('dashboard');
  const [forceView, setForceView] = useState<string | null>(null);
  const [isRecoverySetupOpen, setIsRecoverySetupOpen] = useState(false);

  const [hasSkippedProfile, setHasSkippedProfile] = useState(() => {
    try {
        return sessionStorage.getItem('ugc_skip_anchor') === 'true';
    } catch (e) {
        return false;
    }
  });

  const handleSkipProfile = () => {
      try {
          sessionStorage.setItem('ugc_skip_anchor', 'true');
      } catch (e) {}
      setHasSkippedProfile(true);
  };

  useEffect(() => {
    if (currentUser && !firebaseUser?.isAnonymous) {
        const unsubNotifs = api.listenForNotifications(currentUser.id, (notifications) => setUnreadNotificationCount(notifications.filter(n => !n.read).length));
        return () => unsubNotifs();
    }
  }, [currentUser, firebaseUser]);

  const confirmLogout = async () => { 
      try {
          sessionStorage.removeItem('ugc_skip_anchor');
      } catch (e) {}
      await logout(); 
      setIsLogoutConfirmOpen(false); 
      window.location.reload(); 
  };
  
  const handleViewProfile = (userId: string | null) => { setViewingProfileId(userId); };
  
  const renderMainContent = () => {
    if (!isAuthReady) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-950 min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <LoaderIcon className="w-12 h-12 text-brand-gold animate-spin" />
                    <p className="text-slate-400 font-mono text-sm animate-pulse">Initializing Identity Protocol...</p>
                </div>
            </div>
        );
    }

    if (isExplorer) return <LedgerPage />;
    
    if (currentUser || firebaseUser) {
        const userToRender = currentUser || ({ 
            id: firebaseUser?.uid, 
            name: firebaseUser?.email?.split('@')[0] || 'Citizen', 
            role: 'member', 
            status: 'active',
            circle: 'GLOBAL',
            isProfileComplete: true
        } as any);

        if (viewingProfileId) return <div className="main-container py-10"><PublicProfile userId={viewingProfileId} currentUser={userToRender} onBack={() => setViewingProfileId(null)} onStartChat={async (id) => { 
            setChatTargetId(id);
            setViewingProfileId(null);
            setForceView('brain');
            setCurrentView('dashboard');
        }} onViewProfile={(id) => setViewingProfileId(id)} isAdminView={userToRender.role === 'admin'} /></div>;
        
        if (currentView === 'oracle') {
            return <GuardianOracle user={userToRender} onBack={() => setCurrentView('dashboard')} />;
        }

        if (isRecoverySetupOpen) {
            return (
                <div className="main-container py-12 flex items-center justify-center min-h-[80vh]">
                    <RecoverySetup 
                        user={userToRender} 
                        onComplete={() => setIsRecoverySetupOpen(false)} 
                        onCancel={() => setIsRecoverySetupOpen(false)} 
                    />
                </div>
            );
        }
        
        if (userToRender.role === 'admin') {
            return (
                <AdminDashboard 
                    user={userToRender as Admin} 
                    onUpdateUser={updateUser} 
                    unreadCount={unreadNotificationCount} 
                    onViewProfile={handleViewProfile}
                    onLogout={() => setIsLogoutConfirmOpen(true)}
                    forcedView={forceView}
                    clearForcedView={() => setForceView(null)}
                />
            );
        }

        return (
            <MemberDashboard 
                user={userToRender as MemberUser} 
                onUpdateUser={updateUser} 
                unreadCount={unreadNotificationCount} 
                onLogout={() => setIsLogoutConfirmOpen(true)}
                onViewProfile={handleViewProfile}
                forcedView={forceView}
                clearForcedView={() => setForceView(null)}
            />
        );
    }
    
    return <AuthPage />;
  };

  return (
    <div className={`flex flex-col min-h-screen selection:bg-brand-gold/30 bg-slate-950 font-sans`}>
      <div className="flex-1 flex flex-col animate-fade-in">
            <main className="flex-1">{renderMainContent()}</main>
            <ToastContainer />
            <ConfirmationDialog isOpen={isLogoutConfirmOpen} onClose={() => setIsLogoutConfirmOpen(false)} onConfirm={confirmLogout} title="Log Out" message="Are you sure you want to log out of your account?" confirmButtonText="Log Out" />
            {isRadarOpen && currentUser && <RadarModal isOpen={isRadarOpen} onClose={() => setIsRadarOpen(false)} currentUser={currentUser} onViewProfile={handleViewProfile} onStartChat={async (id) => { }} />}
            
            {isProcessingAuth && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-4 p-8 bg-slate-900 rounded-2xl border border-white/10 shadow-2xl">
                        <LoaderIcon className="w-10 h-10 text-brand-gold animate-spin" />
                        <p className="text-slate-300 font-mono text-sm">Processing Identity Protocol...</p>
                    </div>
                </div>
            )}
      </div>
    </div>
  );
};

export default App;
