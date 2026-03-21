import React from 'react';
import { User } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { LogOutIcon } from './icons/LogOutIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { BellIcon } from './icons/BellIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { SirenIcon } from './icons/SirenIcon';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onViewProfile: (userId: string) => void;
  onVoteClick: () => void;
  onRadarClick: () => void;
  onDistressClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onViewProfile, onVoteClick, onRadarClick, onDistressClick }) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel py-3 px-6 flex items-center justify-between shadow-premium">
      <div className="flex items-center gap-3">
        <div className="bg-brand-gold/10 p-2 rounded-xl border border-brand-gold/20">
          <LogoIcon className="h-7 w-7 text-brand-gold" />
        </div>
        <div className="hidden sm:block">
          <h1 className="text-lg font-bold tracking-tight text-white leading-none">Ubuntium Global Commons</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 mr-2">
          <button onClick={onRadarClick} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all" title="Radar">
            <GlobeIcon className="h-5 w-5" />
          </button>
          <button onClick={onVoteClick} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all" title="Governance">
            <TrendingUpIcon className="h-5 w-5" />
          </button>
          <button onClick={onDistressClick} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500/60 hover:text-red-500 transition-all animate-pulse" title="Distress Call">
            <SirenIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="h-6 w-px bg-white/10 mx-1"></div>

        <div className="flex items-center gap-2">
          <button onClick={() => onViewProfile(user.id)} className="flex items-center gap-2.5 p-1 pr-3 rounded-full hover:bg-white/5 transition-all">
            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
              <UserCircleIcon className="h-5 w-5 text-slate-400" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-white leading-none">{user.name}</p>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight mt-0.5">{user.role}</p>
            </div>
          </button>
          
          <button onClick={onLogout} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all" title="Log Out">
            <LogOutIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
