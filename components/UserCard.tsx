import React from 'react';
import { User, PublicUserProfile } from '../types';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface UserCardProps {
  user: User | PublicUserProfile;
  onClick?: () => void;
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onClick, className }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-all cursor-pointer group ${className}`}
    >
      <div className="w-12 h-12 bg-brand-gold/10 rounded-xl border border-brand-gold/20 flex items-center justify-center group-hover:border-brand-gold/50 transition-all">
        <UserCircleIcon className="h-7 w-7 text-brand-gold" />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-sm font-black text-white uppercase tracking-tighter truncate leading-none mb-1">{user.name}</p>
        <div className="flex items-center gap-1.5">
          <ShieldCheckIcon className="h-3 w-3 text-brand-gold opacity-40" />
          <p className="text-[9px] font-bold text-brand-gold/60 uppercase tracking-widest truncate">{(user as User).role || 'Member'} Node</p>
        </div>
      </div>
    </div>
  );
};
