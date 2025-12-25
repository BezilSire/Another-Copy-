import React from 'react';
import { HomeIcon } from './icons/HomeIcon';
import { MoreHorizontalIcon } from './icons/MoreHorizontalIcon';
import { WalletIcon } from './icons/WalletIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { GlobeIcon } from './icons/GlobeIcon';

type MemberView = 'home' | 'state' | 'ledger' | 'chats' | 'wallet' | 'hub' | 'more';

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
        className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-500 
        ${isActive ? 'text-brand-gold' : 'text-gray-500 hover:text-white'}
        `}
    >
        <div className={`p-1.5 sm:p-2 rounded-xl transition-all duration-500 ${isActive ? (special ? 'bg-brand-gold text-black shadow-glow-gold scale-110' : 'bg-brand-gold/10') : 'bg-transparent'}`}>
          <span className="h-5 w-5 sm:h-6 sm:w-6 block">{icon}</span>
        </div>
        <span className={`truncate text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] mt-1 ${isActive ? 'opacity-100 text-brand-gold' : 'opacity-80 text-gray-600'}`}>{label}</span>
        {isActive && !special && (
            <div className="absolute bottom-1 w-1 h-1 bg-brand-gold rounded-full shadow-[0_0_8px_#D4AF37]"></div>
        )}
        {hasNotification && !isActive && (
            <span className="absolute top-2 right-1/2 translate-x-3 block w-2 h-2 bg-red-600 rounded-full border border-black animate-pulse"></span>
        )}
    </button>
);

export const MemberBottomNav: React.FC<MemberBottomNavProps> = ({ activeView, setActiveView, unreadNotificationCount }) => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 z-40 px-2 pb-4 sm:pb-6">
            <div className="max-w-xl mx-auto h-16 sm:h-20 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,1)] flex justify-around items-center px-1 relative overflow-hidden">
                <NavItem
                    icon={<HomeIcon className="h-full w-full" />}
                    label="Oracle"
                    isActive={activeView === 'home'}
                    onClick={() => setActiveView('home')}
                />
                <NavItem
                    icon={<GlobeIcon className="h-full w-full" />}
                    label="Ledger"
                    isActive={activeView === 'ledger'}
                    onClick={() => setActiveView('ledger')}
                />
                <NavItem
                    icon={<TrendingUpIcon className="h-full w-full" />}
                    label="Pulse"
                    isActive={activeView === 'hub'}
                    onClick={() => setActiveView('hub')}
                    special
                />
                <NavItem
                    icon={<MessageSquareIcon className="h-full w-full" />}
                    label="Comms"
                    isActive={activeView === 'chats'}
                    onClick={() => setActiveView('chats')}
                />
                <NavItem
                    icon={<WalletIcon className="h-full w-full" />}
                    label="Vault"
                    isActive={activeView === 'wallet'}
                    onClick={() => setActiveView('wallet')}
                />
                <NavItem
                    icon={<MoreHorizontalIcon className="h-full w-full" />}
                    label="Sys"
                    isActive={activeView === 'more'}
                    onClick={() => setActiveView('more')}
                    hasNotification={unreadNotificationCount > 0}
                />
            </div>
        </footer>
    );
};
