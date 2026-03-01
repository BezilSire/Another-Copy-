import React, { useState, useEffect } from 'react';
import { Agent, User, Broadcast, Notification, Activity } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { UsersIcon } from './icons/UsersIcon';
import { WalletIcon } from './icons/WalletIcon';
import { BellIcon } from './icons/BellIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { BottomNavBar } from './BottomNavBar';

interface AgentDashboardProps {
  user: Agent;
  broadcasts: Broadcast[];
  onUpdateUser: (data: Partial<User>) => Promise<void>;
  activeView: string;
  setActiveView: (view: any) => void;
  onViewProfile: (userId: string) => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ user, broadcasts, onUpdateUser, activeView, setActiveView, onViewProfile }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { addToast } = useToast();

  useEffect(() => {
    const unsub = api.listenForNotifications(user.id, (notifs) => {
      setUnreadCount(notifs.filter(n => !n.read).length);
    });
    return () => unsub();
  }, [user.id]);

  const renderContent = () => {
    switch (activeView) {
      case 'members': return <div className="p-8 text-center text-white/40 uppercase tracking-widest font-black">Member Management Protocol Active</div>;
      case 'wallet': return <div className="p-8 text-center text-white/40 uppercase tracking-widest font-black">Agent Commission Vault Online</div>;
      case 'notifications': return <div className="p-8 text-center text-white/40 uppercase tracking-widest font-black">Alert Stream Synchronized</div>;
      case 'knowledge': return <div className="p-8 text-center text-white/40 uppercase tracking-widest font-black">Protocol Documentation Loaded</div>;
      case 'profile': return <div className="p-8 text-center text-white/40 uppercase tracking-widest font-black">Agent Identity Matrix</div>;
      default:
        return (
          <div className="space-y-8 animate-fade-in pb-24">
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] relative overflow-hidden shadow-premium">
              <div className="corner-tl !border-white/20"></div><div className="corner-tr !border-white/20"></div><div className="corner-bl !border-white/20"></div><div className="corner-br !border-white/20"></div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-2">Commission Balance</p>
              <div className="flex items-baseline gap-3">
                <p className="text-6xl font-black text-white tracking-tighter leading-none">{(user.commissionBalance || 0).toFixed(2)}</p>
                <p className="text-lg font-black text-brand-gold uppercase tracking-widest leading-none">UBT</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Agent Code</p>
                <p className="text-xl font-black text-brand-gold tracking-tighter uppercase">{user.agent_code}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Circle</p>
                <p className="text-xl font-black text-white tracking-tighter uppercase">{user.circle}</p>
              </div>
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
