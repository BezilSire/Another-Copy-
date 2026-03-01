import React from 'react';
import { User, Agent } from '../types';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { UsersIcon } from './icons/UsersIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { LogOutIcon } from './icons/LogOutIcon';
import { BellIcon } from './icons/BellIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { WalletIcon } from './icons/WalletIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';

type NavView = 'home' | 'wallet' | 'ledger' | 'governance' | 'ventures' | 'more' | 'dashboard' | 'members' | 'profile' | 'notifications' | 'knowledge';

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
    className={`relative flex flex-col items-center justify-center flex-1 py-2 text-[10px] font-black transition-all duration-200 rounded-2xl h-16 uppercase tracking-widest ${
      isActive ? 'text-brand-gold bg-white/5' : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
    }`}
  >
    <span className={`h-5 w-5 mb-1.5 transition-transform ${isActive ? 'scale-110' : ''}`}>{icon}</span>
    <span className="truncate">{label}</span>
     {count !== undefined && count > 0 && (
        <span className="absolute top-3 right-1/2 translate-x-4 block w-2 h-2 bg-brand-gold rounded-full border-2 border-black shadow-glow-gold"></span>
    )}
  </button>
);

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ user, activeView, onNavigate, unreadCount }) => {
  const isAgent = user.role === 'agent';

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-midnight/90 backdrop-blur-xl border-t border-white/5 shadow-premium z-40 px-4 pb-safe">
      <nav className="max-w-2xl mx-auto flex justify-around items-center h-20 gap-1">
        {isAgent ? (
          <>
            <NavItem icon={<LayoutDashboardIcon />} label="Dash" isActive={activeView === 'dashboard'} onClick={() => onNavigate('dashboard')} />
            <NavItem icon={<UsersIcon />} label="Nodes" isActive={activeView === 'members'} onClick={() => onNavigate('members')} />
            <NavItem icon={<WalletIcon />} label="Vault" isActive={activeView === 'wallet'} onClick={() => onNavigate('wallet')} />
            <NavItem icon={<BellIcon />} label="Alerts" isActive={activeView === 'notifications'} onClick={() => onNavigate('notifications')} count={unreadCount} />
            <NavItem icon={<UserCircleIcon />} label="Self" isActive={activeView === 'profile'} onClick={() => onNavigate('profile')} />
          </>
        ) : (
          <>
            <NavItem icon={<LayoutDashboardIcon />} label="Home" isActive={activeView === 'home'} onClick={() => onNavigate('home')} />
            <NavItem icon={<WalletIcon />} label="Wallet" isActive={activeView === 'wallet'} onClick={() => onNavigate('wallet')} />
            <NavItem icon={<DatabaseIcon />} label="Ledger" isActive={activeView === 'ledger'} onClick={() => onNavigate('ledger')} />
            <NavItem icon={<BriefcaseIcon />} label="Ventures" isActive={activeView === 'ventures'} onClick={() => onNavigate('ventures')} />
            <NavItem icon={<UserCircleIcon />} label="More" isActive={activeView === 'more'} onClick={() => onNavigate('more')} count={unreadCount} />
          </>
        )}
      </nav>
    </footer>
  );
};
