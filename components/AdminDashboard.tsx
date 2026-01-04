import React, { useState, useEffect, useRef } from 'react';
import { Admin, Agent, Member, Broadcast, Report, User, PayoutRequest, Venture, CommunityValuePool, FilterType as PostFilterType, PendingUbtPurchase, MultiSigProposal } from '../types';
import { api } from '../services/apiService';
import { cryptoService } from '../services/cryptoService';
import { sovereignService } from '../services/sovereignService';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { Dashboard } from './Dashboard';
import { LedgerPage } from './LedgerPage';
import { AdminProfile } from './AdminProfile';
import { PostsFeed } from './PostsFeed';
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
import { RotateCwIcon } from './icons/RotateCwIcon';
// Added missing LoaderIcon import to fix "Cannot find name 'LoaderIcon'"
import { LoaderIcon } from './icons/LoaderIcon';

type AdminView = 'dashboard' | 'feed' | 'profile' | 'wallet' | 'oracle' | 'treasury' | 'dispatch' | 'registrar' | 'justice' | 'ledger_reconcile';

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
  const [msProposals, setMsProposals] = useState<MultiSigProposal[]>([]);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { addToast } = useToast();

  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [syncLogs]);

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
    const unsubMultisig = api.listenForMultiSigProposals(setMsProposals);
    api.getBroadcasts().then(setBroadcasts).catch(console.error);

    return () => {
        unsubUsers(); unsubMembers(); unsubAgents(); unsubPending(); unsubReports();
        unsubPayouts(); unsubVentures(); unsubCvp(); unsubOracle(); unsubMultisig();
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

  const handleLedgerReconcile = async () => {
      setIsSyncing(true);
      setSyncLogs(["> INITIALIZING_LEDGER_RECONCILIATION..."]);
      try {
          await sovereignService.syncLegacyToGitHub((log) => {
              setSyncLogs(prev => [...prev, log]);
          });
          addToast("Ledger Reconciliation Complete.", "success");
      } catch (e) {
          addToast("Reconciliation failed.", "error");
      } finally {
          setIsSyncing(false);
      }
  };

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
            return <Dashboard user={user} users={allUsers} agents={agents} members={members} pendingMembers={pendingMembers} reports={reports} broadcasts={broadcasts} payouts={payouts} ventures={ventures} cvp={cvp} onSendBroadcast={async (m) => await api.sendBroadcast(user, m)} />;
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
        case 'ledger_reconcile': 
            return (
                <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
                    <div className="module-frame bg-slate-900/60 p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
                        <div className="flex justify-between items-center border-b border-white/5 pb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Ledger Reconciliation</h3>
                                <p className="label-caps !text-[8px] text-emerald-500 mt-2">Firebase &rarr; GitHub Bridge</p>
                            </div>
                            <button 
                                onClick={handleLedgerReconcile}
                                disabled={isSyncing}
                                className="px-8 py-4 bg-brand-gold text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-glow-gold active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                            >
                                {isSyncing ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <><RotateCwIcon className="h-4 w-4" /> Start Reconciliation</>}
                            </button>
                        </div>
                        
                        <div className="bg-black p-8 rounded-[2rem] border border-white/5 shadow-inner h-[400px] overflow-y-auto no-scrollbar font-mono text-[10px] text-brand-gold/60 space-y-2">
                            {syncLogs.map((log, i) => <div key={i} className="animate-fade-in">{log}</div>)}
                            {isSyncing && <div className="w-2 h-4 bg-brand-gold animate-terminal-cursor mt-2 shadow-glow-gold"></div>}
                            <div ref={logEndRef} />
                        </div>
                        
                        <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest leading-loose">
                            This tool scans the internal Firebase ledger and pushes any missing transactions to the public GitHub repository. This ensures 100% data parity for the public explorer.
                        </p>
                    </div>
                </div>
            );
        case 'wallet': return <LedgerPage />;
        case 'profile': return <AdminProfile user={user} onUpdateUser={onUpdateUser} />;
        case 'feed': return ( <PostsFeed user={user} onViewProfile={onViewProfile as any} typeFilter="all" isAdminView /> );
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
                  <TabButton label="Treasury" icon={<LockIcon/>} count={msProposals.length} isActive={view === 'treasury'} onClick={() => setView('treasury')} />
                  <TabButton label="Dispatch" icon={<GlobeIcon/>} isActive={view === 'dispatch'} onClick={() => setView('dispatch')} />
                  <TabButton label="Oracle" icon={<DollarSignIcon/>} isActive={view === 'oracle'} count={pendingPurchases.length} onClick={() => setView('oracle')} />
                  <TabButton label="Reconcile" icon={<RotateCwIcon/>} isActive={view === 'ledger_reconcile'} onClick={() => setView('ledger_reconcile')} />
                  <TabButton label="Registrar" icon={<DatabaseIcon/>} isActive={view === 'registrar'} onClick={() => setView('registrar')} />
                  <TabButton label="Justice" icon={<ScaleIcon/>} isActive={view === 'justice'} count={reports.filter(r => r.status === 'new').length} onClick={() => setView('justice')} />
                  <TabButton label="Scan" icon={<GlobeIcon/>} isActive={view === 'wallet'} onClick={() => setView('wallet')} />
                  <TabButton label="Identity" icon={<UserCircleIcon/>} isActive={view === 'profile'} onClick={() => setView('profile')} />
              </nav>
          </div>
      </div>

      {!hasVault && (
          <div className="mt-8">
              <SovereignUpgradeBanner user={user} onUpgrade={() => setIsUpgrading(true)} />
          </div>
      )}

      <div className="mt-10 min-h-[60vh]">
          {renderActiveView()}
      </div>
    </div>
  );
};