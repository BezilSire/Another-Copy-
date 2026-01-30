
import React from 'react';
import { User } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { VideoIcon } from './icons/VideoIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOffIcon } from './icons/WifiOffIcon';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onViewProfile: (userId: string) => void;
  onChatClick?: () => void;
  onMeetClick?: () => void;
  onVoteClick?: () => void;
  onRadarClick?: () => void;
  onScanClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onViewProfile, onChatClick, onMeetClick, onVoteClick }) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="bg-black/90 backdrop-blur-3xl border-b border-brand-gold/20 sticky top-0 z-50 h-20 flex items-center px-4 sm:px-8">
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center gap-6">
        
        <div className="flex items-center space-x-4 flex-shrink-0">
          <div className="p-2 bg-brand-gold/5 rounded-lg border border-brand-gold/20">
              <LogoIcon className="h-8 w-8 text-brand-gold" />
          </div>
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">Ubuntium</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Community Network</p>
          </div>
        </div>
        
        {user && (
          <div className="flex-1 flex justify-center">
             <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10 shadow-inner">
                {onVoteClick && (
                    <button 
                        onClick={onVoteClick} 
                        className="flex items-center gap-3 px-4 sm:px-6 py-2.5 rounded-xl text-slate-400 hover:text-brand-gold hover:bg-brand-gold/5 transition-all group border-r border-white/5"
                        title="Governance"
                    >
                        <ScaleIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold uppercase hidden sm:block">Vote</span>
                    </button>
                )}
                {onChatClick && (
                    <button 
                        onClick={onChatClick} 
                        className="flex items-center gap-3 px-4 sm:px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group border-r border-white/5"
                        title="Comms Hub"
                    >
                        <MessageSquareIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold uppercase hidden sm:block">Chat</span>
                    </button>
                )}
                {onMeetClick && (
                    <button 
                        onClick={onMeetClick} 
                        className="flex items-center gap-3 px-4 sm:px-6 py-2.5 rounded-xl text-slate-400 hover:text-brand-gold hover:bg-brand-gold/5 transition-all group"
                        title="Meeting Hub"
                    >
                        <VideoIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold uppercase hidden sm:block">Meet</span>
                    </button>
                )}
             </div>
          </div>
        )}

        <div className="flex items-center space-x-6 flex-shrink-0">
          {!isOnline && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse">
                  <WifiOffIcon className="h-3 w-3" />
                  <span>OFFLINE</span>
              </div>
          )}

          {user && (
            <div className="flex items-center space-x-4">
              <div className="hidden xl:block text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Account ID</p>
                  <p className="text-[11px] font-bold text-brand-gold opacity-80">{user.publicKey?.substring(0, 12)}...</p>
              </div>
              <button onClick={() => onViewProfile(user.id)} className="focus:outline-none ring-1 ring-white/5 hover:ring-brand-gold/40 rounded-xl overflow-hidden p-0.5 transition-all bg-slate-900 shadow-xl">
                  <UserCircleIcon className="h-9 w-9 text-slate-700 hover:text-white transition-colors" />
              </button>
              <button 
                onClick={onLogout} 
                className="bg-red-500/5 hover:bg-red-500 hover:text-white border border-red-900/30 px-4 py-2 rounded-lg text-xs font-bold text-red-600 uppercase tracking-wide transition-all active:scale-[0.9]"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
