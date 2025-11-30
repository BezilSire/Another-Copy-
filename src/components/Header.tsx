
import React from 'react';
import { User } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { TargetIcon } from './icons/TargetIcon';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOffIcon } from './icons/WifiOffIcon';
import { ThemeToggle } from './ThemeToggle';
import { GlobalSearch } from './GlobalSearch';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onViewProfile: (userId: string) => void;
  onChatClick?: () => void;
  onRadarClick?: () => void;
}

const OfflineIndicator: React.FC = () => (
    <div className="flex items-center space-x-2 bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full text-xs font-medium text-slate-600 dark:text-gray-300">
        <WifiOffIcon className="h-4 w-4 text-slate-500 dark:text-gray-400" />
        <span className="hidden sm:inline">Offline</span>
    </div>
);

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onViewProfile, onChatClick, onRadarClick }) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="bg-white dark:bg-slate-800 shadow-lg sticky top-0 z-30 border-b border-gray-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-2 gap-2">
          
          {/* Logo Section */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <LogoIcon className="h-9 w-9 text-green-500" />
            <div className="hidden lg:block">
              <div className="flex items-center">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Commons</h1>
                <span className="ml-2 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase">Beta</span>
              </div>
            </div>
          </div>
          
          {/* Search Section */}
          {user && (
            <div className="flex-1 max-w-lg mx-2">
               <GlobalSearch onViewProfile={onViewProfile} />
            </div>
          )}

          {/* Actions Section */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            
            {/* FORCE VISIBLE: Radar Button */}
            {user && onRadarClick && (
                <button 
                    onClick={onRadarClick}
                    className="flex flex-col sm:flex-row items-center justify-center p-2 sm:px-3 sm:py-2 bg-slate-700 hover:bg-slate-600 text-green-400 rounded-md shadow-sm border border-slate-600 transition-all active:scale-95"
                    title="Open Connection Radar"
                >
                    <TargetIcon className="h-5 w-5 sm:mr-1.5" />
                    <span className="text-[10px] sm:text-sm font-bold">Radar</span>
                </button>
            )}

            {/* FORCE VISIBLE: Chat Button */}
            {user && onChatClick && (
                <button 
                    onClick={onChatClick}
                    className="flex flex-col sm:flex-row items-center justify-center p-2 sm:px-3 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm border border-green-500 transition-all active:scale-95"
                    title="Open Chats"
                >
                    <MessageSquareIcon className="h-5 w-5 sm:mr-1.5" />
                    <span className="text-[10px] sm:text-sm font-bold">Chats</span>
                </button>
            )}

            {!isOnline && <OfflineIndicator />}
            
            <div className="hidden sm:block">
                <ThemeToggle />
            </div>

            {user ? (
              <div className="flex items-center space-x-2 ml-1">
                <div className="hidden md:flex items-center space-x-2">
                  <UserCircleIcon className="h-8 w-8 text-slate-500 dark:text-gray-400" />
                </div>
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 border border-slate-600 text-xs font-medium rounded-md text-white bg-slate-700 hover:bg-red-900 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
                <div className="h-8"></div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
