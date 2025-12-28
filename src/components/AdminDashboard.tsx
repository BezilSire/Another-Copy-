import React, { useState, useEffect } from 'react';
import { Admin, Agent, Member, Broadcast, Report, User, PayoutRequest, Venture, CommunityValuePool, FilterType as PostFilterType, PendingUbtPurchase } from '../types';
import { api } from '../services/apiService';
import { cryptoService } from '../services/cryptoService';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { Dashboard } from './Dashboard';
import { LedgerPage } from './LedgerPage';
import { AdminProfile } from './AdminProfile';
import { PostsFeed } from './PostsFeed';
import { PostTypeFilter } from './PostTypeFilter';
import { TreasuryManager } from './TreasuryManager';
import { LockIcon } from './icons/LockIcon';
import { AdminDispatchTerminal } from './AdminDispatchTerminal';
import { AdminOracleTerminal } from './AdminOracleTerminal';
import { AdminRegistrarTerminal } from './AdminRegistrarTerminal';
import { AdminJusticeTerminal } from './AdminJusticeTerminal';
import { GlobeIcon } from './icons/GlobeIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { SovereignUpgradeBanner } from './SovereignUpgradeBanner';
import { GenesisNodeFlow } from './GenesisNodeFlow';
import { useToast } from '../contexts/ToastContext';

type AdminView = 'dashboard' | 'feed' | 'profile' | 'wallet' | 'oracle' | 'treasury' | 'dispatch' | 'registrar' | 'justice';

export const AdminDashboard: React.FC<{
  user: Admin;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  unreadCount: number;
  onOpenChat: () => void;
  onViewProfile: (userId: string | null) => void;
}> = ({ user, onUpdateUser, onViewProfile }) => {
  const [view, setView] = useState<AdminView>('dashboard');
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
  const [typeFilter, setTypeFilter] = useState<PostFilterType>('all');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { addToast } = useToast();

  const hasVault = cryptoService.hasVault();

  useEffect(() => {
    const unsubUsers = api.listenForAllUsers(user, setAllUsers, console.error);
    const unsubMembers = api.listenForAllMembers(user, setMembers, console.error);
    const unsubAgents = api.listenForAllAgents(user, setAgents, console.error);
    const unsubPending = api.listenForPendingMembers(user, setPendingMembers, console.error);
    const unsubReports = api.listenForReports(user, setReports, console.error);
    const unsubPayouts = api.listenForPayoutRequests(user, setPayouts, console.error);
    const unsubVentures = api.listenForVentures(user, setVentures, console.error);
    const unsubCvp = api.listenForCVP(user, setCvp, console.error);
    const unsubOracle = api.listenForPendingPurchases(setPendingPurchases, console.error);
    api.getBroadcasts().then(setBroadcasts).catch(console.error);

    return () => {
        unsubUsers(); unsubMembers(); unsubAgents(); unsubPending(); unsubReports();
        unsubPayouts(); unsubVentures(); unsubCvp(); unsubOracle();
    };
  }, [user]);

  const handleUpgradeComplete = async (mnemonic: string, pin: string) => {
    try {
        await cryptoService.saveVault({ mnemonic }, pin);
        const pubKey = cryptoService.getPublicKey();
        if (pubKey) {
            await onUpdateUser({ publicKey: pubKey });
        }
        setIsUpgrading(false);
        addToast("Authority Anchored. Identity Restored.", "success");
        window.location.reload();
    } catch (err) {
        addToast("Anchoring failed.", "error");
    }
  };

  const TabButton: React.FC<{label: string, count?: number, isActive: boolean, onClick: () => void, icon: React.ReactNode}> = ({ label, count, isActive, onClick, icon }) => (
    <button onClick={onClick} className={`${isActive ? 'border-brand-gold text-brand-gold gold-glow-text' : 'border-transparent text-gray-500 hover:text-gray-300'} group inline-flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all`}>
        <span className="mr-2 h-4 w-4">{icon}</span>
        {label}
        {count !== undefined && count > 0 && <span className="ml-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>}
    </button>
  );

  const handleSendBroadcast = async (msg: string) => {
    try {
        await api.sendBroadcast(user, msg);
    } catch (e) {
        console.error("Broadcast failed", e);
    }
  };

  const renderActiveView = () => {
    switch (view) {
        case 'dashboard': 
            return <Dashboard user={user} users={allUsers} agents={agents} members={members} pendingMembers={pendingMembers} reports={reports} broadcasts={broadcasts} payouts={payouts} ventures={ventures} cvp={cvp} onSendBroadcast={handleSendBroadcast} />;
        case 'treasury':
            return < TreasuryManager admin={user} />;
        case 'dispatch':
            return <AdminDispatchTerminal admin={user} />;
        case 'oracle': 
            return <AdminOracleTerminal purchases={pendingPurchases} admin={user} />;
        case 'registrar':
            return <AdminRegistrarTerminal admin={user} />;
        case 'justice':
            return <AdminJusticeTerminal admin={user} reports={reports} />;
        case 'wallet': return <LedgerPage />;
        case 'profile': return <AdminProfile user={user} onUpdateUser={onUpdateUser} />;
        case 'feed': return ( <> <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} isAdminView /><PostsFeed user={user} onViewProfile={onViewProfile as any} typeFilter={typeFilter} isAdminView /></> );
        default: return null;
    }
  };

  if (isUpgrading) {
      return (
          <div className="flex-1 flex items-center justify-center p-6 bg-black min-h-screen">
              <GenesisNodeFlow onComplete={handleUpgradeComplete} onBack={() => setIsUpgrading(false)} />
          </div>
      );
  }

  return (
    <div className="space-y-12 animate-fade-in max-w-[100vw] px-4 sm:px-10 lg:px-20 pb-20 font-sans">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10 border-b border-white/5 pb-2">
          <div className="space-y-4">
              <h1 className="text-6xl font-black text-white tracking-tighter uppercase leading-none gold-text">Authority HUD</h1>
              <div className="flex items-center gap-4">
                   <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-glow-matrix"></div>
                   <p className="label-caps !text-white !text-[10px] !tracking-[0.4em]">Root Node Identity Verified</p>
              </div>
          </div>
          <div className="w-full xl:w-auto overflow-x-auto no-scrollbar">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  <TabButton label="Ops" icon={<LayoutDashboardIcon/>} isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
                  <TabButton label="Treasury" icon={<LockIcon/>} isActive={view === 'treasury'} onClick={() => setView('treasury')} />
                  <TabButton label="Dispatch" icon={<GlobeIcon/>} isActive={view === 'dispatch'} onClick={() => setView('dispatch')} />
                  <TabButton label="Oracle" icon={<DollarSignIcon/>} isActive={view === 'oracle'} count={pendingPurchases.length} onClick={() => setView('oracle')} />
                  <TabButton label="Registrar" icon={<DatabaseIcon/>} isActive={view === 'registrar'} onClick={() => setView('registrar')} />
                  <TabButton label="Justice" icon={<ScaleIcon/>} isActive={view === 'justice'} count={reports.filter(r => r.status === 'new').length} onClick={() => setView('justice')} />
                  <TabButton label="Ledger" icon={<GlobeIcon/>} isActive={view === 'wallet'} onClick={() => setView('wallet')} />
                  <TabButton label="Identity" icon={<UserCircleIcon/>} isActive={view === 'profile'} onClick={() => setView('profile')} />
              </nav>
          </div>
      </div>

      {!hasVault && (
          <div className="mt-8">
              <SovereignUpgradeBanner onUpgrade={() => setIsUpgrading(true)} />
          </div>
      )}

      <div className="mt-10 min-h-[60vh]">
          {renderActiveView()}
      </div>
    </div>
  );
};