import React, { useState, useEffect, useMemo } from 'react';
import { Agent, Member, NewMember, Broadcast, User, NotificationItem, PublicUserProfile } from '../types';
import { RegisterMemberForm } from './RegisterMemberForm';
import { MemberList } from './MemberList';
import { AgentProfile } from './AgentProfile';
import { UsersIcon } from './icons/UsersIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { MegaphoneIcon } from './icons/MegaphoneIcon';
import { useToast } from '../contexts/ToastContext';
import { MemberDetails } from './MemberDetails';
import { Pagination } from './Pagination';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { api } from '../services/apiService';
import { exportToCsv } from '../utils';
import { DownloadIcon } from './icons/DownloadIcon';
import { NotificationsPage } from './NotificationsPage';
import { KnowledgeBasePage } from './KnowledgeBasePage';
import { WalletPage } from './WalletPage';
import { TrendingUpIcon } from './icons/TrendingUpIcon';


type AgentView = 'dashboard' | 'members' | 'profile' | 'notifications' | 'knowledge' | 'wallet';

interface AgentDashboardProps {
  user: Agent;
  broadcasts: Broadcast[];
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  activeView: AgentView;
  setActiveView: (view: AgentView) => void;
  onViewProfile: (userId: string | null) => void;
}

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; description: string; onClick?: () => void }> = ({ icon, title, value, description, onClick }) => (
  <div onClick={onClick} className={`bg-slate-800 p-6 rounded-lg shadow-lg flex items-start ${onClick ? 'cursor-pointer hover:bg-slate-700 transition-colors' : ''}`}>
    <div className="flex-shrink-0 bg-slate-700 rounded-md p-3">
      {icon}
    </div>
    <div className="ml-4">
      <p className="text-sm font-medium text-gray-400 truncate">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  </div>
);

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ user, broadcasts, onUpdateUser, activeView, setActiveView, onViewProfile }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  // State for member list view
  const [searchQuery, setSearchQuery] = useState('');
  
  const { addToast } = useToast();

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true);
        const agentMembers = await api.getAgentMembers(user);
        const memberUids = agentMembers.filter(m => m.uid).map(m => m.uid as string);

        if (memberUids.length > 0) {
            const userProfiles = await api.getPublicUserProfilesByUids(memberUids);
            const userStatusMap = new Map(userProfiles.map(u => [u.id, u.status]));
            const enrichedMembers = agentMembers.map(member => {
                if (member.uid && userStatusMap.has(member.uid)) {
                    return { ...member, status: userStatusMap.get(member.uid) };
                }
                return member;
            });
            setMembers(enrichedMembers);
        } else {
            setMembers(agentMembers);
        }
      } catch (error) {
        addToast('Could not load your members.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [user, addToast]);
  

  const handleRegisterMember = async (newMemberData: NewMember) => {
    try {
      const newMember = await api.registerMember(user, newMemberData);
      setMembers(prev => [newMember, ...prev]);
      addToast(`${newMember.full_name} has been successfully registered!`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      addToast(`Registration failed: ${errorMessage}`, 'error');
      throw error;
    }
  };

  const handleDownload = () => {
    if (members.length === 0) {
        addToast('There are no members to export.', 'info');
        return;
    }
    const dataToExport = members.map(({ welcome_message, agent_id, ...rest }) => rest);
    exportToCsv(`my-registered-members-${new Date().toISOString().split('T')[0]}.csv`, dataToExport);
    addToast('Your member data is being downloaded.', 'info');
  };

  const handleNavigate = (item: NotificationItem) => {
       if (item.type === 'NEW_MEMBER' || item.type === 'POST_LIKE' || item.type === 'NEW_POST_PROPOSAL' || item.type === 'NEW_POST_OPPORTUNITY' || item.type === 'NEW_POST_GENERAL' || item.type === 'NEW_POST_OFFER') {
          const targetId = item.itemType === 'notification' ? item.causerId : item.link;
          if (targetId) onViewProfile(targetId);
      } else {
          addToast('Navigation for this notification is not available in this view.', 'info');
      }
  };

  const totalMembers = members.length;
  const totalCommission = useMemo(() => {
    return members
      .filter(m => m.payment_status === 'complete')
      .reduce((sum, member) => sum + member.registration_amount * 0.10, 0)
      .toFixed(2);
  }, [members]);


  const renderDashboardView = () => (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Welcome, {user.name}!</h1>
        <p className="text-lg text-gray-400">Agent Node {user.agent_code}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
            icon={<UsersIcon className="h-6 w-6 text-green-400" />}
            title="Total Members"
            value={totalMembers}
            description="Active registrations."
        />
        <StatCard 
            icon={<DollarSignIcon className="h-6 w-6 text-green-400" />}
            title="Total Commission"
            value={`$${totalCommission}`}
            description="From completed payments."
        />
        <StatCard 
            icon={<BriefcaseIcon className="h-6 w-6 text-green-400" />}
            title="Your Circle"
            value={user.circle}
            description="Operation area."
        />
      </div>

      <RegisterMemberForm agent={user} onRegister={handleRegisterMember} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-gray-200 mb-4">Recent Members</h3>
          {isLoading ? (
             <p className="text-gray-400">Loading members...</p>
          ) : members.length > 0 ? (
             <MemberList members={members.slice(0, 5)} onSelectMember={setSelectedMember} />
          ) : (
            <p className="text-gray-400">You haven't registered any members yet.</p>
          )}
        </div>
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-gray-200 mb-4 flex items-center">
            <MegaphoneIcon className="h-5 w-5 mr-2 text-green-400"/>
            Admin Broadcasts
          </h3>
          <ul className="space-y-4 max-h-96 overflow-y-auto">
            {broadcasts.map(b => (
              <li key={b.id} className="border-b border-slate-700 pb-3">
                <div
                  className="text-sm text-gray-300 wysiwyg-content"
                  dangerouslySetInnerHTML={{ __html: b.message }}
                />
                <p className="text-xs text-gray-500 mt-1">{new Date(b.date).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const renderMembersView = () => {
    if (selectedMember) {
        return <MemberDetails member={selectedMember} onBack={() => setSelectedMember(null)} />;
    }
    
    const filteredMembers = members.filter(member =>
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg animate-fade-in">
             <h2 className="text-2xl font-semibold text-white mb-4">Your Registered Members</h2>
             <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="w-full sm:w-auto sm:max-w-md">
                    <label htmlFor="agent-member-search" className="sr-only">Search Members</label>
                    <input
                        type="text"
                        id="agent-member-search"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    />
                </div>
                <button
                    onClick={handleDownload}
                    className="inline-flex items-center px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 text-sm w-full sm:w-auto"
                >
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Download CSV
                </button>
             </div>
             {isLoading ? (
                <p className="text-center py-8 text-gray-400">Loading members...</p>
             ) : filteredMembers.length > 0 ? (
                 <MemberList members={filteredMembers} onSelectMember={setSelectedMember} onViewProfile={onViewProfile} />
             ) : (
                <p className="text-center py-8 text-gray-400">
                    {searchQuery ? 'No members match your search.' : "You haven't registered any members yet."}
                </p>
             )}
        </div>
    );
  };

  const renderProfileView = () => (
    <AgentProfile agent={user} onUpdateUser={onUpdateUser} />
  );
  
  const renderNotificationsView = () => (
    <NotificationsPage user={user} onNavigate={handleNavigate} onViewProfile={onViewProfile} />
  );
  
  const renderKnowledgeBaseView = () => (
    <KnowledgeBasePage currentUser={user} onUpdateUser={onUpdateUser} />
  );

  const renderWalletView = () => (
    <WalletPage user={user} />
  );

  const renderActiveView = () => {
    switch(activeView) {
      case 'dashboard':
        return renderDashboardView();
      case 'members':
        return renderMembersView();
      case 'profile':
        return renderProfileView();
      case 'notifications':
        return renderNotificationsView();
      case 'knowledge':
        return renderKnowledgeBaseView();
      case 'wallet':
        return renderWalletView();
      default:
        return renderDashboardView();
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {renderActiveView()}
    </div>
  );
};
