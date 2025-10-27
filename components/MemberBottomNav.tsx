import React from 'react';
import { HomeIcon } from './icons/HomeIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { BellIcon } from './icons/BellIcon';
import { UserIcon } from './icons/UserIcon';
import { UsersIcon } from './icons/UsersIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { HeartIcon } from './icons/HeartIcon';

type ActiveView = 'feed' | 'community' | 'connect' | 'notifications' | 'profile' | 'knowledge' | 'pitchAssistant' | 'proposalDetails' | 'earn' | 'investments' | 'redemption' | 'sustenance';

interface MemberBottomNavProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  notificationCount: number;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  hasNotification?: boolean;
}> = ({ icon, label, isActive, onClick, hasNotification }) => (
  <button
    onClick={onClick}
    className={`relative flex-1 flex flex-col items-center justify-center py-2 transition-colors duration-200 h-16 rounded-lg ${isActive ? 'text-green-400 bg-slate-700' : 'text-gray-400 hover:text-white hover:bg-slate-700/50'}`}
  >
    <div className="h-6 w-6 mb-1">{icon}</div>
    <span className="text-xs truncate">{label}</span>
    {hasNotification && (
        <span className="absolute top-2 right-1/2 translate-x-4 block w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-slate-800"></span>
    )}
  </button>
);

export const MemberBottomNav: React.FC<MemberBottomNavProps> = ({ activeView, setActiveView, notificationCount }) => {
  const navItems: { view: ActiveView; label: string; icon: React.ReactNode; notification?: boolean }[] = [
    { view: 'feed', label: 'Feed', icon: <HomeIcon /> },
    { view: 'community', label: 'Community', icon: <UsersIcon /> },
    { view: 'earn', label: 'Earn', icon: <DatabaseIcon /> },
    { view: 'sustenance', label: 'Sustenance', icon: <HeartIcon /> },
    { view: 'investments', label: 'Investments', icon: <TrendingUpIcon /> },
    // { view: 'connect', label: 'Connect', icon: <MessageSquareIcon />, notification: notificationCount > 0 && activeView !== 'connect' && activeView !== 'notifications' },
    // { view: 'notifications', label: 'Alerts', icon: <BellIcon />, notification: notificationCount > 0 },
    // { view: 'profile', label: 'Profile', icon: <UserIcon /> },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 shadow-lg z-40">
      <nav className="max-w-xl mx-auto flex h-20 items-center justify-around px-1 space-x-1">
        {navItems.map(item => (
            <NavItem
                key={item.view}
                icon={item.icon}
                label={item.label}
                isActive={activeView === item.view}
                onClick={() => setActiveView(item.view)}
                hasNotification={item.notification}
            />
        ))}
      </nav>
    </footer>
  );
};