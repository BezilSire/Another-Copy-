import React, { useState, useEffect } from 'react';
import { MemberUser, User, GlobalEconomy, UbtTransaction, Notification, Activity, Post, Proposal, Venture, RedemptionCycle, SustenanceCycle, SustenanceVoucher, VentureEquityHolding, UserVault } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { WalletIcon } from './icons/WalletIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { BellIcon } from './icons/BellIcon';
import { ArrowUpRightIcon } from './icons/ArrowUpRightIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { RotateCwIcon } from './icons/RotateCwIcon';
import { SirenIcon } from './icons/SirenIcon';
import { ActivityFeed } from './ActivityFeed';
import { DistressCallModal } from './DistressCallModal';
import { ProposalsPage } from './ProposalsPage';
import { VenturesPage } from './VenturesPage';
import { LedgerPage } from './LedgerPage';
import { WalletPage } from './WalletPage';
import { MorePage } from './MorePage';
import { ZimPulseFeed } from './ZimPulseFeed';
import { BottomNavBar } from './BottomNavBar';
import { AgenticShell } from './AgenticShell';

interface MemberDashboardProps {
  user: MemberUser;
  onUpdateUser: (data: Partial<User>) => Promise<void>;
  unreadCount: number;
  onLogout: () => void;
  onViewProfile: (userId: string | null) => void;
  forcedView: string | null;
  clearForcedView: () => void;
}

type MemberView = 'home' | 'wallet' | 'ledger' | 'governance' | 'ventures' | 'profile' | 'notifications' | 'more' | 'brain';

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ user, onUpdateUser, unreadCount, onLogout, onViewProfile, forcedView, clearForcedView }) => {
  const [activeView, setActiveView] = useState<MemberView>('home');
  const [economy, setEconomy] = useState<GlobalEconomy | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isDistressModalOpen, setIsDistressModalOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (forcedView) {
        if (forcedView === 'governance') setActiveView('governance');
        else if (forcedView === 'ledger') setActiveView('ledger');
        else if (forcedView === 'wallet') setActiveView('wallet');
        else if (forcedView === 'brain') setActiveView('brain');
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
      case 'more': return <MorePage user={user} onLogout={onLogout} onViewProfile={onViewProfile} onNavigate={setActiveView} />;
      case 'brain': return (
        <div className="fixed inset-0 z-50 bg-slate-950">
          <AgenticShell 
            user={user} 
            onLogout={onLogout} 
            onViewProfile={(id) => onViewProfile(id)} 
            onSwitchView={() => {}} 
          />
        </div>
      );
      default:
        return (
          <div className="space-y-8 animate-slide-up pb-24">
            {/* Balance Card */}
            <div className="pro-card p-6 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="label-caps !mb-1">Available Balance</p>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-4xl font-bold tracking-tight text-white">
                      {(user.ubtBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                    <span className="text-sm font-semibold text-brand-gold">UBT</span>
                  </div>
                </div>
                <div className="bg-brand-gold/10 p-3 rounded-2xl border border-brand-gold/20">
                  <WalletIcon className="h-6 w-6 text-brand-gold" />
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <p className="text-sm text-slate-400">
                  ≈ <span className="text-white font-medium">${( (user.ubtBalance || 0) * (economy?.ubt_to_usd_rate || 0) ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> <span className="text-[10px] uppercase tracking-wider opacity-50 ml-1">USD</span>
                </p>
                <button 
                  onClick={handleReconcile}
                  disabled={isReconciling}
                  className="flex items-center gap-2 text-xs font-semibold text-brand-gold hover:text-brand-gold-light transition-colors"
                >
                  {isReconciling ? <LoaderIcon className="h-3 w-3 animate-spin" /> : <RotateCwIcon className="h-3 w-3" />}
                  Sync Balance
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setActiveView('wallet')} 
                className="pro-card p-5 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors">
                  <ArrowUpRightIcon className="h-6 w-6 text-brand-gold" />
                </div>
                <span className="text-sm font-medium text-slate-200">Transfer</span>
              </button>
              <button 
                onClick={() => setActiveView('governance')} 
                className="pro-card p-5 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors">
                  <ScaleIcon className="h-6 w-6 text-brand-gold" />
                </div>
                <span className="text-sm font-medium text-slate-200">Governance</span>
              </button>
              <button 
                onClick={() => setIsDistressModalOpen(true)} 
                className="pro-card p-5 flex flex-col items-center justify-center gap-3 hover:bg-red-500/10 transition-colors group border-red-500/20"
              >
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors animate-pulse">
                  <SirenIcon className="h-6 w-6 text-red-500" />
                </div>
                <span className="text-sm font-medium text-red-500/80">Distress Call</span>
              </button>
            </div>

            {/* Zim Pulse Feed (The Intelligence Layer) */}
            <div className="space-y-4">
              <ZimPulseFeed />
            </div>

            {/* Activity Feed */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-bold text-white">Community Pulse</h3>
                <button className="text-xs font-medium text-slate-400 hover:text-white transition-colors">View All</button>
              </div>
              <ActivityFeed user={user} onViewProfile={onViewProfile} />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-brand-gold/30">
      <div className="max-w-2xl mx-auto px-6 pt-8">
        {renderContent()}
      </div>
      
      <BottomNavBar user={user} activeView={activeView} onNavigate={setActiveView} unreadCount={unreadCount} />
      
      <DistressCallModal 
        isOpen={isDistressModalOpen} 
        onClose={() => setIsDistressModalOpen(false)} 
        user={user} 
        onSuccess={() => {}} 
      />
    </div>
  );
};
