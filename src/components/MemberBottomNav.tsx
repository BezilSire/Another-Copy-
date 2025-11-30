
import React from 'react';
import { HomeIcon } from './icons/HomeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { MoreHorizontalIcon } from './icons/MoreHorizontalIcon';
import { WalletIcon } from './icons/WalletIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';

type MemberView = 
  | 'home' 
  | 'ventures'
  | 'community'
  | 'more'
  | 'wallet'
  | 'chats'; // Chats included


interface MemberBottomNavProps {
    activeView: MemberView;
    setActiveView: (view: MemberView) => void;
    unreadNotificationCount: number;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    hasNotification?: boolean;
    special?: boolean;
}> = ({ icon, label, isActive, onClick, hasNotification, special }) => (
    <button
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center flex-1 py-1 h-full transition-colors duration-200 
        ${isActive ? 'text-green-400' : 'text-gray-400 hover:text-white'}
        ${special ? 'bg-slate-700/50 rounded-lg mx-1' : ''}
        `}
    >
        <span className={`${special ? 'h-6 w-6' : 'h-6 w-6'} mb-1`}>{icon}</span>
        <span className="truncate text-[10px] sm:text-xs font-medium">{label}</span>
        {hasNotification && (
            <span className="absolute top-2 right-1/2 translate-x-3 block w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-slate-800 animate-pulse"></span>
        )}
    </button>
);

export const MemberBottomNav: React.FC<MemberBottomNavProps> = ({ activeView, setActiveView, unreadNotificationCount }) => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] z-40 h-16 pb-safe">
            <nav className="max-w-4xl mx-auto flex justify-between items-center h-full px-2">
                <NavItem
                    icon={<HomeIcon />}
                    label="Feed"
                    isActive={activeView === 'home'}
                    onClick={() => setActiveView('home')}
                />
                <NavItem
                    icon={<MessageSquareIcon />}
                    label="Chats"
                    isActive={activeView === 'chats'}
                    onClick={() => setActiveView('chats')}
                    special // Highlight visually
                />
                <NavItem
                    icon={<WalletIcon />}
                    label="Wallet"
                    isActive={activeView === 'wallet'}
                    onClick={() => setActiveView('wallet')}
                />
                <NavItem
                    icon={<BriefcaseIcon />}
                    label="Ventures"
                    isActive={activeView === 'ventures'}
                    onClick={() => setActiveView('ventures')}
                />
                <NavItem
                    icon={<MoreHorizontalIcon />}
                    label="More"
                    isActive={activeView === 'more'}
                    onClick={() => setActiveView('more')}
                    hasNotification={unreadNotificationCount > 0}
                />
            </nav>
        </footer>
    );
};
