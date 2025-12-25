import React from 'react';
import { MemberUser, FilterType, MemberView } from '../types';
import { HomeIcon } from './icons/HomeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { WalletIcon } from './icons/WalletIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { SparkleIcon } from './icons/SparkleIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';

interface CommunityHubSidebarProps {
  activeView: MemberView;
  onChangeView: (view: MemberView) => void;
  user: MemberUser;
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const SidebarItem: React.FC<{ 
    label: string; 
    icon: React.ReactNode; 
    isActive: boolean; 
    onClick: () => void;
    count?: number; 
    premium?: boolean;
}> = ({ label, icon, isActive, onClick, count, premium }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all duration-300 group ${isActive ? 'bg-slate-800 text-white font-black' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'} ${premium && isActive ? 'ring-1 ring-brand-gold/30 text-brand-gold' : ''}`}
    >
        <div className={`p-2 rounded-xl transition-colors ${isActive ? (premium ? 'bg-brand-gold/10 text-brand-gold shadow-glow-gold' : 'bg-slate-900 text-green-400') : 'bg-transparent group-hover:bg-white/5'}`}>
            {icon}
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.2em]">{label}</span>
        {count !== undefined && count > 0 && (
            <span className="ml-auto bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{count}</span>
        )}
    </button>
);

const FilterItem: React.FC<{ label: string; value: FilterType; current: FilterType; onClick: (v: FilterType) => void }> = ({ label, value, current, onClick }) => (
    <button 
        onClick={() => onClick(value)}
        className={`text-[9px] px-3 py-1.5 rounded-full transition-all font-black uppercase tracking-widest ${current === value ? 'bg-brand-gold text-slate-950 font-black' : 'text-gray-600 hover:text-gray-300 bg-white/5'}`}
    >
        {label}
    </button>
);

export const CommunityHubSidebar: React.FC<CommunityHubSidebarProps> = ({ activeView, onChangeView, user, currentFilter, onFilterChange }) => {
  return (
    <div className="space-y-8 animate-fade-in">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] p-3 space-y-1 border border-white/5 shadow-2xl">
            <SidebarItem label="Oracle Feed" icon={<HomeIcon className="h-5 w-5"/>} isActive={activeView === 'home'} onClick={() => onChangeView('home')} />
            <SidebarItem label="Network Pulse" icon={<TrendingUpIcon className="h-5 w-5"/>} isActive={activeView === 'hub'} onClick={() => onChangeView('hub')} premium />
            <SidebarItem label="Public Ledger" icon={<GlobeIcon className="h-5 w-5"/>} isActive={activeView === 'ledger'} onClick={() => onChangeView('ledger')} />
            <SidebarItem label="Comms Hub" icon={<MessageSquareIcon className="h-5 w-5"/>} isActive={activeView === 'chats'} onClick={() => onChangeView('chats')} />
            <SidebarItem label="Sovereign Vault" icon={<WalletIcon className="h-5 w-5"/>} isActive={activeView === 'wallet'} onClick={() => onChangeView('wallet')} />
            <SidebarItem label="Sovereign State" icon={<ShieldCheckIcon className="h-5 w-5"/>} isActive={activeView === 'state'} onClick={() => onChangeView('state')} premium />
            <SidebarItem label="Citizens" icon={<UsersIcon className="h-5 w-5"/>} isActive={activeView === 'community'} onClick={() => onChangeView('community')} />
            <SidebarItem label="Node Status" icon={<UserCircleIcon className="h-5 w-5"/>} isActive={activeView === 'profile'} onClick={() => onChangeView('profile')} />
        </div>

        {activeView === 'home' && (
             <div className="glass-card rounded-[2rem] p-6 border-white/5">
                <h3 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] mb-5">Spectrum Filters</h3>
                <div className="flex flex-wrap gap-2">
                    <FilterItem label="Intelligence" value="foryou" current={currentFilter} onClick={onFilterChange} />
                    <FilterItem label="Following" value="following" current={currentFilter} onClick={onFilterChange} />
                    <FilterItem label="All" value="all" current={currentFilter} onClick={onFilterChange} />
                    <FilterItem label="Opportunities" value="opportunity" current={currentFilter} onClick={onFilterChange} />
                </div>
            </div>
        )}

        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-brand-gold/5 rounded-[2.5rem] p-6 border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand-gold/10 blur-3xl rounded-full"></div>
            <div className="flex items-center space-x-4 mb-5">
                <div className="bg-brand-gold/10 p-3 rounded-2xl border border-brand-gold/20 shadow-glow-gold">
                    <SparkleIcon className="h-5 w-5 text-brand-gold" />
                </div>
                <div>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Node Civic Capital</p>
                    <p className="text-xl font-black text-white font-mono">{user.ccap?.toLocaleString() || '0'}</p>
                </div>
            </div>
             <button onClick={() => onChangeView('hub')} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-[0.2em] text-white rounded-xl transition-all active:scale-95 border border-white/5">
                Asset Terminal
            </button>
        </div>
    </div>
  );
};