
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
import { VideoIcon } from './icons/VideoIcon';

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
    className={`w-full flex items-center p-5 rounded-[2rem] transition-all duration-300 border border-white/5 hover:border-brand-gold/20 ${highlight ? 'bg-brand-gold/5' : 'bg-slate-900/40 hover:bg-slate-900'}`}
  >
    <div className={`flex-shrink-0 p-3 rounded-xl ${highlight ? 'bg-brand-gold/10 text-brand-gold' : 'bg-slate-800 text-gray-500 group-hover:text-white'}`}>{icon}</div>
    <span className="flex-1 ml-5 text-left font-black uppercase tracking-[0.2em] text-[10px] text-gray-400 group-hover:text-white">{label}</span>
    {badgeCount !== undefined && badgeCount > 0 && (
      <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{badgeCount}</span>
    )}
    <ChevronRightIcon className="h-4 w-4 text-gray-700 ml-2" />
  </button>
);

export const MorePage: React.FC<MorePageProps> = ({ user, onNavigate, onLogout, notificationCount }) => {
  return (
    <div className="animate-fade-in space-y-10 max-w-2xl mx-auto pb-20">
      {/* Node Status Header */}
      <div className="flex items-center space-x-6 p-8 bg-slate-950/60 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-gold/[0.03] to-transparent pointer-events-none"></div>
        <div className="w-20 h-20 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center shadow-inner">
            <UserIcon className="h-10 w-10 text-gray-600" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter gold-text leading-none">{user.name}</h1>
          <p className="label-caps !text-[9px] !text-gray-500 mt-2 font-black !tracking-[0.4em]">Protocol Node Operational</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="label-caps !text-[9px] !text-gray-600 pl-4 mb-4">Node Operations</h3>
        <NavItem icon={<UserIcon className="h-4 w-4" />} label="Identity Profile" onClick={() => onNavigate('profile')} />
        <NavItem icon={<BellIcon className="h-4 w-4" />} label="Protocol Alerts" onClick={() => onNavigate('notifications')} badgeCount={notificationCount} />
        <NavItem icon={<VideoIcon className="h-4 w-4" />} label="Sovereign Meetings" onClick={() => onNavigate('meetings')} highlight />
        <NavItem icon={<LockIcon className="h-4 w-4" />} label="Identity Vault" onClick={() => onNavigate('security')} />
      </div>

      <div className="space-y-3">
        <h3 className="label-caps !text-[9px] !text-gray-600 pl-4 mb-4">Network State</h3>
        <NavItem icon={<ShieldCheckIcon className="h-4 w-4" />} label="Sovereign State (Registry)" onClick={() => onNavigate('state')} />
        <NavItem icon={<ScaleIcon className="h-4 w-4" />} label="Justice Hub (Tribunals)" onClick={() => onNavigate('state')} />
        <NavItem icon={<HistoryIcon className="h-4 w-4" />} label="Protocol Audit" onClick={() => onNavigate('audit')} />
      </div>

      <div className="space-y-3">
        <h3 className="label-caps !text-[9px] !text-gray-600 pl-4 mb-4">Ecosystem Modules</h3>
        <NavItem icon={<HeartIcon className="h-4 w-4" />} label="Sustenance Dividend" onClick={() => onNavigate('sustenance')} />
        <NavItem icon={<BookOpenIcon className="h-4 w-4" />} label="Protocol Knowledge" onClick={() => onNavigate('knowledge')} />
      </div>

      <div className="pt-6">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center p-6 bg-red-500/5 border border-red-900/20 rounded-[2rem] hover:bg-red-500/10 transition-all text-red-500 font-black uppercase tracking-[0.3em] text-[10px]"
        >
          <LogOutIcon className="h-4 w-4 mr-3" />
          <span>Disconnect Node</span>
        </button>
      </div>
    </div>
  );
};
