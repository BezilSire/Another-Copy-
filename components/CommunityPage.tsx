import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Broadcast, PublicUserProfile } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { UserCard } from './UserCard';
import { LoaderIcon } from './icons/LoaderIcon';
import { MegaphoneIcon } from './icons/MegaphoneIcon';
import { DocumentData, DocumentSnapshot } from 'firebase/firestore';
import { UsersIcon } from './icons/UsersIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { VenturesPage } from './VenturesPage';
import { ProposalsPage } from './ProposalsPage';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ProjectLaunchpad } from './ProjectLaunchpad';

type MemberActiveView = 'feed' | 'community' | 'connect' | 'notifications' | 'profile' | 'knowledge' | 'pitchAssistant' | 'proposalDetails';
export type CommunityHubView = 'members' | 'ventures' | 'governance' | 'broadcasts' | 'projects';


interface CommunityPageProps {
  currentUser: User;
  onViewProfile: (userId: string | null) => void;
  broadcasts: Broadcast[];
  onNavigate: (view: MemberActiveView, context?: { proposalId: string }) => void;
  initialTab?: CommunityHubView;
}

const MEMBERS_PER_PAGE = 24;

const BroadcastsSection: React.FC<{ broadcasts: Broadcast[] }> = ({ broadcasts }) => (
    <div className="space-y-4">
      {broadcasts.length > 0 ? (
        broadcasts.slice(0, 10).map(b => (
            <div key={b.id} className="bg-slate-800 p-4 rounded-lg">
                <div
                    className="text-sm text-gray-300 wysiwyg-content"
                    dangerouslySetInnerHTML={{ __html: b.message }}
                />
                <p className="text-xs text-gray-500 mt-2">{new Date(b.date).toLocaleDateString()}</p>
            </div>
          ))
      ) : (
        <div className="text-center py-16 bg-slate-800 rounded-lg">
            <p className="text-gray-400">No recent broadcasts from admins.</p>
        </div>
      )}
    </div>
);

const MembersSection: React.FC<{ currentUser: User, onViewProfile: (userId: string | null) => void }> = ({ currentUser, onViewProfile }) => {
    const [members, setMembers] = useState<PublicUserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastVisible, setLastVisible] = useState<DocumentSnapshot<DocumentData> | null>(null);
    const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});
    const { addToast } = useToast();
    const observer = useRef<IntersectionObserver>();

    const loadMore = useCallback(() => {
        if (isLoadingMore || !hasMore || !lastVisible) return;
        setIsLoadingMore(true);
        api.fetchCommunityMembersPaginated(MEMBERS_PER_PAGE, lastVisible)
            .then(({ users, lastVisible: newLastVisible }) => {
                const filteredUsers = users.filter(u => u.id !== currentUser.id);
                setMembers(prev => [...prev, ...filteredUsers]);
                setLastVisible(newLastVisible);
                if (users.length < MEMBERS_PER_PAGE || !newLastVisible) {
                    setHasMore(false);
                }
            })
            .catch(() => addToast("Could not load more members.", "error"))
            .finally(() => setIsLoadingMore(false));
    }, [isLoadingMore, hasMore, lastVisible, currentUser.id, addToast]);

    const lastMemberElementRef = useCallback(node => {
        if (isLoading || isLoadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMore();
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, isLoadingMore, hasMore, loadMore]);

    useEffect(() => {
        setIsLoading(true);
        api.fetchCommunityMembersPaginated(MEMBERS_PER_PAGE)
            .then(({ users, lastVisible: newLastVisible }) => {
                const filteredUsers = users.filter(u => u.id !== currentUser.id);
                setMembers(filteredUsers);
                setLastVisible(newLastVisible);
                if (users.length < MEMBERS_PER_PAGE || !newLastVisible) {
                    setHasMore(false);
                }
            })
            .catch(() => addToast("Could not load community members.", "error"))
            .finally(() => setIsLoading(false));
    }, [currentUser.id, addToast]);

    useEffect(() => {
        const memberIds = members.map(u => u.id).filter((id): id is string => !!id);
        if (memberIds.length > 0) {
            const unsubscribe = api.listenForUsersPresence(memberIds, (statuses) => {
                setOnlineStatuses(prev => ({ ...prev, ...statuses }));
            });
            return () => unsubscribe();
        }
    }, [members]);

    return (
        <section>
            {isLoading ? (
                <div className="flex justify-center items-center h-24"><LoaderIcon className="h-8 w-8 animate-spin text-green-500" /></div>
            ) : members.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {members.map((user, index) => (
                            <div ref={members.length === index + 1 ? lastMemberElementRef : null} key={user.id}>
                                <UserCard user={user} currentUser={currentUser} onClick={() => onViewProfile(user.id)} isOnline={onlineStatuses[user.id]} />
                            </div>
                        ))}
                    </div>
                    {isLoadingMore && (
                        <div className="flex justify-center items-center py-8">
                            <LoaderIcon className="h-8 w-8 animate-spin text-green-500" />
                        </div>
                    )}
                </>
            ) : (
                <p className="text-gray-500">No other members found in the community.</p>
            )}
        </section>
    );
};


const TabButton: React.FC<{label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void}> = ({ label, icon, isActive, onClick }) => (
    <button onClick={onClick} className={`flex-shrink-0 flex items-center space-x-2 px-4 py-3 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${isActive ? 'border-green-500 text-white' : 'border-transparent text-gray-400 hover:text-white hover:border-slate-600'}`}>
        {icon}
        <span>{label}</span>
    </button>
);

export const CommunityPage: React.FC<CommunityPageProps> = ({ currentUser, onViewProfile, broadcasts, onNavigate, initialTab }) => {
    const [activeTab, setActiveTab] = useState<CommunityHubView>('members');

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const renderContent = () => {
        switch(activeTab) {
            case 'members':
                return <MembersSection currentUser={currentUser} onViewProfile={onViewProfile} />;
            case 'ventures':
                return <VenturesPage currentUser={currentUser} onViewProfile={onViewProfile as (userId: string) => void} onNavigateToPitchAssistant={() => onNavigate('pitchAssistant')} />;
            case 'governance':
                return <ProposalsPage currentUser={currentUser} onNavigateToDetails={(id) => onNavigate('proposalDetails', { proposalId: id })} />;
            case 'broadcasts':
                return <BroadcastsSection broadcasts={broadcasts} />;
            case 'projects':
                return <ProjectLaunchpad />;
            default:
                return null;
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-white">Community Hub</h1>
                <p className="text-lg text-gray-400">Discover, collaborate, and shape the commons.</p>
            </div>
            
            <div className="border-b border-slate-700">
                <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto">
                    <TabButton label="Members" icon={<UsersIcon className="h-5 w-5"/>} isActive={activeTab === 'members'} onClick={() => setActiveTab('members')} />
                    <TabButton label="Ventures" icon={<BriefcaseIcon className="h-5 w-5"/>} isActive={activeTab === 'ventures'} onClick={() => setActiveTab('ventures')} />
                    <TabButton label="Projects" icon={<TrendingUpIcon className="h-5 w-5"/>} isActive={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
                    <TabButton label="Governance" icon={<ScaleIcon className="h-5 w-5"/>} isActive={activeTab === 'governance'} onClick={() => setActiveTab('governance')} />
                    <TabButton label="Broadcasts" icon={<MegaphoneIcon className="h-5 w-5"/>} isActive={activeTab === 'broadcasts'} onClick={() => setActiveTab('broadcasts')} />
                </nav>
            </div>
            
            <div className="animate-fade-in">
                 {renderContent()}
            </div>
        </div>
    );
};
