
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Admin, Agent, Member, Broadcast, Report, User, MemberUser, Conversation, NotificationItem, Post, PayoutRequest, Venture, CommunityValuePool, FilterType as PostFilterType, PublicUserProfile } from '../types';
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

type AdminView = 'dashboard' | 'users' | 'feed' | 'reports' | 'profile' | 'notifications' | 'proposals' | 'payouts' | 'sustenance' | 'ventures' | 'economy' | 'chats' | 'wallet' | 'versions';
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
  
  const [loadedStreamCount, setLoadedStreamCount] = useState(0);
  const [loadingErrors, setLoadingErrors] = useState<string[]>([]);
  const { addToast } = useToast();
  
  const totalStreams = 9; 
  const isInitialLoading = loadedStreamCount < totalStreams;

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [dialogState, setDialogState] = useState<{ isOpen: boolean; member: Member | null; action: 'reset' | 'clear' }>({ isOpen: false, member: null, action: 'reset' });
  const [roleChangeDialog, setRoleChangeDialog] = useState<{ isOpen: boolean; user: User | null; newRole: User['role'] | null }>({ isOpen: false, user: null, newRole: null });
  const [verificationModalState, setVerificationModalState] = useState<{ isOpen: boolean, member: Member | null }>({ isOpen: false, member: null });
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
    api.getBroadcasts().then(data => { setBroadcasts(data); handleStreamLoaded(); }).catch(e => handleError('broadcasts', e));

    return () => {
        unsubUsers(); unsubMembers(); unsubAgents(); unsubPending(); unsubReports();
        unsubPayouts(); unsubVentures(); unsubCvp();
    };
  }, [user]);

  const handleSendBroadcast = async (message: string) => {
    try {
        const newBroadcast = await api.sendBroadcast(user, message);
        setBroadcasts(prev => [newBroadcast, ...prev]);
        addToast('Message dispatched across the commons.', 'success');
    } catch (error) {
        addToast('Dispatch failed. Authority levels insufficient?', 'error');
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

  const renderVersionsView = () => (
    <div className="glass-card p-8 rounded-[2.5rem] animate-fade-in border border-white/5">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Protocol Versions</h2>
                <p className="text-gray-500 text-sm mt-1">Manage network stability and logic rollbacks.</p>
            </div>
            <div className="px-4 py-2 bg-green-950/30 border border-green-500/30 rounded-xl">
                 <p className="text-[10px] font-black text-green-400 tracking-[0.2em] uppercase">Status: Optimal</p>
            </div>
        </div>

        <div className="space-y-4">
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex justify-between items-center group hover:bg-white/[0.04] transition-all">
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-brand-gold/10 rounded-2xl flex items-center justify-center border border-brand-gold/20">
                        <ClockIcon className="h-6 w-6 text-brand-gold" />
                    </div>
                    <div>
                        <p className="text-white font-bold tracking-tight">v2.5.0-ALPHA (Current)</p>
                        <p className="text-xs text-gray-500 font-mono">Build ID: 20250524-COMMONS</p>
                    </div>
                </div>
                <span className="text-[10px] font-black text-gray-600 tracking-widest uppercase">Active Protocol</span>
            </div>

            <div className="p-6 bg-white/[0.01] border border-white/5 rounded-3xl flex justify-between items-center group hover:border-blue-500/50 transition-all cursor-pointer">
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                        <ClockIcon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-gray-300 font-bold tracking-tight">v2.4.8 (Stable Legacy)</p>
                        <p className="text-xs text-gray-600 font-mono">Build ID: 20250518-STABLE</p>
                    </div>
                </div>
                <button className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg transition-all opacity-0 group-hover:opacity-100">Restore</button>
            </div>

            <div className="p-6 bg-white/[0.01] border border-white/5 rounded-3xl flex justify-between items-center group hover:border-blue-500/50 transition-all cursor-pointer text-gray-700">
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-slate-700/10 rounded-2xl flex items-center justify-center border border-white/5">
                        <ClockIcon className="h-6 w-6 text-slate-700" />
                    </div>
                    <div>
                        <p className="font-bold tracking-tight text-slate-700">v2.4.0 (Archived)</p>
                        <p className="text-xs font-mono text-slate-800">Build ID: 20250510-PROD</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-8 p-4 bg-red-950/20 border border-red-900/30 rounded-2xl flex gap-4 items-start">
             <AlertTriangleIcon className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
             <p className="text-xs text-red-200/70 leading-relaxed italic">
                Rollback warning: This will revert core network logic. User data is persistent, but UI behaviors and state handling will shift to the previous version immediately.
             </p>
        </div>
    </div>
  );

  const renderActiveView = () => {
    switch (view) {
        case 'dashboard': return <Dashboard user={user} users={allUsers} agents={agents} members={members} pendingMembers={pendingMembers} reports={reports} broadcasts={broadcasts} payouts={payouts} ventures={ventures} cvp={cvp} onSendBroadcast={handleSendBroadcast} />;
        case 'versions': return renderVersionsView();
        case 'profile': return <AdminProfile user={user} onUpdateUser={onUpdateUser} />;
        case 'feed': return ( <> <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} isAdminView /><PostsFeed user={user} feedType="all" isAdminView onViewProfile={onViewProfile} typeFilter={typeFilter} /></> );
        default: return <div className="text-center py-20 text-gray-500">Module [ {view.toUpperCase()} ] loading...</div>;
    }
  };

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Command Center</h1>
              <p className="text-brand-gold text-xs font-black uppercase tracking-[0.3em] mt-3">Ubuntium Administrator Protocol</p>
          </div>
          <div className="border-b border-white/10 w-full md:w-auto">
              <nav className="-mb-px flex space-x-6 sm:space-x-8 overflow-x-auto no-scrollbar" aria-label="Tabs">
                  <TabButton label="Operations" icon={<LayoutDashboardIcon/>} isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
                  <TabButton label="Versions" icon={<ClockIcon/>} isActive={view === 'versions'} onClick={() => setView('versions')} />
                  <TabButton label="Global Feed" icon={<MessageSquareIcon/>} isActive={view === 'feed'} onClick={() => setView('feed')} />
                  <TabButton label="System Profile" icon={<UserCircleIcon/>} isActive={view === 'profile'} onClick={() => setView('profile')} />
              </nav>
          </div>
      </div>

      <div className="mt-6">
          {isInitialLoading ? (
             <div className="flex flex-col items-center justify-center p-20 glass-card rounded-[3rem]">
                <LoaderIcon className="h-12 w-12 text-brand-gold animate-spin mb-6" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em]">Synchronizing Network State...</p>
             </div>
          ) : renderActiveView()}
      </div>
    </div>
  );
};
