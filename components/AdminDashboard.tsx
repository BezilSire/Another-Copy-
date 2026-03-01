import React, { useState, useEffect } from 'react';
import { Admin, User, GlobalEconomy, TreasuryVault, Notification, Activity, PayoutRequest, PendingUbtPurchase, Venture, CommunityValuePool, MultiSigProposal, Report } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { UsersIcon } from './icons/UsersIcon';
import { WalletIcon } from './icons/WalletIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { BellIcon } from './icons/BellIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { RotateCwIcon } from './icons/RotateCwIcon';
import { AdminUserManagement } from './AdminUserManagement';
import { WalletAdminPage } from './WalletAdminPage';
import { ProposalsAdminPage } from './ProposalsAdminPage';
import { VenturesAdminPage } from './VenturesAdminPage';
import { PayoutsAdminPage } from './PayoutsAdminPage';
import { ReportsView } from './ReportsView';

interface AdminDashboardProps {
  user: Admin;
  onUpdateUser: (data: Partial<User>) => Promise<void>;
  unreadCount: number;
  onOpenChat: () => void;
  onViewProfile: (userId: string) => void;
}

type AdminView = 'overview' | 'users' | 'wallets' | 'governance' | 'ventures' | 'payouts' | 'reports';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onUpdateUser, unreadCount, onOpenChat, onViewProfile }) => {
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
  const [vaults, setVaults] = useState<TreasuryVault[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const unsubEconomy = api.listenForGlobalEconomy(setEconomy);
    const unsubVaults = api.listenToVaults(setVaults);
    const unsubUsers = api.listenForAllUsers(user, setAllUsers);

    return () => {
      unsubEconomy();
      unsubVaults();
      unsubUsers();
    };
  }, [user]);

  const handleReconcile = async () => {
    if (!window.confirm("Are you sure you want to reconcile all balances? This will recalculate every user's balance from the ledger. This is a heavy operation.")) return;
    
    setIsReconciling(true);
    try {
      await api.reconcileAllBalances();
      addToast("All balances have been reconciled successfully.", "success");
    } catch (error) {
      addToast("Reconciliation failed.", "error");
    } finally {
      setIsReconciling(false);
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'users': return <AdminUserManagement admin={user} users={allUsers} />;
      case 'wallets': return <WalletAdminPage adminUser={user} allUsers={allUsers} />;
      case 'governance': return <ProposalsAdminPage user={user} />;
      case 'ventures': return <VenturesAdminPage user={user} ventures={[]} />;
      case 'payouts': return <PayoutsAdminPage adminUser={user} payouts={[]} />;
      case 'reports': return <ReportsView reports={[]} onViewProfile={onViewProfile} onResolve={async () => {}} onDismiss={async () => {}} />;
      default:
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/[0.08] transition-all">
                <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">Total Users</p>
                <p className="text-4xl font-black text-white leading-none">{allUsers.length}</p>
                <UsersIcon className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5 group-hover:text-white/10 transition-all" />
              </div>
              
              <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/[0.08] transition-all">
                <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">UBT Price</p>
                <p className="text-4xl font-black text-brand-gold leading-none">${economy?.ubt_to_usd_rate.toFixed(4) || '0.0000'}</p>
                <TrendingUpIcon className="absolute -bottom-4 -right-4 h-24 w-24 text-brand-gold/5 group-hover:text-brand-gold/10 transition-all" />
              </div>

              <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/[0.08] transition-all">
                <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">CVP Backing</p>
                <p className="text-4xl font-black text-green-400 leading-none">${economy?.cvp_usd_backing.toLocaleString() || '0'}</p>
                <ShieldCheckIcon className="absolute -bottom-4 -right-4 h-24 w-24 text-green-400/5 group-hover:text-green-400/10 transition-all" />
              </div>

              <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/[0.08] transition-all">
                <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">Treasury Balance</p>
                <p className="text-4xl font-black text-white leading-none">{vaults.reduce((acc, v) => acc + v.balance, 0).toLocaleString()}</p>
                <WalletIcon className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5 group-hover:text-white/10 transition-all" />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] relative overflow-hidden">
              <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">System Maintenance</h3>
                <button 
                  onClick={handleReconcile}
                  disabled={isReconciling}
                  className="flex items-center gap-3 px-6 py-3 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-black rounded-2xl transition-all active:scale-[0.98] shadow-glow-gold disabled:opacity-50 uppercase tracking-widest text-[10px]"
                >
                  {isReconciling ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <RotateCwIcon className="h-4 w-4" />}
                  Reconcile All Balances
                </button>
              </div>
              <p className="text-white/40 text-sm font-medium leading-relaxed max-w-2xl">
                The reconciliation protocol recalculates all user balances by auditing the entire public ledger. Use this if users report balance discrepancies or after major protocol upgrades.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] relative overflow-hidden">
                  <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none mb-6">Treasury Vaults</h3>
                  <div className="space-y-4">
                    {vaults.map(vault => (
                      <div key={vault.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                        <div>
                          <p className="text-xs font-black text-white uppercase leading-none mb-1">{vault.name}</p>
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{vault.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-brand-gold leading-none">{vault.balance.toLocaleString()}</p>
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">UBT</p>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
               
               <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] relative overflow-hidden">
                  <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none mb-6">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setActiveView('users')} className="p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 transition-all text-center group">
                      <UsersIcon className="h-8 w-8 text-brand-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">Manage Users</p>
                    </button>
                    <button onClick={() => setActiveView('wallets')} className="p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 transition-all text-center group">
                      <WalletIcon className="h-8 w-8 text-brand-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">Wallets & Price</p>
                    </button>
                    <button onClick={() => setActiveView('payouts')} className="p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 transition-all text-center group">
                      <TrendingUpIcon className="h-8 w-8 text-brand-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">Payout Requests</p>
                    </button>
                    <button onClick={() => setActiveView('reports')} className="p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 transition-all text-center group">
                      <BellIcon className="h-8 w-8 text-brand-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">System Reports</p>
                    </button>
                  </div>
               </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-black text-white font-sans selection:bg-brand-gold/30">
      {/* Sidebar Navigation */}
      <nav className="w-full lg:w-72 bg-midnight-light border-r border-white/5 p-8 flex flex-col gap-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-brand-gold/10 p-2 rounded-xl border border-brand-gold/20">
            <ShieldCheckIcon className="h-8 w-8 text-brand-gold" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tighter text-white uppercase leading-none">Admin</h2>
            <p className="text-[10px] font-bold text-brand-gold tracking-[0.3em] uppercase opacity-60">Control Node</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveView('overview')}
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all uppercase tracking-widest text-[10px] font-black ${activeView === 'overview' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutDashboardIcon className="h-4 w-4" />
            Overview
          </button>
          <button 
            onClick={() => setActiveView('users')}
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all uppercase tracking-widest text-[10px] font-black ${activeView === 'users' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <UsersIcon className="h-4 w-4" />
            Users
          </button>
          <button 
            onClick={() => setActiveView('wallets')}
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all uppercase tracking-widest text-[10px] font-black ${activeView === 'wallets' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <WalletIcon className="h-4 w-4" />
            Wallets
          </button>
          <button 
            onClick={() => setActiveView('governance')}
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all uppercase tracking-widest text-[10px] font-black ${activeView === 'governance' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <TrendingUpIcon className="h-4 w-4" />
            Governance
          </button>
          <button 
            onClick={() => setActiveView('ventures')}
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all uppercase tracking-widest text-[10px] font-black ${activeView === 'ventures' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <BriefcaseIcon className="h-4 w-4" />
            Ventures
          </button>
          <button 
            onClick={() => setActiveView('payouts')}
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all uppercase tracking-widest text-[10px] font-black ${activeView === 'payouts' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <TrendingUpIcon className="h-4 w-4" />
            Payouts
          </button>
          <button 
            onClick={() => setActiveView('reports')}
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all uppercase tracking-widest text-[10px] font-black ${activeView === 'reports' ? 'bg-brand-gold text-slate-950 shadow-glow-gold' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <BellIcon className="h-4 w-4" />
            Reports
          </button>
        </div>

        <div className="mt-auto pt-8 border-t border-white/5">
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="h-8 w-8 rounded-full bg-brand-gold/20 flex items-center justify-center border border-brand-gold/30">
              <ShieldCheckIcon className="h-4 w-4 text-brand-gold" />
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-[10px] font-black text-white leading-none uppercase truncate">{user.name}</p>
              <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Root Admin</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto no-scrollbar">
        {renderContent()}
      </main>
    </div>
  );
};
