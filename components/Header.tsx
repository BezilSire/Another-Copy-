import React from 'react';
import { User } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { LogOutIcon } from './icons/LogOutIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { BellIcon } from './icons/BellIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { SearchIcon } from './icons/SearchIcon';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onViewProfile: (userId: string) => void;
  onChatClick: () => void;
  onMeetClick: () => void;
  onVoteClick: () => void;
  onRadarClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onViewProfile, onChatClick, onMeetClick, onVoteClick, onRadarClick }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-midnight/80 backdrop-blur-md border-b border-white/5 py-4 px-6 flex items-center justify-between shadow-soft">
      <div className="flex items-center gap-4">
        <div className="bg-brand-gold/10 p-2 rounded-xl border border-brand-gold/20">
          <LogoIcon className="h-8 w-8 text-brand-gold" />
        </div>
        <div className="hidden sm:block">
          <h1 className="text-lg font-black tracking-tighter text-white uppercase leading-none">Ubuntium</h1>
          <p className="text-[10px] font-bold text-brand-gold tracking-[0.3em] uppercase opacity-60">Global Commons</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={onRadarClick} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/5" title="Radar">
          <GlobeIcon className="h-5 w-5" />
        </button>
        <button onClick={onChatClick} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/5" title="Chats">
          <MessageSquareIcon className="h-5 w-5" />
        </button>
        <button onClick={onVoteClick} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/5" title="Governance">
          <TrendingUpIcon className="h-5 w-5" />
        </button>
        
        <div className="h-8 w-px bg-white/10 mx-1"></div>

        <div className="flex items-center gap-3">
          <button onClick={() => onViewProfile(user.id)} className="flex items-center gap-3 p-1 pr-3 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/5">
            <div className="h-8 w-8 rounded-full bg-brand-gold/20 flex items-center justify-center border border-brand-gold/30">
              <UserCircleIcon className="h-5 w-5 text-brand-gold" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-black text-white leading-none uppercase">{user.name}</p>
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{user.role}</p>
            </div>
          </button>
          
          <button onClick={onLogout} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all border border-red-500/10" title="Log Out">
            <LogOutIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
