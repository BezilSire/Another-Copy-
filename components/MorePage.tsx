import React from 'react';
import { User } from '../types';
import { UserIcon } from './icons/UserIcon';
import { BellIcon } from './icons/BellIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { HeartIcon } from './icons/HeartIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { LogOutIcon } from './icons/LogOutIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { SparkleIcon } from './icons/SparkleIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';

type NavView = 'profile' | 'notifications' | 'sustenance' | 'myinvestments' | 'knowledge' | 'launchpad' | 'earn';

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
}> = ({ icon, label, onClick, badgeCount }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center p-4 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
  >
    <div className="flex-shrink-0 bg-slate-700/50 text-green-400 p-2 rounded-lg">{icon}</div>
    <span className="flex-1 ml-4 text-left font-semibold text-white">{label}</span>
    {badgeCount !== undefined && badgeCount > 0 && (
      <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{badgeCount > 9 ? '9+' : badgeCount}</span>
    )}
    <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-2" />
  </button>
);

export const MorePage: React.FC<MorePageProps> = ({ user, onNavigate, onLogout, notificationCount }) => {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center space-x-4 p-4 bg-slate-800 rounded-lg">
        <UserIcon className="h-12 w-12 text-gray-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
          <p className="text-gray-400 capitalize">{user.role}</p>
        </div>
      </div>

      <div className="space-y-3">
        <NavItem icon={<UserIcon className="h-5 w-5" />} label="My Profile" onClick={() => onNavigate('profile')} />
        <NavItem icon={<BellIcon className="h-5 w-5" />} label="Notifications" onClick={() => onNavigate('notifications')} badgeCount={notificationCount} />
        <NavItem icon={<DatabaseIcon className="h-5 w-5" />} label="Ways to Earn" onClick={() => onNavigate('earn')} />
        <NavItem icon={<TrendingUpIcon className="h-5 w-5" />} label="My Investments" onClick={() => onNavigate('myinvestments')} />
        <NavItem icon={<SparkleIcon className="h-5 w-5" />} label="Project Launchpad" onClick={() => onNavigate('launchpad')} />
        <NavItem icon={<HeartIcon className="h-5 w-5" />} label="Sustenance" onClick={() => onNavigate('sustenance')} />
        <NavItem icon={<BookOpenIcon className="h-5 w-5" />} label="Knowledge Base" onClick={() => onNavigate('knowledge')} />
      </div>

      <div className="pt-4">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center p-4 bg-slate-800 rounded-lg hover:bg-red-900/50 transition-colors text-red-400 font-semibold"
        >
          <LogOutIcon className="h-5 w-5 mr-3" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};