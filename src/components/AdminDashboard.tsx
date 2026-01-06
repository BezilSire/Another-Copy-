
import React, { useState, useEffect } from 'react';
import { Admin, Agent, Member, Broadcast, Report, User, PayoutRequest, Venture, CommunityValuePool, FilterType as PostFilterType, PendingUbtPurchase, MultiSigProposal } from '../types';
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
import { NewPostModal } from './NewPostModal';
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
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { PlusIcon } from './icons/PlusIcon';
import { KeyIcon } from './icons/KeyIcon';
import { PinVaultLogin } from './PinVaultLogin';
import { useAuth } from '../contexts/AuthContext';

type AdminView = 'ops' | 'stream' | 'treasury' | 'dispatch' | 'oracle' | 'registrar' | 'justice' | 'ledger' | 'identity';

export const AdminDashboard: React.FC<{
  user: Admin;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  unreadCount: number;
  onOpenChat: () => void;
  onViewProfile: (userId: string | null) => void;
}> = ({ user, onUpdateUser, onViewProfile }) => {
  const [view, setView] = useState<AdminView>('ops');
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
  const [msProposals, setMsProposals] = useState<MultiSigProposal[]>([]);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const { addToast } = useToast();
  const { unlockSovereignSession } = useAuth();

  const isUnlocked = sessionStorage.getItem('ugc_node_unlocked') === 'true';
  const hasVault = cryptoService.hasVault() || (user as any).encryptedVault;

  useEffect(() => {
    const unsubUsers = api.listenForAllUsers(user, setAllUsers, (err) => console.error(err));
    const unsubMembers = api.listenForAllMembers(user, setMembers, (err) => console.error(err));
    const unsubAgents = api.listenForAllAgents(user, setAgents, (err) => console.error(err));
    const unsubPending = api.listenForPendingMembers(user, setPendingMembers, (err) => console.error(err));
    const unsubReports = api.listenForReports(user, setReports, (err) => console.error(err));
    const unsubPayouts = api.listenForPayoutRequests(user, setPayouts, (err) => console.error(err));
    const unsubVentures = api.listenForVentures(user, setVentures, (err) => console.error(err));
    const unsubCvp = api.listenForCVP(user, setCvp, (err) => console.error(err));
    const unsubOracle = api.listenForPendingPurchases(setPendingPurchases, (err) => console.error(err));
    const unsubMultisig = api.listenForMultiSigProposals(setMsProposals);
    api.getBroadcasts().then(setBroadcasts).catch(console.error);

    return () => {
        unsubUsers(); unsubMembers(); unsubAgents(); unsubPending(); unsubReports();
        unsubPayouts(); unsubVentures(); unsubCvp(); unsubOracle(); unsubMultisig();
    };
  }, [user]);

  const handleUpgradeComplete = async (mnemonic: string, pin: string) => {
    try {
        const encryptedVault = await cryptoService.saveVault({ mnemonic }, pin);
        const pubKey = cryptoService.getPublicKey();
        if (pubKey) {
            await onUpdateUser({ publicKey: pubKey, encryptedVault } as any);
        }
        setIsUpgrading(false);
        addToast("Authority Root Anchored.", "success");
        window.location.reload();
    } catch (err) {
        addToast("Handshake Failed.", "error");
    }
  };

  const TabButton: React.FC<{label: string, count?: number, isActive: boolean, onClick: () => void, icon: React.ReactNode}> = ({ label, count, isActive, onClick, icon }) => (
    <button 
        onClick={onClick} 
        className={`group flex items-center gap-3 py-5 px-6 border-b-2 transition-all duration-300 whitespace-nowrap cursor-pointer
            ${isActive 
                ? 'border-brand-gold text-brand-gold bg-brand-gold/5 shadow-inner' 
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}
        `}
    >
        <span className={`h-5 w-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'opacity-50 group-hover:opacity-100'}`}>{icon}</span>
        <span className="text-[11px] font-black uppercase tracking-[0.2em]">{label}</span>
        {count !== undefined && count > 0 && (
            <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-lg animate-pulse">{count}</span>
        )}
    </button>
  );

  const renderActiveView = () => {
    switch (view) {
        case 'ops': 
            return <Dashboard user={user} users={allUsers} agents={agents} members={members} pendingMembers={pendingMembers} reports={reports} broadcasts={broadcasts} payouts={payouts} ventures={ventures} cvp={cvp} onSendBroadcast={async (m) => { await api.sendBroadcast(user, m); }} />;
        case 'stream': 
            return ( 
                <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
                    <div className="module-frame bg-slate-900/60 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col sm:flex-row justify-between items-center gap-6 relative overflow-hidden">
                        <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none"></div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Global Activity</h3>
                            <p className="label-caps !text-[8px] text-emerald-500 mt-2">Authority Surveillance Active</p>
                        </div>
                        <button 
                            onClick={() => setIsNewPostModalOpen(true)}
                            className="relative z-10 px-8 py-4 bg-brand-gold text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-glow-gold active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
                        >
                            <PlusIcon className="h-5 w-5" /> Social Dispatch
                        </button>
                    </div>
                    <PostsFeed user={user} onViewProfile={onViewProfile as any} typeFilter="all" isAdminView />
                </div>
            );
        case 'treasury':
            return <TreasuryManager admin={user} />;
        case 'dispatch':
            return <AdminDispatchTerminal admin={user} />;
        case 'oracle': 
            return <AdminOracleTerminal purchases={pendingPurchases} admin={user} />;
        case 'registrar':
            return <AdminRegistrarTerminal admin={user} />;
        case 'justice':
            return <AdminJusticeTerminal admin={user} reports={reports} />;
        case 'ledger':
            return <LedgerPage />;
        case 'identity':
            return <AdminProfile user={user} onUpdateUser={onUpdateUser} />;
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
    <div className="min-h-screen bg-black flex flex-col font-sans animate-fade-in">
      <div className="bg-slate-950 border-b border-white/5 px-6 sm:px-10 lg:px-20 pt-12 pb-2 flex flex-col gap-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div className="space-y-4">
                  <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tighter uppercase leading-none gold-text">Authority HUD</h1>
                  <div className="flex items-center gap-4">
                       <div className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-glow-matrix ${isUnlocked ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                       <p className="label-caps !text-white !text-[9px] !tracking-[0.4em]">{isUnlocked ? 'Root Identity Verified' : 'Local Node Locked'}</p>
                       {!isUnlocked && hasVault && (
                           <button onClick={() => setIsUnlocking(true)} className="ml-4 p-2 bg-brand-gold text-slate-950 rounded-xl shadow-glow-gold hover:scale-105 transition-all cursor-pointer">
                               <KeyIcon className="h-4 w-4" />
                           </button>
                       )}
                  </div>
              </div>
          </div>

          <div className="w-full overflow-x-auto no-scrollbar">
              <nav className="-mb-px flex space-x-2 min-w-max pb-2" aria-label="Tabs">
                  <TabButton label="Ops" icon={<LayoutDashboardIcon/>} isActive={view === 'ops'} onClick={() => setView('ops')} />
                  <TabButton label="Stream" icon={<MessageSquareIcon/>} isActive={view === 'stream'} onClick={() => setView('stream')} />
                  <TabButton label="Treasury" icon={<LockIcon/>} isActive={view === 'treasury'} count={msProposals.length} onClick={() => setView('treasury')} />
                  <TabButton label="Dispatch" icon={<PlusIcon/>} isActive={view === 'dispatch'} onClick={() => setView('dispatch')} />
                  <TabButton label="Oracle" icon={<DollarSignIcon/>} isActive={view === 'oracle'} count={pendingPurchases.length} onClick={() => setView('oracle')} />
                  <TabButton label="Registrar" icon={<DatabaseIcon/>} isActive={view === 'registrar'} onClick={() => setView('registrar')} />
                  <TabButton label="Justice" icon={<ScaleIcon/>} isActive={view === 'justice'} count={reports.filter(r => r.status === 'new').length} onClick={() => setView('justice')} />
                  <TabButton label="Ledger" icon={<GlobeIcon/>} isActive={view === 'ledger'} onClick={() => setView('ledger')} />
                  <TabButton label="Identity" icon={<UserCircleIcon/>} isActive={view === 'identity'} onClick={() => setView('identity')} />
              </nav>
          </div>
      </div>

      <div className="flex-1 px-4 sm:px-10 lg:px-20 py-12">
          {!hasVault && (
              <div className="mb-12">
                  <SovereignUpgradeBanner onUpgrade={() => setIsUpgrading(true)} user={user} />
              </div>
          )}

          <div className="min-h-[60vh] animate-fade-in">
              {renderActiveView()}
          </div>
      </div>

      {isUnlocking && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
              <div className="w-full max-w-md relative">
                  <PinVaultLogin 
                    onUnlock={(data, pin) => { unlockSovereignSession(data, pin); setIsUnlocking(false); }} 
                    onReset={() => { setIsUnlocking(false); setIsUpgrading(true); }} 
                  />
                  <button onClick={() => setIsUnlocking(false)} className="absolute -top-16 right-0 text-white/40 hover:text-white uppercase text-[10px] font-black p-4">✕ Close</button>
              </div>
          </div>
      )}

      {isNewPostModalOpen && (
          <NewPostModal 
              isOpen={isNewPostModalOpen} 
              onClose={() => setIsNewPostModalOpen(false)} 
              user={user} 
              onPostCreated={() => { setIsNewPostModalOpen(false); addToast("Broadcast ledgered.", "success"); }} 
          />
      )}
    </div>
  );
};
