import React, { useState, useEffect } from 'react';
import { MemberUser, User, GlobalEconomy, UbtTransaction, Notification, Activity, Post, Proposal, Venture, RedemptionCycle, SustenanceCycle, SustenanceVoucher, VentureEquityHolding, UserVault } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { WalletIcon } from './icons/WalletIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { BellIcon } from './icons/BellIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { RotateCwIcon } from './icons/RotateCwIcon';
import { ActivityFeed } from './ActivityFeed';
import { ProposalsPage } from './ProposalsPage';
import { VenturesPage } from './VenturesPage';
import { LedgerPage } from './LedgerPage';
import { WalletPage } from './WalletPage';
import { MorePage } from './MorePage';
import { BottomNavBar } from './BottomNavBar';

interface MemberDashboardProps {
  user: MemberUser;
  onUpdateUser: (data: Partial<User>) => Promise<void>;
  unreadCount: number;
  onLogout: () => void;
  onViewProfile: (userId: string | null) => void;
  forcedView: string | null;
  clearForcedView: () => void;
}

type MemberView = 'home' | 'wallet' | 'ledger' | 'governance' | 'ventures' | 'more';

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ user, onUpdateUser, unreadCount, onLogout, onViewProfile, forcedView, clearForcedView }) => {
  const [activeView, setActiveView] = useState<MemberView>('home');
  const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (forcedView) {
        if (forcedView === 'governance') setActiveView('governance');
        else if (forcedView === 'ledger') setActiveView('ledger');
        else if (forcedView === 'wallet') setActiveView('wallet');
        clearForcedView();
    }
  }, [forcedView, clearForcedView]);

  useEffect(() => {
    const unsubEconomy = api.listenForGlobalEconomy(setEconomy);
    return () => unsubEconomy();
  }, []);

  const handleReconcile = async () => {
    setIsReconciling(true);
    try {
      const newBal = await api.reconcileUserBalance(user.id);
      addToast(`Balance reconciled: ${newBal.toFixed(2)} $UBT`, "success");
    } catch (error) {
      addToast("Reconciliation failed.", "error");
    } finally {
      setIsReconciling(false);
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'wallet': return <WalletPage user={user} economy={economy} onReconcile={handleReconcile} isReconciling={isReconciling} />;
      case 'ledger': return <LedgerPage />;
      case 'governance': return <ProposalsPage currentUser={user} onNavigateToDetails={() => {}} />;
      case 'ventures': return <VenturesPage currentUser={user} onViewProfile={onViewProfile} onNavigateToPitchAssistant={() => setActiveView('home')} />;
      case 'more': return <MorePage user={user} onLogout={onLogout} onViewProfile={onViewProfile} />;
      default:
        return (
          <div className="space-y-8 animate-fade-in pb-24">
            <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] relative overflow-hidden group hover:bg-white/[0.08] transition-all">
              <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Wallet Balance</p>
                <div className="bg-brand-gold/10 p-2 rounded-xl border border-brand-gold/20">
                  <WalletIcon className="h-5 w-5 text-brand-gold" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-5xl font-black text-white leading-none">{(user.ubtBalance || 0).toFixed(2)}</p>
                <p className="text-sm font-bold text-brand-gold uppercase tracking-widest">UBT</p>
              </div>
              <div className="mt-6 flex items-center gap-4">
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest leading-none">≈ ${( (user.ubtBalance || 0) * (economy?.ubt_to_usd_rate || 0) ).toFixed(2)} USD</p>
                <button 
                  onClick={handleReconcile}
                  disabled={isReconciling}
                  className="flex items-center gap-2 text-[10px] font-black text-brand-gold hover:text-brand-gold-light transition-colors uppercase tracking-widest"
                >
                  {isReconciling ? <LoaderIcon className="h-3 w-3 animate-spin" /> : <RotateCwIcon className="h-3 w-3" />}
                  Reconcile
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setActiveView('wallet')} className="p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 transition-all text-center group">
                <TrendingUpIcon className="h-8 w-8 text-brand-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Transfer</p>
              </button>
              <button onClick={() => setActiveView('governance')} className="p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 transition-all text-center group">
                <DatabaseIcon className="h-8 w-8 text-brand-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Vote</p>
              </button>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none px-2">Community Pulse</h3>
              <ActivityFeed user={user} onViewProfile={onViewProfile} />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-brand-gold/30">
      <main className="max-w-2xl mx-auto px-6 pt-8">
        {renderContent()}
      </main>
      
      <BottomNavBar user={user} activeView={activeView} onNavigate={setActiveView} unreadCount={unreadCount} />
    </div>
  );
};
