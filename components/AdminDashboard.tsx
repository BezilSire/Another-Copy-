
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Admin, Agent, Member, Broadcast, Report, User, MemberUser, Conversation, NotificationItem, Post, PayoutRequest, Venture, CommunityValuePool, FilterType as PostFilterType, PublicUserProfile, PendingUbtPurchase, SellRequest } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { MemberList } from './MemberList';
import { Pagination } from './Pagination';
import { UsersIcon } from './icons/UsersIcon';
import { MegaphoneIcon } from './icons/MegaphoneIcon';
import { ConfirmationDialog } from './ConfirmationDialog';
import { VerificationModal } from './VerificationModal';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { ReportsView } from './ReportsView';
import { AdminProfile } from './AdminProfile';
import { PostsFeed } from './PostsFeed';
import { DownloadIcon } from './icons/DownloadIcon';
import { exportToCsv, formatTimeAgo } from '../utils';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { BellIcon } from './icons/BellIcon';
import { NotificationsPage } from './NotificationsPage';
import { LoaderIcon } from './icons/LoaderIcon';
import { PostTypeFilter } from './PostTypeFilter';
import { ProposalsAdminPage } from './ProposalsAdminPage';
import { ScaleIcon } from './icons/ScaleIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { PayoutsAdminPage } from './PayoutsAdminPage';
import { HeartIcon } from './icons/HeartIcon';
import { SustenanceAdminPage } from './SustenanceAdminPage';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { VenturesAdminPage } from './VenturesAdminPage';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { EconomyAdminPage } from './EconomyAdminPage';
import { Dashboard } from './Dashboard';
import { WalletIcon } from './icons/WalletIcon';
import { WalletAdminPage } from './WalletAdminPage';
import { ClockIcon } from './icons/ClockIcon';
import { EcocashVerificationAdmin } from './EcocashVerificationAdmin';
import { LiquidationOracleAdmin } from './LiquidationOracleAdmin';
import { HistoryIcon } from './icons/HistoryIcon';

type AdminView = 'dashboard' | 'users' | 'feed' | 'reports' | 'profile' | 'notifications' | 'proposals' | 'payouts' | 'sustenance' | 'ventures' | 'economy' | 'chats' | 'wallet' | 'versions' | 'oracle' | 'liquidations';
type UserSubView = 'agents' | 'members' | 'roles';

interface AdminDashboardProps {
  user: Admin;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  unreadCount: number;
  onOpenChat: () => void;
  onViewProfile: (userId: string | null) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onUpdateUser, unreadCount, onOpenChat, onViewProfile }) => {
  const [view, setView] = useState<AdminView>('dashboard');
  const [userView, setUserView] = useState<UserSubView>('agents');
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [cvp, setCvp] = useState<CommunityValuePool | null>(null);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<PendingUbtPurchase[]>([]);
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([]);
  
  const [loadedStreamCount, setLoadedStreamCount] = useState(0);
  const [loadingErrors, setLoadingErrors] = useState<string[]>([]);
  const { addToast } = useToast();
  
  const totalStreams = 11; 
  const isInitialLoading = loadedStreamCount < totalStreams;

  const [typeFilter, setTypeFilter] = useState<PostFilterType>('all');

  useEffect(() => {
    setLoadedStreamCount(0);
    setLoadingErrors([]);

    const handleStreamLoaded = () => setLoadedStreamCount(prev => prev + 1);

    const handleError = (dataType: string, error: Error) => {
        console.error(`Error loading ${dataType}:`, error);
        handleStreamLoaded();
    };

    const unsubUsers = api.listenForAllUsers(user, (data) => { setAllUsers(data); handleStreamLoaded(); }, (e) => handleError('all users', e));
    const unsubMembers = api.listenForAllMembers(user, (data) => { setMembers(data); handleStreamLoaded(); }, (e) => handleError('members', e));
    const unsubAgents = api.listenForAllAgents(user, (data) => { setAgents(data); handleStreamLoaded(); }, (e) => handleError('agents', e));
    const unsubPending = api.listenForPendingMembers(user, (data) => { setPendingMembers(data); handleStreamLoaded(); }, (e) => handleError('pending members', e));
    const unsubReports = api.listenForReports(user, (data) => { setReports(data); handleStreamLoaded(); }, (e) => handleError('reports', e));
    const unsubPayouts = api.listenForPayoutRequests(user, (data) => { setPayouts(data); handleStreamLoaded(); }, (e) => handleError('payouts', e));
    const unsubVentures = api.listenForVentures(user, (data) => { setVentures(data); handleStreamLoaded(); }, (e) => handleError('ventures', e));
    const unsubCvp = api.listenForCVP(user, (data) => { setCvp(data); handleStreamLoaded(); }, (e) => handleError('cvp', e));
    const unsubOracle = api.listenForPendingPurchases((data) => { setPendingPurchases(data); handleStreamLoaded(); });
    const unsubLiq = api.listenToSellRequests((data) => { setSellRequests(data); handleStreamLoaded(); });
    api.getBroadcasts().then(data => { setBroadcasts(data); handleStreamLoaded(); }).catch(e => handleError('broadcasts', e));

    return () => {
        unsubUsers(); unsubMembers(); unsubAgents(); unsubPending(); unsubReports();
        unsubPayouts(); unsubVentures(); unsubCvp(); unsubOracle(); unsubLiq();
    };
  }, [user]);

  const handleSendBroadcast = async (message: string) => {
    try {
        const newBroadcast = await api.sendBroadcast(user, message);
        setBroadcasts(prev => [newBroadcast, ...prev]);
        addToast('Protocol broadcast dispatched successfully.', 'success');
    } catch (error) {
        addToast('Transmission failed. Authority levels check failed.', 'error');
        throw error;
    }
  };

  const TabButton: React.FC<{label: string, count?: number, isActive: boolean, onClick: () => void, icon: React.ReactNode}> = ({ label, count, isActive, onClick, icon }) => (
    <button onClick={onClick} className={`${isActive ? 'border-brand-gold text-brand-gold gold-glow-text' : 'border-transparent text-gray-500 hover:text-gray-300'} group inline-flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-black text-xs uppercase tracking-widest transition-all`}>
        <span className="mr-2 h-4 w-4">{icon}</span>
        {label}
        {count !== undefined && count > 0 && <span className="ml-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>}
    </button>
  );

  const renderVersionControl = () => (
      <div className="space-y-8 animate-fade-in">
          <div className="glass-card p-10 rounded-[3rem] border-white/5 space-y-6">
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase gold-text leading-none">Temporal Ledger</h2>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Rollback & State Recovery Protocols</p>
              
              <div className="space-y-4 pt-6">
                  {[
                      { v: "2.5.0", label: "Identity Vault & QR Logic", date: "Present", active: true },
                      { v: "2.4.8", label: "Pulse Hub Implementation", date: "2 hours ago", active: false },
                      { v: "2.4.0", label: "Venture Marketplace Alpha", date: "Yesterday", active: false },
                      { v: "2.0.0", label: "Core Node Architecture", date: "3 days ago", active: false }
                  ].map((ver) => (
                      <div key={ver.v} className={`p-6 rounded-[2rem] border border-white/5 flex justify-between items-center transition-all ${ver.active ? 'bg-brand-gold/10 border-brand-gold/20' : 'bg-black/40 hover:bg-black/60'}`}>
                          <div className="flex items-center gap-6">
                              <span className={`font-mono text-xl font-black ${ver.active ? 'text-brand-gold' : 'text-gray-600'}`}>v{ver.v}</span>
                              <div>
                                  <p className="font-black text-white text-sm uppercase tracking-widest">{ver.label}</p>
                                  <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Snapshot Anchored: {ver.date}</p>
                              </div>
                          </div>
                          {!ver.active ? (
                              <button 
                                onClick={() => addToast(`Initiating rollback sequence to v${ver.v}...`, "info")}
                                className="px-6 py-3 bg-white/5 hover:bg-red-500 hover:text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                              >
                                  Revert State
                              </button>
                          ) : (
                              <div className="flex items-center gap-2 text-green-500">
                                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                  <span className="text-[10px] font-black uppercase tracking-widest">Active Node</span>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const renderActiveView = () => {
    switch (view) {
        case 'dashboard': return <Dashboard user={user} users={allUsers} agents={agents} members={members} pendingMembers={pendingMembers} reports={reports} broadcasts={broadcasts} payouts={payouts} ventures={ventures} cvp={cvp} onSendBroadcast={handleSendBroadcast} />;
        case 'oracle': return (
            <div className="space-y-8">
                <EcocashVerificationAdmin purchases={pendingPurchases} adminUser={user} />
                <LiquidationOracleAdmin requests={sellRequests} adminUser={user} />
            </div>
        );
        case 'versions': return renderVersionControl();
        case 'profile': return <AdminProfile user={user} onUpdateUser={onUpdateUser} />;
        case 'feed': return ( <> <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} isAdminView /><PostsFeed user={user} feedType="all" isAdminView onViewProfile={onViewProfile} typeFilter={typeFilter} /></> );
        default: return <div className="text-center py-20 text-gray-500 uppercase tracking-widest font-black opacity-50">Module [ {view.toUpperCase()} ] loading...</div>;
    }
  };

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto px-4 bg-transparent pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none gold-text">Command Center</h1>
              <p className="text-brand-gold text-[10px] font-black uppercase tracking-[0.4em] mt-3">Ubuntium Network Authority Node</p>
          </div>
          <div className="border-b border-white/10 w-full md:w-auto overflow-x-auto no-scrollbar">
              <nav className="-mb-px flex space-x-6 sm:space-x-8" aria-label="Tabs">
                  <TabButton label="Operations" icon={<LayoutDashboardIcon/>} isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
                  <TabButton label="Financial Oracle" icon={<DollarSignIcon/>} isActive={view === 'oracle'} count={pendingPurchases.length + sellRequests.filter(r => r.status === 'PENDING').length} onClick={() => setView('oracle')} />
                  <TabButton label="Snapshots" icon={<HistoryIcon/>} isActive={view === 'versions'} onClick={() => setView('versions')} />
                  <TabButton label="Global Pulse" icon={<MessageSquareIcon/>} isActive={view === 'feed'} onClick={() => setView('feed')} />
                  <TabButton label="System" icon={<UserCircleIcon/>} isActive={view === 'profile'} onClick={() => setView('profile')} />
              </nav>
          </div>
      </div>

      <div className="mt-6">
          {isInitialLoading ? (
             <div className="flex flex-col items-center justify-center p-20 glass-card rounded-[3rem] border border-white/5 shadow-2xl">
                <LoaderIcon className="h-12 w-12 text-brand-gold animate-spin mb-6" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] animate-pulse">Synchronizing Global Commons Node...</p>
             </div>
          ) : renderActiveView()}
      </div>
    </div>
  );
};
