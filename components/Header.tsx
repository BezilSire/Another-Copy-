
import React from 'react';
import { User } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { TargetIcon } from './icons/TargetIcon';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOffIcon } from './icons/WifiOffIcon';
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
    <header className="bg-black/90 backdrop-blur-3xl border-b border-brand-gold/20 sticky top-0 z-50 h-20 flex items-center px-4 sm:px-8">
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center gap-6">
        
        {/* Logo Node */}
        <div className="flex items-center space-x-4 flex-shrink-0">
          <div className="p-2 bg-brand-gold/5 rounded-lg border border-brand-gold/20">
              <LogoIcon className="h-8 w-8 text-brand-gold" />
          </div>
          <div className="hidden lg:block">
            <h1 className="text-xl font-black text-white tracking-tighter uppercase gold-text leading-none">Oracle-OS</h1>
            <p className="label-caps mt-1 !tracking-[0.5em] !text-[8px] opacity-50">Ubuntium Network Node</p>
          </div>
        </div>
        
        {user && (
          <div className="flex-1 max-w-lg hidden md:block">
             <div className="relative">
                <GlobalSearch onViewProfile={onViewProfile} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 pointer-events-none opacity-30">
                    <span className="w-1 h-1 rounded-full bg-brand-gold"></span>
                    <span className="w-1 h-1 rounded-full bg-brand-gold"></span>
                </div>
             </div>
          </div>
        )}

        <div className="flex items-center space-x-6 flex-shrink-0">
          {user && (
              <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5 shadow-inner">
                  {onScanClick && (
                      <button onClick={onScanClick} className="p-3 text-gray-500 hover:text-green-400 hover:bg-white/5 rounded-lg transition-all" title="Anchor Scan">
                          <QrCodeIcon className="h-5 w-5" />
                      </button>
                  )}
                  {onRadarClick && (
                      <button onClick={onRadarClick} className="p-3 text-gray-500 hover:text-brand-gold-light hover:bg-white/5 rounded-lg transition-all" title="Network Pulse">
                          <TargetIcon className="h-5 w-5" />
                      </button>
                  )}
                  {onChatClick && (
                      <button onClick={onChatClick} className="p-3 text-gray-500 hover:text-blue-400 hover:bg-white/5 rounded-lg transition-all" title="Comms Hub">
                          <MessageSquareIcon className="h-5 w-5" />
                      </button>
                  )}
              </div>
          )}

          {!isOnline && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[8px] font-black text-red-500 uppercase tracking-widest animate-pulse data-mono">
                  <WifiOffIcon className="h-3 w-3" />
                  <span>AIR-GAP ACTIVE</span>
              </div>
          )}

          {user && (
            <div className="flex items-center space-x-5 pl-5 border-l border-white/10">
              <div className="hidden xl:block text-right">
                  <p className="label-caps !text-[7px] mb-0.5">Verified Identity</p>
                  <p className="data-mono text-[10px] text-brand-gold opacity-80">{user.publicKey?.substring(0, 12)}...</p>
              </div>
              <button onClick={() => onViewProfile(user.id)} className="focus:outline-none ring-1 ring-white/5 hover:ring-brand-gold/40 rounded-xl overflow-hidden p-0.5 transition-all bg-slate-900">
                  <UserCircleIcon className="h-10 w-10 text-slate-700 hover:text-white transition-colors" />
              </button>
              <button 
                onClick={onLogout} 
                className="bg-red-500/5 hover:bg-red-500 hover:text-white border border-red-900/30 px-4 py-2 rounded-lg text-[9px] font-black text-red-600 uppercase tracking-widest transition-all active:scale-[0.9] data-mono"
              >
                Term.
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
