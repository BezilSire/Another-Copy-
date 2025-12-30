import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { VideoIcon } from './icons/VideoIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOffIcon } from './icons/WifiOffIcon';
import { ActivityIcon } from './icons/ActivityIcon';

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
  const [load, setLoad] = useState(15);

  useEffect(() => {
    // Simulated spectral load fluctuation
    const interval = setInterval(() => {
        setLoad(prev => {
            const fluctuation = Math.floor(Math.random() * 10) - 4;
            return Math.max(5, Math.min(95, prev + fluctuation));
        });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-black/90 backdrop-blur-3xl border-b border-brand-gold/20 sticky top-0 z-50 h-20 flex items-center px-4 sm:px-8">
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center gap-6">
        
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
          <div className="flex-1 flex flex-col items-center justify-center">
             <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10 shadow-inner">
                {onVoteClick && (
                    <button onClick={onVoteClick} className="flex items-center gap-3 px-4 sm:px-6 py-2.5 rounded-xl text-gray-400 hover:text-brand-gold hover:bg-brand-gold/5 transition-all group border-r border-white/5" title="Governance">
                        <ScaleIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block">Vote</span>
                    </button>
                )}
                {onChatClick && (
                    <button onClick={onChatClick} className="flex items-center gap-3 px-4 sm:px-6 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group border-r border-white/5" title="Comms Hub">
                        <MessageSquareIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block">Comms</span>
                    </button>
                )}
                {onMeetClick && (
                    <button onClick={onMeetClick} className="flex items-center gap-3 px-4 sm:px-6 py-2.5 rounded-xl text-gray-400 hover:text-brand-gold hover:bg-brand-gold/5 transition-all group" title="Meeting Hub">
                        <VideoIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block">Meet</span>
                    </button>
                )}
             </div>
             
             {/* SPECTRAL LOAD HUD */}
             <div className="mt-2 hidden sm:flex items-center gap-3">
                <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest">Spectral Load</span>
                <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className={`h-full transition-all duration-1000 ${load > 80 ? 'bg-red-500' : load > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                        style={{ width: `${load}%` }}
                    />
                </div>
                <span className="text-[7px] font-black text-emerald-500 font-mono tracking-tighter">{load}%</span>
             </div>
          </div>
        )}

        <div className="flex items-center space-x-6 flex-shrink-0">
          {!isOnline && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[8px] font-black text-red-500 uppercase tracking-widest animate-pulse data-mono">
                  <WifiOffIcon className="h-3 w-3" />
                  <span>AIR-GAP</span>
              </div>
          )}

          {user && (
            <div className="flex items-center space-x-5">
              <div className="hidden xl:block text-right">
                  <p className="label-caps !text-[7px] mb-0.5">Identity Root</p>
                  <p className="data-mono text-[10px] text-brand-gold opacity-80">{user.publicKey?.substring(0, 12)}...</p>
              </div>
              <button onClick={() => onViewProfile(user.id)} className="focus:outline-none ring-1 ring-white/5 hover:ring-brand-gold/40 rounded-xl overflow-hidden p-0.5 transition-all bg-slate-900 shadow-xl">
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