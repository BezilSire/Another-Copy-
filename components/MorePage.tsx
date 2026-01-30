
import React from 'react';
import { User, NavView } from '../types';
import { UserIcon } from './icons/UserIcon';
import { BellIcon } from './icons/BellIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { HeartIcon } from './icons/HeartIcon';
import { LogOutIcon } from './icons/LogOutIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { LockIcon } from './icons/LockIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { ScaleIcon } from './icons/ScaleIcon';

interface MorePageProps {
  user: User;
  onNavigate: (view: NavView) => void;
  onLogout: () => void;
  notificationCount: number;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badgeCount?: number;
  highlight?: boolean;
}> = ({ icon, label, onClick, badgeCount, highlight }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center p-5 rounded-2xl transition-all duration-300 border border-white/5 hover:border-brand-gold/20 ${highlight ? 'bg-brand-gold/5' : 'bg-slate-900/40 hover:bg-slate-900'}`}
  >
    <div className={`flex-shrink-0 p-3 rounded-xl ${highlight ? 'bg-brand-gold/10 text-brand-gold' : 'bg-slate-800 text-slate-400 group-hover:text-white'}`}>{icon}</div>
    <span className="flex-1 ml-5 text-left font-bold text-sm text-slate-300 group-hover:text-white">{label}</span>
    {badgeCount !== undefined && badgeCount > 0 && (
      <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badgeCount}</span>
    )}
    <ChevronRightIcon className="h-4 w-4 text-slate-600 ml-2" />
  </button>
);

export const MorePage: React.FC<MorePageProps> = ({ user, onNavigate, onLogout, notificationCount }) => {
  return (
    <div className="animate-fade-in space-y-10 max-w-2xl mx-auto pb-20 font-sans">
      <div className="flex items-center space-x-6 p-8 bg-slate-950 border border-white/5 rounded-3xl shadow-xl">
        <div className="w-16 h-16 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center">
            <UserIcon className="h-8 w-8 text-slate-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{user.name}</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Community Member</p>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-4 mb-3">Your Account</h3>
        <NavItem icon={<UserIcon className="h-4 w-4" />} label="Edit Profile" onClick={() => onNavigate('profile')} />
        <NavItem icon={<BellIcon className="h-4 w-4" />} label="Notifications" onClick={() => onNavigate('notifications')} badgeCount={notificationCount} />
        <NavItem icon={<LockIcon className="h-4 w-4" />} label="Identity Vault" onClick={() => onNavigate('security')} />
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-4 mb-3">Community State</h3>
        <NavItem icon={<ShieldCheckIcon className="h-4 w-4" />} label="The Registry" onClick={() => onNavigate('state')} />
        <NavItem icon={<ScaleIcon className="h-4 w-4" />} label="Justice Hub" onClick={() => onNavigate('state')} />
        <NavItem icon={<HistoryIcon className="h-4 w-4" />} label="Audit Ledger" onClick={() => onNavigate('audit')} />
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-4 mb-3">Ecosystem</h3>
        <NavItem icon={<HeartIcon className="h-4 w-4" />} label="Sustenance Dividend" onClick={() => onNavigate('sustenance')} />
        <NavItem icon={<BookOpenIcon className="h-4 w-4" />} label="Knowledge Base" onClick={() => onNavigate('knowledge')} />
      </div>

      <div className="pt-6">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center p-5 bg-red-950/10 border border-red-900/20 rounded-2xl hover:bg-red-900/20 transition-all text-red-500 font-bold text-sm uppercase tracking-wide"
        >
          <LogOutIcon className="h-4 w-4 mr-3" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
