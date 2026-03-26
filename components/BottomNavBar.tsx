import React from 'react';
import { User } from '../types';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { UsersIcon } from './icons/UsersIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { LogOutIcon } from './icons/LogOutIcon';
import { BellIcon } from './icons/BellIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { WalletIcon } from './icons/WalletIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';

import { SparkleIcon } from './icons/SparkleIcon';

type NavView = 'home' | 'wallet' | 'ledger' | 'governance' | 'ventures' | 'more' | 'dashboard' | 'members' | 'profile' | 'notifications' | 'knowledge' | 'brain';

interface BottomNavBarProps {
  user: User;
  activeView: string;
  onNavigate: (view: any) => void;
  unreadCount: number;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
}> = ({ icon, label, isActive, onClick, count }) => (
  <button
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 rounded-xl h-14 ${
      isActive ? 'text-brand-gold' : 'text-slate-500 hover:text-slate-300'
    }`}
  >
    <span className={`h-5 w-5 mb-1 transition-all ${isActive ? 'scale-110' : 'scale-100'}`}>{icon}</span>
    <span className={`text-[10px] font-medium tracking-tight ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
     {count !== undefined && count > 0 && (
        <span className="absolute top-2.5 right-1/2 translate-x-3.5 block w-2 h-2 bg-brand-gold rounded-full border-2 border-slate-900 shadow-sm"></span>
    )}
    {isActive && (
      <span className="absolute -bottom-1 w-1 h-1 bg-brand-gold rounded-full"></span>
    )}
  </button>
);

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ user, activeView, onNavigate, unreadCount }) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 glass-panel border-t border-white/5 shadow-premium z-40 px-4 pb-safe">
      <nav className="max-w-2xl mx-auto flex justify-around items-center h-16 gap-1">
        <NavItem icon={<LayoutDashboardIcon />} label="Home" isActive={activeView === 'home'} onClick={() => onNavigate('home')} />
        <NavItem icon={<WalletIcon />} label="Wallet" isActive={activeView === 'wallet'} onClick={() => onNavigate('wallet')} />
        <NavItem icon={<SparkleIcon />} label="Brain" isActive={activeView === 'brain'} onClick={() => onNavigate('brain')} />
        <NavItem icon={<BriefcaseIcon />} label="Ventures" isActive={activeView === 'ventures'} onClick={() => onNavigate('ventures')} />
        <NavItem icon={<UserCircleIcon />} label="Profile" isActive={activeView === 'profile'} onClick={() => onNavigate('profile')} />
      </nav>
    </footer>
  );
};
