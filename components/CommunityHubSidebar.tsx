
import React from 'react';
import { MemberUser, FilterType } from '../types';
import { HomeIcon } from './icons/HomeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { WalletIcon } from './icons/WalletIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { BellIcon } from './icons/BellIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { SparkleIcon } from './icons/SparkleIcon';
import { GlobeIcon } from './icons/GlobeIcon';

type MemberView = 'home' | 'ventures' | 'community' | 'more' | 'profile' | 'knowledge' | 'pitch' | 'myinvestments' | 'sustenance' | 'earn' | 'notifications' | 'launchpad' | 'wallet' | 'chats' | 'ledger';

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
}> = ({ label, icon, isActive, onClick, count }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-slate-800 text-green-400 font-bold' : 'text-gray-400 hover:bg-slate-800/50 hover:text-gray-200'}`}
    >
        <div className={`p-2 rounded-lg ${isActive ? 'bg-slate-900' : 'bg-transparent group-hover:bg-slate-700'}`}>
            {icon}
        </div>
        <span className="text-lg">{label}</span>
        {count !== undefined && count > 0 && (
            <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
        )}
    </button>
);

const FilterItem: React.FC<{ label: string; value: FilterType; current: FilterType; onClick: (v: FilterType) => void }> = ({ label, value, current, onClick }) => (
    <button 
        onClick={() => onClick(value)}
        className={`text-sm px-3 py-1.5 rounded-full transition-colors ${current === value ? 'bg-green-600 text-white font-semibold' : 'text-gray-500 hover:text-gray-300'}`}
    >
        {label}
    </button>
);

export const CommunityHubSidebar: React.FC<CommunityHubSidebarProps> = ({ activeView, onChangeView, user, currentFilter, onFilterChange }) => {
  return (
    <div className="space-y-6">
        <div className="bg-slate-900 rounded-xl p-2 space-y-1">
            <SidebarItem label="Home" icon={<HomeIcon className="h-6 w-6"/>} isActive={activeView === 'home'} onClick={() => onChangeView('home')} />
            <SidebarItem label="Community" icon={<UsersIcon className="h-6 w-6"/>} isActive={activeView === 'community'} onClick={() => onChangeView('community')} />
            <SidebarItem label="Ventures" icon={<BriefcaseIcon className="h-6 w-6"/>} isActive={activeView === 'ventures'} onClick={() => onChangeView('ventures')} />
            <SidebarItem label="Wallet" icon={<WalletIcon className="h-6 w-6"/>} isActive={activeView === 'wallet'} onClick={() => onChangeView('wallet')} />
            <SidebarItem label="Ledger" icon={<GlobeIcon className="h-6 w-6"/>} isActive={activeView === 'ledger'} onClick={() => onChangeView('ledger')} />
            <SidebarItem label="Chats" icon={<MessageSquareIcon className="h-6 w-6"/>} isActive={activeView === 'chats'} onClick={() => onChangeView('chats')} />
            <SidebarItem label="Notifications" icon={<BellIcon className="h-6 w-6"/>} isActive={activeView === 'notifications'} onClick={() => onChangeView('notifications')} />
            <SidebarItem label="Profile" icon={<UserCircleIcon className="h-6 w-6"/>} isActive={activeView === 'profile'} onClick={() => onChangeView('profile')} />
        </div>

        {activeView === 'home' && (
             <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Feed Filters</h3>
                <div className="flex flex-wrap gap-2">
                    <FilterItem label="For You" value="foryou" current={currentFilter} onClick={onFilterChange} />
                    <FilterItem label="Following" value="following" current={currentFilter} onClick={onFilterChange} />
                    <FilterItem label="All" value="all" current={currentFilter} onClick={onFilterChange} />
                    <FilterItem label="Opportunities" value="opportunity" current={currentFilter} onClick={onFilterChange} />
                    <FilterItem label="Proposals" value="proposal" current={currentFilter} onClick={onFilterChange} />
                </div>
            </div>
        )}

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center space-x-3 mb-3">
                <div className="bg-green-500/20 p-2 rounded-full">
                    <SparkleIcon className="h-5 w-5 text-green-400" />
                </div>
                <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Your Impact</p>
                    <p className="text-lg font-bold text-white">{user.ccap?.toLocaleString()} CCAP</p>
                </div>
            </div>
             <button onClick={() => onChangeView('earn')} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-sm text-white rounded-lg transition-colors">
                Earn More
            </button>
        </div>
    </div>
  );
};
