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


type AdminView = 'dashboard' | 'users' | 'feed' | 'reports' | 'profile' | 'notifications' | 'proposals' | 'payouts' | 'sustenance' | 'ventures' | 'economy' | 'chats' | 'wallet';
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
  
  const totalStreams = 9; // Total data streams to load
  const isInitialLoading = loadedStreamCount < totalStreams;

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [dialogState, setDialogState] = useState<{ isOpen: boolean; member: Member | null; action: 'reset' | 'clear' }>({ isOpen: false, member: null, action: 'reset' });
  const [roleChangeDialog, setRoleChangeDialog] = useState<{ isOpen: boolean; user: User | null; newRole: User['role'] | null }>({ isOpen: false, user: null, newRole: null });
  const [verificationModalState, setVerificationModalState] = useState<{ isOpen: boolean, member: Member | null }>({ isOpen: false, member: null });
  const [typeFilter, setTypeFilter] = useState<PostFilterType>('all');
  
  useEffect(() => {
    // Reset loading state for each new cycle (e.g., if user object changes)
    setLoadedStreamCount(0);
    setLoadingErrors([]);

    const handleStreamLoaded = () => setLoadedStreamCount(prev => prev + 1);

    const handleError = (dataType: string, error: Error) => {
        console.error(`Error loading ${dataType}:`, error);
        const message = `Could not load ${dataType}. This might be a permissions issue.`;
        setLoadingErrors(prevErrors => {
            if (!prevErrors.includes(message)) {
                addToast(message, 'error');
                return [...prevErrors, message];
            }
            return prevErrors;
        });
        handleStreamLoaded(); // Count as "loaded" even on error to prevent infinite loading
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
  }, [user, addToast]);
  
  const handleStartChat = async (targetUser: PublicUserProfile) => {
    try {
        await api.startChat(user, targetUser);
        addToast(`Chat with ${targetUser.name} started!`, 'success');
        onOpenChat();
    } catch (error) { addToast("Failed to start chat.", "error"); }
  };
  
  const handleNavigate = (item: NotificationItem) => {
      switch (item.type) {
          case 'NEW_MESSAGE': case 'NEW_CHAT':
              onOpenChat();
              break;
          case 'POST_LIKE': case 'NEW_MEMBER': case 'NEW_POST_OPPORTUNITY': case 'NEW_POST_PROPOSAL':
          case 'NEW_POST_GENERAL': case 'NEW_POST_OFFER': case 'KNOWLEDGE_APPROVED':
              const targetId = item.itemType === 'notification' ? item.causerId : item.link;
              onViewProfile(targetId);
              break;
          default:
              addToast("Navigation for this notification is not available.", "info");
      }
  };

  const handleSendBroadcast = async (message: string) => {
    try {
        const newBroadcast = await api.sendBroadcast(user, message);
        setBroadcasts(prev => [newBroadcast, ...prev]);
        addToast('Broadcast sent successfully!', 'success');
    } catch (error) {
        addToast('Failed to send broadcast.', 'error');
        throw error;
    }
  };

  const enrichedMembers = useMemo(() => {
    const userMap = new Map<string, User>(allUsers.map(u => [u.id, u]));
    return members.map(member => {
      if (member.uid) {
        const userProfile = userMap.get(member.uid) as MemberUser | undefined;
        if (userProfile) {
          return { ...member, status: userProfile.status, distress_calls_available: userProfile.distress_calls_available, };
        }
      }
      return member;
    });
  }, [members, allUsers]);
  
  const agentsWithStats = useMemo(() => {
    return agents.map(agent => {
      const agentMembers = members.filter(m => m.agent_id === agent.id);
      return { ...agent, memberCount: agentMembers.length, commission: agentMembers.filter(m => m.payment_status === 'complete').reduce((s, m) => s + m.registration_amount * 0.10, 0) };
    });
  }, [agents, members]);
  
  const handleMarkComplete = async (member: Member) => {
    if (window.confirm(`Mark ${member.full_name}'s payment as complete?`)) {
        try { await api.updatePaymentStatus(user, member.id, 'complete'); addToast("Payment status updated.", "success"); } 
        catch { addToast("Failed to update payment status.", "error"); }
    }
  };
  
   const handleResetQuota = async () => {
        if (!dialogState.member?.uid) return;
        try { await api.resetDistressQuota(user, dialogState.member.uid); addToast(`Distress quota reset for ${dialogState.member.full_name}.`, 'success'); } 
        catch { addToast("Failed to reset quota.", "error"); }
        setDialogState({ isOpen: false, member: null, action: 'reset' });
    };

    const handleClearPost = async () => {
        if (!dialogState.member?.uid) return;
        try { await api.clearLastDistressPost(user, dialogState.member.uid); addToast(`Last distress post cleared for ${dialogState.member.full_name}.`, 'success'); } 
        catch { addToast("Failed to clear post.", "error"); }
        setDialogState({ isOpen: false, member: null, action: 'clear' });
    };

    const handleApproveMember = async (member: Member, ubtAmount: number) => {
        try { 
            await api.approveMemberAndCreditUbt(user, member, ubtAmount);
            addToast(`${member.full_name} has been approved and credited ${ubtAmount} $UBT.`, 'success'); 
            setVerificationModalState({ isOpen: false, member: null }); 
        } 
        catch (e) { 
            addToast(`Approval failed: ${e instanceof Error ? e.message : "An error occurred."}`, 'error'); 
            throw e; 
        }
    }

    const handleRejectMember = async (member: Member) => {
        try { await api.rejectMember(user, member); addToast(`${member.full_name}'s registration rejected.`, 'info'); setVerificationModalState({ isOpen: false, member: null }); } 
        catch (e) { addToast(`Rejection failed: ${e instanceof Error ? e.message : "An error occurred."}`, 'error'); throw e; }
    }
    
    const handleRoleChangeRequest = (user: User, newRole: User['role']) => setRoleChangeDialog({ isOpen: true, user, newRole });

    const handleRoleChangeConfirm = async () => {
        const { user: u, newRole } = roleChangeDialog;
        if (!u || !newRole) return;
        try { await api.updateUserRole(user, u.id, newRole); addToast(`${u.name}'s role updated to ${newRole}.`, 'success'); } 
        catch { addToast('Failed to update user role.', 'error'); }
        setRoleChangeDialog({ isOpen: false, user: null, newRole: null });
    };

    const handleDownloadAgents = () => {
        if (agentsWithStats.length === 0) { addToast('No agents to export.', 'info'); return; }
        exportToCsv(`all-agents-${new Date().toISOString().split('T')[0]}.csv`, agentsWithStats.map(({ name, email, agent_code, circle, memberCount, commission }) => ({ name, email, agent_code, circle, member_count: memberCount, total_commission: commission.toFixed(2) })));
        addToast('Agent data is downloading.', 'info');
    };
    
    const handleDownloadMembers = () => {
        if (enrichedMembers.length === 0) { addToast('No members to export.', 'info'); return; }
        exportToCsv(`all-members-${new Date().toISOString().split('T')[0]}.csv`, enrichedMembers.map(({ welcome_message, ...rest }) => ({ ...rest, agent_name: rest.agent_id === 'PUBLIC_SIGNUP' ? 'Self-Registered' : rest.agent_name })));
        addToast('Member data is downloading.', 'info');
    };

    const newReportsCount = useMemo(() => reports.filter(r => r.status === 'new').length, [reports]);

    const filteredItems = useMemo(() => {
        let list: any[] = [];
        if (view === 'users') {
            if (userView === 'members') list = enrichedMembers;
            else if (userView === 'agents') list = agentsWithStats;
            else if (userView === 'roles') list = allUsers;
        }
        if (!searchQuery) return list;
        return list.filter(item => (item.full_name || item.name).toLowerCase().includes(searchQuery.toLowerCase()) || item.email.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [enrichedMembers, agentsWithStats, allUsers, searchQuery, view, userView]);

    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const paginatedItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    
    const TabButton: React.FC<{label: string, count?: number, isActive: boolean, onClick: () => void, icon: React.ReactNode}> = ({ label, count, isActive, onClick, icon }) => (
        <button onClick={onClick} className={`${isActive ? 'border-green-500 text-green-400' : 'border-transparent text-gray-400 hover:text-gray-200'} group inline-flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
            <span className="mr-2 h-5 w-5">{icon}</span>
            {label}
            {count !== undefined && count > 0 && <span className="ml-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>}
        </button>
    );

    const renderUsersView = () => (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
                 <div className="flex space-x-1 bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setUserView('agents')} className={`px-4 py-2 text-sm font-medium rounded-md ${userView === 'agents' ? 'bg-slate-900 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>Agents</button>
                    <button onClick={() => setUserView('members')} className={`px-4 py-2 text-sm font-medium rounded-md ${userView === 'members' ? 'bg-slate-900 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>Members</button>
                    <button onClick={() => setUserView('roles')} className={`px-4 py-2 text-sm font-medium rounded-md ${userView === 'roles' ? 'bg-slate-900 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>Role Management</button>
                 </div>
                 <button onClick={userView === 'agents' ? handleDownloadAgents : handleDownloadMembers} className={`inline-flex items-center px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 ${userView === 'roles' && 'hidden'}`}>
                    <DownloadIcon className="h-4 w-4 mr-2" /> Download CSV
                 </button>
            </div>
            <input type="text" placeholder={`Search ${userView}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full max-w-sm bg-slate-700 p-2 rounded-md text-white mb-4" />
            
            <>
                {userView === 'agents' && (
                    <div className="flow-root">
                        <table className="min-w-full divide-y divide-slate-700">
                            <thead><tr><th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-0">Name</th><th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Contact</th><th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Circle</th><th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Members</th><th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Commission</th></tr></thead>
                            <tbody className="divide-y divide-slate-700">
                                {(paginatedItems as (Agent & { memberCount: number, commission: number })[]).map(agent => (
                                    <tr key={agent.id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0"><button onClick={() => onViewProfile(agent.id)} className="hover:underline">{agent.name}</button></td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{agent.email}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{agent.circle}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{agent.memberCount}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">${agent.commission.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {userView === 'members' && (
                    <MemberList members={(filteredItems as Member[])} isAdminView onMarkAsComplete={handleMarkComplete} onResetQuota={(m) => setDialogState({isOpen: true, member: m, action: 'reset'})} onClearDistressPost={(m) => setDialogState({isOpen: true, member: m, action: 'clear'})} onSelectMember={(m) => m.payment_status === 'pending_verification' && setVerificationModalState({ isOpen: true, member: m })} onViewProfile={onViewProfile} />
                )}
                {userView === 'roles' && (
                     <div className="flow-root">
                        <table className="min-w-full divide-y divide-slate-700">
                            <thead><tr><th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-0">Name</th><th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Email</th><th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Current Role</th><th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Last Seen</th><th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Change Role To</th></tr></thead>
                            <tbody className="divide-y divide-slate-700">
                                {(paginatedItems as User[]).map(u => (
                                    <tr key={u.id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0"><button onClick={() => onViewProfile(u.id)} className="hover:underline">{u.name}</button></td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{u.email}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400 capitalize">{u.role}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{u.lastSeen ? formatTimeAgo(u.lastSeen.toDate().toISOString()) : 'N/A'}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm"><select value={u.role} onChange={(e) => handleRoleChangeRequest(u, e.target.value as User['role'])} className="bg-slate-700 text-white rounded-md p-1 border border-slate-600 focus:ring-green-500 focus:border-green-500"><option value="member">Member</option><option value="agent">Agent</option><option value="admin">Admin</option></select></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {userView !== 'members' && ( <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredItems.length} itemsPerPage={ITEMS_PER_PAGE} /> )}
            </>
        </div>
    );

    const renderActiveView = () => {
        switch (view) {
            case 'dashboard': return <Dashboard user={user} users={allUsers} agents={agents} members={members} pendingMembers={pendingMembers} reports={reports} broadcasts={broadcasts} payouts={payouts} ventures={ventures} cvp={cvp} onSendBroadcast={handleSendBroadcast} />;
            case 'users': return renderUsersView();
            case 'wallet': return <WalletAdminPage adminUser={user} allUsers={allUsers} />;
            case 'feed': return ( <> <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} isAdminView /><PostsFeed user={user} feedType="all" isAdminView onViewProfile={onViewProfile} typeFilter={typeFilter} /></> );
            case 'reports': return <div className="bg-slate-800 p-6 rounded-lg shadow-lg"><ReportsView reports={reports} onViewProfile={onViewProfile} onResolve={(reportId, postId, authorId) => api.resolvePostReport(user, reportId, postId, authorId)} onDismiss={(reportId) => api.dismissReport(user, reportId)}/></div>;
            case 'proposals': return <ProposalsAdminPage user={user} />;
            case 'payouts': return <PayoutsAdminPage payouts={payouts} />;
            case 'sustenance': return <SustenanceAdminPage user={user} />;
            case 'ventures': return <VenturesAdminPage user={user} ventures={ventures} />;
            case 'economy': return <EconomyAdminPage user={user} cvp={cvp} users={allUsers} />;
            case 'profile': return <AdminProfile user={user} onUpdateUser={onUpdateUser} />;
            case 'notifications': return <NotificationsPage user={user} onNavigate={handleNavigate} onViewProfile={onViewProfile} />;
            case 'chats': onOpenChat(); return null;
            default: return <Dashboard user={user} users={allUsers} agents={agents} members={members} pendingMembers={pendingMembers} reports={reports} broadcasts={broadcasts} payouts={payouts} ventures={ventures} cvp={cvp} onSendBroadcast={handleSendBroadcast} />;
        }
    };

    const mainContent = () => {
        if (isInitialLoading) {
            return ( <div className="flex flex-col items-center justify-center p-12 bg-slate-800 rounded-lg"><LoaderIcon className="h-12 w-12 text-green-500 animate-spin" /><p className="mt-4 text-lg text-gray-300">Loading dashboard data...</p></div> );
        }

        if (loadingErrors.length > 0 && !isInitialLoading) {
            return (
                <div className="p-6 bg-red-900/50 border border-red-700 rounded-lg text-center">
                    <h2 className="text-2xl font-bold text-red-400">Data Loading Error</h2>
                    <p className="mt-2 text-gray-300">Some data could not be loaded. This may be due to account permissions or network issues.</p>
                    <ul className="mt-4 text-left bg-slate-900/50 p-4 rounded-md space-y-2">{loadingErrors.map((err, i) => (<li key={i} className="text-red-300 text-sm list-disc list-inside">{err}</li>))}</ul>
                    <p className="mt-4 text-gray-400 text-sm">Please refresh. If the problem persists, contact an administrator.</p>
                </div>
            );
        }
        return renderActiveView();
    };

  return (
    <div className="space-y-8 animate-fade-in">
        <ConfirmationDialog isOpen={dialogState.isOpen} onClose={() => setDialogState({ isOpen: false, member: null, action: 'reset' })} onConfirm={dialogState.action === 'reset' ? handleResetQuota : handleClearPost} title={dialogState.action === 'reset' ? "Reset Quota?" : "Clear Last Post?"} message={`Are you sure you want to ${dialogState.action === 'reset' ? 'reset the monthly distress call quota' : 'clear the last distress post'} for ${dialogState.member?.full_name}?`} confirmButtonText={dialogState.action === 'reset' ? "Reset Quota" : "Clear Post"} />
        <ConfirmationDialog isOpen={roleChangeDialog.isOpen} onClose={() => setRoleChangeDialog({ isOpen: false, user: null, newRole: null })} onConfirm={handleRoleChangeConfirm} title="Confirm Role Change" message={`Are you sure you want to change ${roleChangeDialog.user?.name}'s role to "${roleChangeDialog.newRole}"?`} confirmButtonText="Confirm Change" />
        {verificationModalState.member && ( <VerificationModal isOpen={verificationModalState.isOpen} onClose={() => setVerificationModalState({isOpen: false, member: null})} member={verificationModalState.member} onApprove={handleApproveMember} onReject={handleRejectMember} /> )}
      
        <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <div className="mt-4 border-b border-slate-700">
                <nav className="-mb-px flex space-x-6 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
                    <TabButton label="Dashboard" icon={<LayoutDashboardIcon/>} isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
                    <TabButton label="Users" icon={<UsersIcon/>} isActive={view === 'users'} onClick={() => setView('users')} />
                    <TabButton label="Wallet" icon={<WalletIcon/>} isActive={view === 'wallet'} onClick={() => setView('wallet')} />
                    <TabButton label="Feed" icon={<MessageSquareIcon/>} isActive={view === 'feed'} onClick={() => setView('feed')} />
                    <TabButton label="Chats" icon={<MessageSquareIcon/>} isActive={view === 'chats'} onClick={() => setView('chats')} />
                    <TabButton label="Proposals" icon={<ScaleIcon/>} isActive={view === 'proposals'} onClick={() => setView('proposals')} />
                    <TabButton label="Ventures" icon={<TrendingUpIcon/>} isActive={view === 'ventures'} onClick={() => setView('ventures')} />
                    <TabButton label="Economy" icon={<DatabaseIcon/>} isActive={view === 'economy'} onClick={() => setView('economy')} />
                    <TabButton label="Payouts" icon={<DollarSignIcon/>} isActive={view === 'payouts'} onClick={() => setView('payouts')} />
                    <TabButton label="Sustenance" icon={<HeartIcon/>} isActive={view === 'sustenance'} onClick={() => setView('sustenance')} />
                    <TabButton label="Notifications" icon={<BellIcon />} count={unreadCount} isActive={view === 'notifications'} onClick={() => setView('notifications')} />
                    <TabButton label="Reports" icon={<AlertTriangleIcon/>} count={newReportsCount} isActive={view === 'reports'} onClick={() => setView('reports')} />
                    <TabButton label="Profile" icon={<UserCircleIcon/>} isActive={view === 'profile'} onClick={() => setView('profile')} />
                </nav>
            </div>
        </div>

       <div className="mt-6">
            {mainContent()}
       </div>
    </div>
  );
};