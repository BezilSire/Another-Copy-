
import React, { useState, useEffect } from 'react';
import { Admin, Agent, Member, Broadcast, Report, User, PayoutRequest, Venture, CommunityValuePool, FilterType as PostFilterType, PendingUbtPurchase, SellRequest } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { Dashboard } from './Dashboard';
import { LedgerPage } from './LedgerPage';
import { AdminProfile } from './AdminProfile';
import { PostsFeed } from './PostsFeed';
import { PostTypeFilter } from './PostTypeFilter';
import { EcocashVerificationAdmin } from './EcocashVerificationAdmin';
import { LiquidationOracleAdmin } from './LiquidationOracleAdmin';

type AdminView = 'dashboard' | 'feed' | 'profile' | 'wallet' | 'oracle' | 'simulation';

interface AdminDashboardProps {
  user: Admin;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  unreadCount: number;
  onOpenChat: () => void;
  onViewProfile: (userId: string | null) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onUpdateUser, unreadCount, onOpenChat, onViewProfile }) => {
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
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([]);
  
  const [isMinting, setIsMinting] = useState(false);
  const [typeFilter, setTypeFilter] = useState<PostFilterType>('all');
  const { addToast } = useToast();

  // Unified Protocol Listeners - Components react to data as it arrives
  useEffect(() => {
    const unsubUsers = api.listenForAllUsers(user, setAllUsers, console.error);
    const unsubMembers = api.listenForAllMembers(user, setMembers, console.error);
    const unsubAgents = api.listenForAllAgents(user, setAgents, console.error);
    const unsubPending = api.listenForPendingMembers(user, setPendingMembers, console.error);
    const unsubReports = api.listenForReports(user, setReports, console.error);
    const unsubPayouts = api.listenForPayoutRequests(user, setPayouts, console.error);
    const unsubVentures = api.listenForVentures(user, setVentures, console.error);
    const unsubCvp = api.listenForCVP(user, setCvp, console.error);
    // FIX: Added missing error callbacks for oracle and liquidation listeners to resolve build errors
    const unsubOracle = api.listenForPendingPurchases(setPendingPurchases, console.error);
    const unsubLiq = api.listenToSellRequests(setSellRequests, console.error);
    api.getBroadcasts().then(setBroadcasts).catch(console.error);

    return () => {
        unsubUsers(); unsubMembers(); unsubAgents(); unsubPending(); unsubReports();
        unsubPayouts(); unsubVentures(); unsubCvp(); unsubOracle(); unsubLiq();
    };
  }, [user]);

  const handleMintSimulation = async () => {
    setIsMinting(true);
    try {
        await api.mintTestUbt(user, 10000);
        addToast("Genesis Simulation Successful. 10,000 UBT minted to Admin node.", "success");
    } catch (e) {
        addToast("Simulation fault.", "error");
    } finally {
        setIsMinting(false);
    }
  }

  const TabButton: React.FC<{label: string, count?: number, isActive: boolean, onClick: () => void, icon: React.ReactNode}> = ({ label, count, isActive, onClick, icon }) => (
    <button onClick={onClick} className={`${isActive ? 'border-brand-gold text-brand-gold gold-glow-text' : 'border-transparent text-gray-500 hover:text-gray-300'} group inline-flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all`}>
        <span className="mr-2 h-4 w-4 hidden sm:inline-block">{icon}</span>
        {label}
        {count !== undefined && count > 0 && <span className="ml-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">{count}</span>}
    </button>
  );

  const renderActiveView = () => {
    switch (view) {
        case 'dashboard': 
            return <Dashboard user={user} users={allUsers} agents={agents} members={members} pendingMembers={pendingMembers} reports={reports} broadcasts={broadcasts} payouts={payouts} ventures={ventures} cvp={cvp} onSendBroadcast={api.sendBroadcast} />;
        case 'oracle': 
            return (
                <div className="space-y-8 animate-fade-in">
                    <EcocashVerificationAdmin purchases={pendingPurchases} adminUser={user} />
                    <LiquidationOracleAdmin requests={sellRequests} adminUser={user} />
                </div>
            );
        case 'simulation': 
            return (
                <div className="space-y-8 animate-fade-in">
                    <div className="glass-card p-10 rounded-[3rem] border-white/5 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-brand-gold/10 rounded-2xl text-brand-gold border border-brand-gold/20 shadow-glow-gold">
                                <ShieldCheckIcon className="h-8 w-8" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tighter uppercase gold-text leading-none font-sans">Genesis Bench</h2>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Ledger Testnet Environment</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                            <div className="p-8 bg-slate-950/60 rounded-[2rem] border border-white/5 space-y-6">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Asset Minting</h3>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-4xl font-mono font-black text-white">{(user.ubtBalance || 0).toLocaleString()}</p>
                                    <p className="text-xs text-brand-gold font-bold">Liquid UBT</p>
                                </div>
                                <button onClick={handleMintSimulation} disabled={isMinting} className="w-full py-4 bg-brand-gold text-slate-950 font-black rounded-xl uppercase tracking-widest text-xs shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-2">
                                    {isMinting ? <LoaderIcon className="h-4 w-4 animate-spin"/> : "Simulate Genesis Mint (10k UBT)"}
                                </button>
                            </div>
                            <div className="p-8 bg-slate-950/60 rounded-[2rem] border border-white/5 space-y-6">
                                 <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Ledger Probe</h3>
                                 <p className="text-xs text-gray-500 uppercase font-black leading-loose">Monitor all Quantum Syncs across the network state in real-time.</p>
                                 <button onClick={() => setView('wallet')} className="w-full py-4 bg-slate-900 border border-white/10 text-white font-black rounded-xl uppercase tracking-widest text-xs hover:bg-slate-800 transition-all">Open Ledger Auditor</button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'wallet': return <LedgerPage />;
        case 'profile': return <AdminProfile user={user} onUpdateUser={onUpdateUser} />;
        case 'feed': return ( <> <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} isAdminView /><PostsFeed user={user} feedType="all" isAdminView onViewProfile={onViewProfile} typeFilter={typeFilter} /></> );
        default: return <div className="flex flex-col items-center justify-center p-20 opacity-50"><LoaderIcon className="h-10 w-10 text-brand-gold animate-spin mb-4" /><p className="label-caps">Syncing Protocol...</p></div>;
    }
  };

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto px-4 bg-transparent pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="animate-slide-up">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none gold-text font-sans">Command Center</h1>
              <p className="text-brand-gold text-[10px] font-black uppercase tracking-[0.4em] mt-3">Ubuntium Network Authority Node</p>
          </div>
          <div className="border-b border-white/10 w-full md:w-auto overflow-x-auto no-scrollbar">
              <nav className="-mb-px flex space-x-6 sm:space-x-8" aria-label="Tabs">
                  <TabButton label="Operations" icon={<LayoutDashboardIcon/>} isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
                  <TabButton label="Simulation" icon={<ShieldCheckIcon/>} isActive={view === 'simulation'} onClick={() => setView('simulation')} />
                  <TabButton label="Oracle" icon={<DollarSignIcon/>} isActive={view === 'oracle'} count={pendingPurchases.length + sellRequests.filter(r => r.status === 'PENDING').length} onClick={() => setView('oracle')} />
                  <TabButton label="Public Ledger" icon={<DatabaseIcon/>} isActive={view === 'wallet'} onClick={() => setView('wallet')} />
                  <TabButton label="System" icon={<UserCircleIcon/>} isActive={view === 'profile'} onClick={() => setView('profile')} />
              </nav>
          </div>
      </div>

      <div className="mt-6 min-h-[60vh]">
          {renderActiveView()}
      </div>
    </div>
  );
};
