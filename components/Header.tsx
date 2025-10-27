import React from 'react';
import { User } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOffIcon } from './icons/WifiOffIcon';
import { ThemeToggle } from './ThemeToggle';
import { GlobalSearch } from './GlobalSearch';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onViewProfile: (userId: string) => void;
}

const OfflineIndicator: React.FC = () => (
    <div className="flex items-center space-x-2 bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full text-xs font-medium text-slate-600 dark:text-gray-300">
        <WifiOffIcon className="h-4 w-4 text-slate-500 dark:text-gray-400" />
        <span>Offline</span>
    </div>
);

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onViewProfile }) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-30 border-b border-gray-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 gap-4">
          <div className="flex items-center space-x-3 flex-shrink-0">
            <LogoIcon className="h-10 w-10 text-green-500" />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ubuntium Global Commons</h1>
              <p className="text-xs text-green-600 dark:text-green-400 italic">the commons protect those who protects the commons</p>
            </div>
          </div>
          
          {user && (
            <div className="flex-1 flex justify-center px-4">
               <GlobalSearch currentUser={user} onProfileSelect={onViewProfile} />
            </div>
          )}

          <div className="flex items-center space-x-4 flex-shrink-0">
            {!isOnline && <OfflineIndicator />}
            <ThemeToggle />
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-2">
                  <UserCircleIcon className="h-6 w-6 text-slate-500 dark:text-gray-400" />
                  <span className="text-slate-700 dark:text-gray-300 font-medium">{user.name}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500"
                >
                  Logout
                </button>
              </div>
            ) : (
                <div className="h-10"></div> // Placeholder to maintain height when logged out
            )}
          </div>
        </div>
      </div>
    </header>
  );
};