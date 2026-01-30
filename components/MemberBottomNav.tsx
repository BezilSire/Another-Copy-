
import React from 'react';
import { HomeIcon } from './icons/HomeIcon';
import { WalletIcon } from './icons/WalletIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { AwardIcon } from './icons/AwardIcon';
import { MoreHorizontalIcon } from './icons/MoreHorizontalIcon';

type MemberView = 'home' | 'wallet' | 'hub' | 'chats' | 'earn' | 'more';

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
        className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 font-sans
        ${isActive ? 'text-brand-gold' : 'text-slate-400 hover:text-white'}
        `}
    >
        <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? (special ? 'bg-brand-gold text-slate-900 shadow-lg scale-110' : 'bg-white/5') : 'bg-transparent'}`}>
          <span className="h-5 w-5 block">{icon}</span>
        </div>
        <span className={`text-[10px] font-bold mt-1 tracking-tight ${isActive ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
        {hasNotification && !isActive && (
            <span className="absolute top-2 right-1/2 translate-x-3 block w-2 h-2 bg-red-500 rounded-full border border-slate-900"></span>
        )}
    </button>
);

export const MemberBottomNav: React.FC<MemberBottomNavProps> = ({ activeView, setActiveView, unreadNotificationCount }) => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-6">
            <div className="max-w-md mx-auto h-16 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-premium flex justify-around items-center px-1">
                <NavItem
                    icon={<HomeIcon className="h-full w-full" />}
                    label="Home"
                    isActive={activeView === 'home'}
                    onClick={() => setActiveView('home')}
                />
                <NavItem
                    icon={<WalletIcon className="h-full w-full" />}
                    label="Wallet"
                    isActive={activeView === 'wallet'}
                    onClick={() => setActiveView('wallet')}
                />
                <NavItem
                    icon={<TrendingUpIcon className="h-full w-full" />}
                    label="Buy"
                    isActive={activeView === 'hub'}
                    onClick={() => setActiveView('hub')}
                    special
                />
                <NavItem
                    icon={<MessageSquareIcon className="h-full w-full" />}
                    label="Chat"
                    isActive={activeView === 'chats'}
                    onClick={() => setActiveView('chats')}
                />
                <NavItem
                    icon={<AwardIcon className="h-full w-full" />}
                    label="Earn"
                    isActive={activeView === 'earn'}
                    onClick={() => setActiveView('earn')}
                />
                <NavItem
                    icon={<MoreHorizontalIcon className="h-full w-full" />}
                    label="Menu"
                    isActive={activeView === 'more'}
                    onClick={() => setActiveView('more')}
                    hasNotification={unreadNotificationCount > 0}
                />
            </div>
        </footer>
    );
};
