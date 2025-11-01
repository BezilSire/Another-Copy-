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
    <div className="flex items-center p-3 border-b border-slate-700 bg-slate-800 flex-shrink-0">
      {onBack && <button onClick={onBack} className="md:hidden mr-2 p-2 text-gray-400 hover:text-white"><ArrowLeftIcon className="h-6 w-6"/></button>}
      <button onClick={onHeaderClick} className="flex items-center space-x-3 flex-1 min-w-0">
        <div className="flex-shrink-0">
          {isGroup ? <UsersIcon className="h-8 w-8 text-gray-400"/> : <UserIcon className="h-8 w-8 text-gray-400"/>}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <h3 className="font-bold text-white truncate">{title}</h3>
          {/* We can add online status here in the future */}
        </div>
      </button>
      {onHeaderClick && isGroup && (
        <button onClick={onHeaderClick} className="p-2 text-gray-400 hover:text-white">
            <MoreVerticalIcon className="h-5 w-5"/>
        </button>
      )}
    </div>
  );
};