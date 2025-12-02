
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
  | 'chats';


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
}> = ({ icon, label, isActive, onClick, hasNotification }) => (
    <button
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center flex-1 py-2 text-sm font-medium transition-colors duration-200 rounded-lg h-16 ${
        isActive ? 'text-green-400' : 'text-gray-400 hover:text-white'
        }`}
        aria-current={isActive ? 'page' : undefined}
    >
        <span className="h-6 w-6 mb-1">{icon}</span>
        <span className="truncate">{label}</span>
        {hasNotification && (
            <span className="absolute top-2 right-1/2 translate-x-4 block w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-slate-800"></span>
        )}
    </button>
);

export const MemberBottomNav: React.FC<MemberBottomNavProps> = ({ activeView, setActiveView, unreadNotificationCount }) => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 shadow-lg z-40">
            <nav className="max-w-4xl mx-auto flex justify-around items-center h-20 px-2 sm:px-4 space-x-1 sm:space-x-2">
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
                    icon={<UsersIcon />}
                    label="Community"
                    isActive={activeView === 'community'}
                    onClick={() => setActiveView('community')}
                    hasNotification={unreadNotificationCount > 0}
                />
                <NavItem
                    icon={<MoreHorizontalIcon />}
                    label="More"
                    isActive={activeView === 'more'}
                    onClick={() => setActiveView('more')}
                />
            </nav>
        </footer>
    );
};
