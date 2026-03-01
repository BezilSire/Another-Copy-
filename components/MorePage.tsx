import React from 'react';
import { User, MemberUser } from '../types';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { LogOutIcon } from './icons/LogOutIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { BellIcon } from './icons/BellIcon';
import { HelpCircleIcon } from './icons/HelpCircleIcon';
import { KeyIcon } from './icons/KeyIcon';
import { GlobeIcon } from './icons/GlobeIcon';

interface MorePageProps {
  user: MemberUser;
  onLogout: () => void;
  onViewProfile: (userId: string) => void;
}

export const MorePage: React.FC<MorePageProps> = ({ user, onLogout, onViewProfile }) => {
  return (
    <div className="space-y-8 animate-fade-in pb-24">
      <div className="flex items-center gap-6 mb-10">
        <div className="w-20 h-20 bg-brand-gold/10 rounded-3xl border-2 border-brand-gold/30 flex items-center justify-center shadow-glow-gold">
          <UserCircleIcon className="h-10 w-10 text-brand-gold" />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">{user.name}</h2>
          <p className="text-sm font-bold text-brand-gold tracking-[0.4em] uppercase opacity-60 mt-2">{user.role} Node</p>
        </div>
      </div>

      <div className="space-y-4">
        <button 
          onClick={() => onViewProfile(user.id)}
          className="w-full bg-white/5 border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
              <UserCircleIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-black text-white uppercase tracking-widest leading-none">Identity Profile</p>
          </div>
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Manage</p>
        </button>

        <button className="w-full bg-white/5 border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
              <ShieldCheckIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-black text-white uppercase tracking-widest leading-none">Security Protocol</p>
          </div>
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Locked</p>
        </button>

        <button className="w-full bg-white/5 border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
              <BellIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-black text-white uppercase tracking-widest leading-none">Alert Settings</p>
          </div>
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Active</p>
        </button>

        <button className="w-full bg-white/5 border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
              <GlobeIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-black text-white uppercase tracking-widest leading-none">Network Status</p>
          </div>
          <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Online</p>
        </button>

        <button className="w-full bg-white/5 border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
              <HelpCircleIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-black text-white uppercase tracking-widest leading-none">Protocol Support</p>
          </div>
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Help</p>
        </button>
      </div>

      <div className="pt-8 border-t border-white/10">
        <button 
          onClick={onLogout}
          className="w-full bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex items-center justify-between hover:bg-red-500/20 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:text-red-300 transition-colors">
              <LogOutIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-black text-red-400 uppercase tracking-widest leading-none">Terminate Session</p>
          </div>
          <p className="text-[10px] font-bold text-red-400/40 uppercase tracking-widest">Log Out</p>
        </button>
      </div>
    </div>
  );
};
