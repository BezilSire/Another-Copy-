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
import { TreasuryManager } from './TreasuryManager';
import { LockIcon } from './icons/LockIcon';
import { SendIcon } from './icons/SendIcon';
import { AdminDispatchTerminal } from './AdminDispatchTerminal';

type AdminView = 'dashboard' | 'feed' | 'profile' | 'wallet' | 'oracle' | 'simulation' | 'treasury' | 'dispatch';

export const AdminDashboard: React.FC<{
  user: Admin;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  unreadCount: number;
  onOpenChat: () => void;
  onViewProfile: (userId: string | null) => void;
}> = ({ user, onUpdateUser, unreadCount, onOpenChat, onViewProfile }) => {
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
        addToast("Genesis Simulation Successful. Assets indexed on TESTNET ledger.", "success");
    } catch (e) {
        addToast("Simulation fault.", "error");
    } finally {
        setIsMinting(false);
    }
  }

  const TabButton: React.FC<{label: string, count?: number, isActive: boolean, onClick: () => void, icon: React.ReactNode}> = ({ label, count, isActive, onClick, icon }) => (
    <button onClick={onClick} className={`${isActive ? 'border-brand-gold text-brand-gold gold-glow-text' : 'border-transparent text-gray-500 hover:text-gray-300'} group inline-flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all`}>
        <span className="mr-2 h-4 w-4">{icon}</span>
        {label}
        {count !== undefined && count > 0 && <span className="ml-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>}
    </button>
  );

  const renderActiveView = () => {
    switch (view) {
        case 'dashboard': 
            // FIX: Wrapped sendBroadcast call to pass current user
            return <Dashboard user={user} users={allUsers} agents={agents} members={members} pendingMembers={pendingMembers} reports={reports} broadcasts={broadcasts} payouts={payouts} ventures={ventures} cvp={cvp} onSendBroadcast={(msg) => api.sendBroadcast(user, msg)} />;
        case 'treasury':
            return <TreasuryManager admin={user} />;
        case 'dispatch':
            return <AdminDispatchTerminal admin={user} />;
        case 'oracle': 
            return (
                <div className="space-y-8 animate-fade-in">
                    <EcocashVerificationAdmin purchases={pendingPurchases} adminUser={user} />
                    <LiquidationOracleAdmin requests={sellRequests} adminUser={user} />
                </div>
            );
        case 'simulation': 
            return (
                <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
                    <div className="glass-card p-12 rounded-[4rem] border-brand-gold/20 space-y-10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 blur-3xl pointer-events-none"></div>
                        <div className="flex items-center gap-6">
                            <div className="p-5 bg-brand-gold/10 rounded-[2rem] text-brand-gold border border-brand-gold/20 shadow-glow-gold">
                                <ShieldCheckIcon className="h-10 w-10" />
                            </div>
                            <div>
                                <h2 className="text-4xl font-black text-white tracking-tighter uppercase gold-text leading-none">Simulation Bench</h2>
                                <p className="label-caps !text-[9px] !tracking-[0.5em] mt-3 !text-gray-500">Node Testnet Environment</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-10 bg-slate-950/60 rounded-[3rem] border border-white/5 space-y-8">
                                <p className="label-caps !text-[9px] text-gray-600">Synthetic Assets</p>
                                <div className="space-y-2">
                                    <p className="text-5xl font-mono font-black text-white">{(user.ubtBalance || 0).toLocaleString()}</p>
                                    <p className="label-caps !text-[9px] text-brand-gold opacity-60">Provisioned UBT</p>
                                </div>
                                <button onClick={handleMintSimulation} disabled={isMinting} className="w-full py-5 bg-brand-gold text-slate-950 font-black rounded-2xl uppercase tracking-[0.3em] text-[10px] shadow-glow-gold active:scale-95 transition-all flex justify-center items-center gap-3">
                                    {isMinting ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <>Generate 10k Testnet UBT <DatabaseIcon className="h-4 w-4"/></>}
                                </button>
                            </div>
                            <div className="p-10 bg-slate-950/60 rounded-[3rem] border border-white/5 space-y-6 flex flex-col justify-center">
                                 <p className="label-caps !text-[9px] text-gray-600">Testnet Logic</p>
                                 <p className="text-[11px] text-gray-500 uppercase font-black leading-loose opacity-70">Simulation assets are isolated from the production chain. They will not appear on the Public Explorer or count towards global liquidity metrics.</p>
                                 <button onClick={() => setView('wallet')} className="mt-4 py-4 bg-white/5 border border-white/10 text-white font-black rounded-xl uppercase tracking-widest text-[9px] hover:bg-white/10 transition-all">Audit Global Chain</button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'wallet': return <LedgerPage />;
        case 'profile': return <AdminProfile user={user} onUpdateUser={onUpdateUser} />;
        case 'feed': return ( <> <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} isAdminView /><PostsFeed user={user} onViewProfile={onViewProfile} typeFilter={typeFilter} isAdminView /></> );
        default: return null;
    }
  };

  return (
    <div className="space-y-12 animate-fade-in max-w-[100vw] px-4 sm:px-10 lg:px-20 pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
          <div className="space-y-4">
              <h1 className="text-6xl font-black text-white tracking-tighter uppercase leading-none gold-text">Authority HUD</h1>
              <div className="flex items-center gap-4">
                   <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-glow-matrix"></div>
                   <p className="label-caps !text-[10px] !tracking-[0.5em] !text-gray-500">Root Node Identity Verified</p>
              </div>
          </div>
          <div className="border-b border-white/10 w-full xl:w-auto overflow-x-auto no-scrollbar">
              <nav className="-mb-px flex space-x-10" aria-label="Tabs">
                  <TabButton label="Operations" icon={<LayoutDashboardIcon/>} isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
                  <TabButton label="Treasury" icon={<LockIcon/>} isActive={view === 'treasury'} onClick={() => setView('treasury')} />
                  <TabButton label="Dispatch" icon={<SendIcon/>} isActive={view === 'dispatch'} onClick={() => setView('dispatch')} />
                  <TabButton label="Simulation" icon={<ShieldCheckIcon/>} isActive={view === 'simulation'} onClick={() => setView('simulation')} />
                  <TabButton label="Oracle" icon={<DollarSignIcon/>} isActive={view === 'oracle'} count={pendingPurchases.length + sellRequests.filter(r => r.status === 'PENDING').length} onClick={() => setView('oracle')} />
                  <TabButton label="Explorer" icon={<DatabaseIcon/>} isActive={view === 'wallet'} onClick={() => setView('wallet')} />
                  <TabButton label="Identity" icon={<UserCircleIcon/>} isActive={view === 'profile'} onClick={() => setView('profile')} />
              </nav>
          </div>
      </div>

      <div className="mt-10 min-h-[60vh]">
          {renderActiveView()}
      </div>
    </div>
  );
};