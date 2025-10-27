import React from 'react';
import { Agent } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { LayoutDashboardIcon } from './icons/LayoutDashboardIcon';
import { UsersIcon } from './icons/UsersIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { LogOutIcon } from './icons/LogOutIcon';
import { ChevronDoubleLeftIcon } from './icons/ChevronDoubleLeftIcon';
import { ChevronDoubleRightIcon } from './icons/ChevronDoubleRightIcon';
import { BellIcon } from './icons/BellIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';

type AgentView = 'dashboard' | 'members' | 'profile' | 'notifications' | 'knowledge';

interface SidebarProps {
  agent: Agent;
  activeView: AgentView;
  setActiveView: (view: AgentView) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggle: () => void;
  unreadCount: number;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isCollapsed: boolean;
  count?: number;
}> = ({ icon, label, isActive, onClick, isCollapsed, count }) => (
  <li>
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={isCollapsed ? label : undefined}
      className={`relative flex items-center p-3 rounded-lg transition-colors duration-200 ${
        isActive
          ? 'bg-green-600 text-white shadow-lg'
          : 'text-gray-300 hover:bg-slate-700 hover:text-white'
      } ${isCollapsed ? 'justify-center' : ''}`}
    >
      <span className="h-6 w-6 flex-shrink-0">{icon}</span>
      {!isCollapsed && <span className="ml-3 font-medium whitespace-nowrap">{label}</span>}
      {count !== undefined && count > 0 && (
         <span className={`absolute top-1.5 flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full ${isCollapsed ? 'right-1.5' : 'right-3'}`}>
            {count}
        </span>
      )}
    </a>
  </li>
);

export const Sidebar: React.FC<SidebarProps> = ({ agent, activeView, setActiveView, onLogout, isCollapsed, onToggle, unreadCount }) => {
  return (
    <aside className={`flex-shrink-0 bg-slate-800 p-4 flex flex-col h-screen fixed top-0 left-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`flex items-center space-x-2 pb-6 border-b border-slate-700 ${isCollapsed ? 'justify-center' : ''}`}>
        <LogoIcon className="h-8 w-8 text-green-500 flex-shrink-0" />
        {!isCollapsed && <span className="text-xl font-bold text-white whitespace-nowrap">Agent Portal</span>}
      </div>
      <nav className="mt-6 flex-grow">
        <ul className="space-y-2">
          <NavItem
            icon={<LayoutDashboardIcon />}
            label="Dashboard"
            isActive={activeView === 'dashboard'}
            onClick={() => setActiveView('dashboard')}
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<UsersIcon />}
            label="Members"
            isActive={activeView === 'members'}
            onClick={() => setActiveView('members')}
            isCollapsed={isCollapsed}
          />
           <NavItem
            icon={<BellIcon />}
            label="Notifications"
            isActive={activeView === 'notifications'}
            onClick={() => setActiveView('notifications')}
            isCollapsed={isCollapsed}
            count={unreadCount}
          />
          <NavItem
            icon={<UserCircleIcon />}
            label="Profile"
            isActive={activeView === 'profile'}
            onClick={() => setActiveView('profile')}
            isCollapsed={isCollapsed}
          />
           <NavItem
            icon={<BookOpenIcon />}
            label="Knowledge Base"
            isActive={activeView === 'knowledge'}
            onClick={() => setActiveView('knowledge')}
            isCollapsed={isCollapsed}
          />
        </ul>
      </nav>
      
      <div className="mt-auto">
        <button
          onClick={onToggle}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-full flex justify-center items-center py-2 px-3 my-2 rounded-lg text-gray-400 hover:bg-slate-700 hover:text-white transition-colors"
        >
          {isCollapsed ? <ChevronDoubleRightIcon className="h-6 w-6" /> : <ChevronDoubleLeftIcon className="h-6 w-6" />}
        </button>

        <div className="pt-4 border-t border-slate-700">
            <div className={`flex items-center space-x-3 p-2 ${isCollapsed ? 'justify-center' : ''}`}>
              <UserCircleIcon className="h-10 w-10 text-gray-400 flex-shrink-0" />
              {!isCollapsed && (
                <div>
                  <p className="font-semibold text-white text-sm whitespace-nowrap">{agent.name}</p>
                  <p className="text-xs text-gray-400 font-mono whitespace-nowrap">{agent.agent_code}</p>
                </div>
              )}
            </div>
        </div>
        
        <button
            onClick={onLogout}
            title={isCollapsed ? "Logout" : undefined}
            className={`w-full flex items-center p-3 mt-2 rounded-lg transition-colors duration-200 text-gray-300 hover:bg-red-900 hover:bg-opacity-50 hover:text-white ${isCollapsed ? 'justify-center' : ''}`}
        >
            <LogOutIcon className="h-6 w-6 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3 font-medium whitespace-nowrap">Logout</span>}
        </button>
      </div>
    </aside>
  );
};