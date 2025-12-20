
import React from 'react';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { UsersIcon } from './icons/UsersIcon';
import { UserIcon } from './icons/UserIcon';
import { MoreVerticalIcon } from './icons/MoreVerticalIcon';

interface ChatHeaderProps {
  title: string;
  isGroup: boolean;
  onBack?: () => void;
  onHeaderClick?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ title, isGroup, onBack, onHeaderClick }) => {
  return (
    <div className="flex items-center px-6 py-4 border-b border-white/5 bg-slate-950/90 backdrop-blur-3xl flex-shrink-0 relative z-30">
      {onBack && (
          <button onClick={onBack} className="md:hidden mr-4 p-2 bg-white/5 rounded-xl text-gray-400 hover:text-white active:scale-90 transition-all">
              <ArrowLeftIcon className="h-5 w-5"/>
          </button>
      )}
      
      <button onClick={onHeaderClick} className="flex items-center space-x-5 flex-1 min-w-0 group">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center shadow-inner group-hover:border-brand-gold/30 transition-all">
             {isGroup ? <UsersIcon className="h-6 w-6 text-gray-500"/> : <UserIcon className="h-6 w-6 text-gray-500"/>}
          </div>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <h3 className="text-lg font-black text-white truncate uppercase tracking-tighter gold-text leading-none">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-matrix animate-pulse"></div>
              <p className="label-caps !text-[7px] !text-gray-500 !tracking-[0.4em]">Node Handshake Valid</p>
          </div>
        </div>
      </button>
      
      <button onClick={onHeaderClick} className="p-3 text-gray-600 hover:text-brand-gold bg-white/5 rounded-xl transition-all ml-2">
          <MoreVerticalIcon className="h-5 w-5"/>
      </button>
    </div>
  );
};
