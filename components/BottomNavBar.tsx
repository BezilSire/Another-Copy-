import React from 'react';
import { Agent } from '../types';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { UsersIcon } from './icons/UsersIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { LogOutIcon } from './icons/LogOutIcon';
import { BellIcon } from './icons/BellIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';

type AgentView = 'dashboard' | 'members' | 'profile' | 'notifications' | 'knowledge';

interface BottomNavBarProps {
  agent: Agent;
  activeView: AgentView;
  setActiveView: (view: AgentView) => void;
  onLogout: () => void;
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
    className={`relative flex flex-col items-center justify-center flex-1 py-2 text-sm font-medium transition-colors duration-200 rounded-lg h-16 ${
      isActive ? 'text-green-400 bg-slate-700' : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
    }`}
    aria-current={isActive ? 'page' : undefined}
  >
    <span className="h-6 w-6 mb-1">{icon}</span>
    <span className="truncate">{label}</span>
     {count !== undefined && count > 0 && (
        <span className="absolute top-2 right-1/2 translate-x-4 block w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-slate-800"></span>
    )}
  </button>
);

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ agent, activeView, setActiveView, onLogout, unreadCount }) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 shadow-lg z-40">
      <nav className="max-w-4xl mx-auto flex justify-around items-center h-20 px-2 sm:px-4 space-x-1 sm:space-x-2">
        <div className="items-center space-x-3 text-sm flex-shrink-0 pr-2 sm:pr-4 mr-2 sm:mr-4 border-r border-slate-700 hidden sm:flex">
             <UserCircleIcon className="h-10 w-10 text-gray-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-white truncate">{agent.name}</p>
                <p className="text-xs text-gray-400 font-mono">{agent.agent_code}</p>
              </div>
        </div>
        <NavItem
            icon={<LayoutDashboardIcon />}
            label="Dashboard"
            isActive={activeView === 'dashboard'}
            onClick={() => setActiveView('dashboard')}
        />
        <NavItem
            icon={<UsersIcon />}
            label="Members"
            isActive={activeView === 'members'}
            onClick={() => setActiveView('members')}
        />
        <NavItem
            icon={<BellIcon />}
            label="Alerts"
            isActive={activeView === 'notifications'}
            onClick={() => setActiveView('notifications')}
            count={unreadCount}
        />
        <NavItem
            icon={<BookOpenIcon />}
            label="Knowledge"
            isActive={activeView === 'knowledge'}
            onClick={() => setActiveView('knowledge')}
        />
        <NavItem
            icon={<UserCircleIcon />}
            label="Profile"
            isActive={activeView === 'profile'}
            onClick={() => setActiveView('profile')}
        />
        <div className="pl-2 sm:pl-4 ml-2 sm:ml-4 border-l border-slate-700">
            <button
                onClick={onLogout}
                className="flex flex-col items-center justify-center p-2 text-sm h-16 w-16 font-medium text-gray-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                title="Logout"
            >
                <LogOutIcon className="h-6 w-6" />
                 <span className="text-xs mt-1">Logout</span>
            </button>
        </div>
      </nav>
    </footer>
  );
};