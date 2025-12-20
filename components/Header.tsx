
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
import { QrCodeIcon } from './icons/QrCodeIcon';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onViewProfile: (userId: string) => void;
  onChatClick?: () => void;
  onRadarClick?: () => void;
  onScanClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onViewProfile, onChatClick, onRadarClick, onScanClick }) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="bg-slate-950/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="p-1 bg-white/5 rounded-xl border border-white/10 shadow-glow-gold">
                <LogoIcon className="h-8 w-8 text-brand-gold" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-black text-white tracking-tighter uppercase">Ubuntium</h1>
            </div>
          </div>
          
          {user && (
            <div className="flex-1 max-w-xl mx-2 hidden md:block">
               <GlobalSearch onViewProfile={onViewProfile} />
            </div>
          )}

          <div className="flex items-center space-x-3 flex-shrink-0">
            {user && (
                <div className="flex items-center bg-slate-900/50 p-1 rounded-2xl border border-white/5">
                    {onScanClick && (
                        <button onClick={onScanClick} className="p-2 text-gray-400 hover:text-green-400 hover:bg-white/5 rounded-xl transition-all active:scale-90" title="Scan">
                            <QrCodeIcon className="h-5 w-5" />
                        </button>
                    )}
                    {onRadarClick && (
                        <button onClick={onRadarClick} className="p-2 text-gray-400 hover:text-brand-gold-light hover:bg-white/5 rounded-xl transition-all active:scale-90" title="Radar">
                            <TargetIcon className="h-5 w-5" />
                        </button>
                    )}
                    {onChatClick && (
                        <button onClick={onChatClick} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-white/5 rounded-xl transition-all active:scale-90" title="Chats">
                            <MessageSquareIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            )}

            {!isOnline && (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] font-bold text-red-400 uppercase tracking-widest animate-pulse">
                    <WifiOffIcon className="h-3 w-3" />
                    <span>Offline</span>
                </div>
            )}

            {user && (
              <div className="flex items-center space-x-3 ml-2 pl-3 border-l border-white/10">
                <button onClick={() => onViewProfile(user.id)} className="focus:outline-none ring-2 ring-transparent hover:ring-brand-gold/50 rounded-full transition-all">
                    <UserCircleIcon className="h-8 w-8 text-gray-500 hover:text-white" />
                </button>
                <button onClick={onLogout} className="hidden lg:block text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">
                  Exit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
