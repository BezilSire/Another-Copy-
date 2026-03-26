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
import { DollarSignIcon } from './icons/DollarSignIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { RotateCwIcon } from './icons/RotateCwIcon';
import { AdminUserManagement } from './AdminUserManagement';
import { WalletAdminPage } from './WalletAdminPage';
import { ProposalsAdminPage } from './ProposalsAdminPage';
import { VenturesAdminPage } from './VenturesAdminPage';
import { PayoutsAdminPage } from './PayoutsAdminPage';
import { ReportsView } from './ReportsView';
import { DistressCallsAdminView } from './DistressCallsAdminView';
import { SirenIcon } from './icons/SirenIcon';
import { AgenticShell } from './AgenticShell';
import { SparkleIcon } from './icons/SparkleIcon';

import { ConfirmationDialog } from './ConfirmationDialog';

interface AdminDashboardProps {
  user: Admin;
  onUpdateUser: (data: Partial<User>) => Promise<void>;
  unreadCount: number;
  onViewProfile: (userId: string) => void;
  onLogout: () => void;
  forcedView: string | null;
  clearForcedView: () => void;
}

type AdminView = 'overview' | 'users' | 'wallets' | 'governance' | 'ventures' | 'payouts' | 'reports' | 'distress' | 'brain';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onUpdateUser, unreadCount, onViewProfile, onLogout, forcedView, clearForcedView }) => {
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
  const [vaults, setVaults] = useState<TreasuryVault[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isReconcileConfirmOpen, setIsReconcileConfirmOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (forcedView) {
        if (forcedView === 'users') setActiveView('users');
        else if (forcedView === 'wallets') setActiveView('wallets');
        else if (forcedView === 'brain') setActiveView('brain');
        clearForcedView();
    }
  }, [forcedView, clearForcedView]);

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
    setIsReconcileConfirmOpen(false);
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
      case 'distress': return <DistressCallsAdminView />;
      case 'brain': return (
        <div className="fixed inset-0 z-50 bg-slate-950">
          <AgenticShell 
            user={user as any} 
            onLogout={onLogout} 
            onViewProfile={(id) => onViewProfile(id)} 
            onSwitchView={() => {}} 
          />
        </div>
      );
      default:
        return (
          <div className="space-y-8 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="pro-card p-6 relative overflow-hidden group hover:border-white/20 transition-all shadow-premium">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">Total Users</p>
                <p className="text-4xl font-bold text-white leading-none">{allUsers.length}</p>
                <UsersIcon className="absolute -bottom-4 -right-4 h-20 w-20 text-white/5 group-hover:text-white/10 transition-all" />
              </div>
              
              <div className="pro-card p-6 relative overflow-hidden group hover:border-brand-gold/30 transition-all shadow-premium">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">UBT Price</p>
                <p className="text-4xl font-bold text-brand-gold leading-none">${economy?.ubt_to_usd_rate.toFixed(4) || '0.0000'}</p>
                <TrendingUpIcon className="absolute -bottom-4 -right-4 h-20 w-20 text-brand-gold/5 group-hover:text-brand-gold/10 transition-all" />
              </div>

              <div className="pro-card p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-premium">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">CVP Backing</p>
                <p className="text-4xl font-bold text-emerald-400 leading-none">${economy?.cvp_usd_backing.toLocaleString() || '0'}</p>
                <ShieldCheckIcon className="absolute -bottom-4 -right-4 h-20 w-20 text-emerald-400/5 group-hover:text-emerald-400/10 transition-all" />
              </div>

              <div className="pro-card p-6 relative overflow-hidden group hover:border-white/20 transition-all shadow-premium">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">Treasury Balance</p>
                <p className="text-4xl font-bold text-white leading-none">{vaults.reduce((acc, v) => acc + v.balance, 0).toLocaleString()}</p>
                <WalletIcon className="absolute -bottom-4 -right-4 h-20 w-20 text-white/5 group-hover:text-white/10 transition-all" />
              </div>
            </div>

            <div className="pro-card p-8 relative overflow-hidden shadow-premium">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight mb-2">System Maintenance</h3>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl">
                    The reconciliation protocol recalculates all user balances by auditing the entire public ledger. Use this if users report balance discrepancies or after major protocol upgrades.
                  </p>
                </div>
                <button 
                  onClick={() => setIsReconcileConfirmOpen(true)}
                  disabled={isReconciling}
                  className="flex items-center gap-2 px-6 py-3 bg-brand-gold hover:bg-brand-gold-light text-slate-950 font-bold rounded-xl transition-all active:scale-[0.98] shadow-md disabled:opacity-50 text-xs"
                >
                  {isReconciling ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <RotateCwIcon className="h-4 w-4" />}
                  Reconcile Balances
                </button>
              </div>
            </div>

            <ConfirmationDialog 
              isOpen={isReconcileConfirmOpen} 
              onClose={() => setIsReconcileConfirmOpen(false)} 
              onConfirm={handleReconcile} 
              title="Reconcile All Balances" 
              message="Are you sure you want to reconcile all balances? This will recalculate every user's balance from the ledger. This is a heavy operation that may take some time." 
              confirmButtonText="Reconcile Now" 
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="pro-card p-8 relative overflow-hidden shadow-premium">
                  <h3 className="text-xl font-bold text-white tracking-tight mb-6">Treasury Vaults</h3>
                  <div className="space-y-3">
                    {vaults.map(vault => (
                      <div key={vault.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                        <div>
                          <p className="text-xs font-bold text-white uppercase mb-0.5">{vault.name}</p>
                          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{vault.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-brand-gold leading-none">{vault.balance.toLocaleString()}</p>
                          <p className="text-[10px] font-medium text-slate-600 uppercase tracking-widest mt-1">UBT</p>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
               
               <div className="pro-card p-8 relative overflow-hidden shadow-premium">
                  <h3 className="text-xl font-bold text-white tracking-tight mb-6">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setActiveView('users')} className="p-6 bg-slate-900/50 hover:bg-slate-900 rounded-2xl border border-white/5 transition-all text-center group">
                      <UsersIcon className="h-7 w-7 text-brand-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-bold text-white uppercase tracking-wider">Manage Users</p>
                    </button>
                    <button onClick={() => setActiveView('wallets')} className="p-6 bg-slate-900/50 hover:bg-slate-900 rounded-2xl border border-white/5 transition-all text-center group">
                      <WalletIcon className="h-7 w-7 text-brand-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-bold text-white uppercase tracking-wider">Wallets & Price</p>
                    </button>
                    <button onClick={() => setActiveView('payouts')} className="p-6 bg-slate-900/50 hover:bg-slate-900 rounded-2xl border border-white/5 transition-all text-center group">
                      <DollarSignIcon className="h-7 w-7 text-brand-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-bold text-white uppercase tracking-wider">Payout Requests</p>
                    </button>
                    <button onClick={() => setActiveView('reports')} className="p-6 bg-slate-900/50 hover:bg-slate-900 rounded-2xl border border-white/5 transition-all text-center group">
                      <BellIcon className="h-7 w-7 text-brand-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-bold text-white uppercase tracking-wider">System Reports</p>
                    </button>
                    <button onClick={() => setActiveView('distress')} className="p-6 bg-slate-900/50 hover:bg-slate-900 rounded-2xl border border-white/5 transition-all text-center group">
                      <SirenIcon className="h-7 w-7 text-red-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-bold text-white uppercase tracking-wider">Distress Calls</p>
                    </button>
                  </div>
               </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950 text-white font-sans selection:bg-brand-gold/30">
      {/* Sidebar Navigation */}
      <nav className="w-full lg:w-72 glass-panel border-r border-white/5 p-8 flex flex-col gap-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-brand-gold/10 p-2.5 rounded-xl border border-brand-gold/20">
            <ShieldCheckIcon className="h-7 w-7 text-brand-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white leading-none">UGC Admin</h2>
            <p className="text-[10px] font-medium text-brand-gold tracking-wider uppercase opacity-80">Global Commons Admin Panel</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <button 
            onClick={() => setActiveView('overview')}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all text-xs font-semibold ${activeView === 'overview' ? 'bg-brand-gold text-slate-950 shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutDashboardIcon className="h-4 w-4" />
            Overview
          </button>
          <button 
            onClick={() => setActiveView('brain')}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all text-xs font-semibold ${activeView === 'brain' ? 'bg-brand-gold text-slate-950 shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <SparkleIcon className="h-4 w-4" />
            Commons Brain
          </button>
          <button 
            onClick={() => setActiveView('users')}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all text-xs font-semibold ${activeView === 'users' ? 'bg-brand-gold text-slate-950 shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <UsersIcon className="h-4 w-4" />
            Users
          </button>
          <button 
            onClick={() => setActiveView('wallets')}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all text-xs font-semibold ${activeView === 'wallets' ? 'bg-brand-gold text-slate-950 shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <WalletIcon className="h-4 w-4" />
            Wallets
          </button>
          <button 
            onClick={() => setActiveView('governance')}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all text-xs font-semibold ${activeView === 'governance' ? 'bg-brand-gold text-slate-950 shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <ScaleIcon className="h-4 w-4" />
            Governance
          </button>
          <button 
            onClick={() => setActiveView('ventures')}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all text-xs font-semibold ${activeView === 'ventures' ? 'bg-brand-gold text-slate-950 shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <BriefcaseIcon className="h-4 w-4" />
            Ventures
          </button>
          <button 
            onClick={() => setActiveView('payouts')}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all text-xs font-semibold ${activeView === 'payouts' ? 'bg-brand-gold text-slate-950 shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <DollarSignIcon className="h-4 w-4" />
            Payouts
          </button>
          <button 
            onClick={() => setActiveView('reports')}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all text-xs font-semibold ${activeView === 'reports' ? 'bg-brand-gold text-slate-950 shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <BellIcon className="h-4 w-4" />
            Reports
          </button>
          <button 
            onClick={() => setActiveView('distress')}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all text-xs font-semibold ${activeView === 'distress' ? 'bg-brand-gold text-slate-950 shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <SirenIcon className="h-4 w-4" />
            Distress Calls
          </button>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-white/5">
            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
              <ShieldCheckIcon className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-xs font-bold text-white leading-none truncate">{user.name}</p>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight mt-1">Root Admin</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 p-8 lg:p-10 overflow-y-auto no-scrollbar">
        {renderContent()}
      </div>
    </div>
  );
};
