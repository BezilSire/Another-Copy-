import React, { useState, useEffect, useMemo } from 'react';
import { User, PublicUserProfile, Conversation } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { LoaderIcon } from './icons/LoaderIcon';
import { SearchIcon } from './icons/SearchIcon';
import { useDebounce } from '../hooks/useDebounce';
import { UserCard } from './UserCard';
import { ConversationList } from './ConversationList';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { UsersPlusIcon } from './icons/UsersPlusIcon';

// This is a temporary, partial list. A more complete one could be in a constants file.
const SKILL_CATEGORIES = [
    'Software Development', 'Web Development', 'Mobile Development', 'AI & Machine Learning', 'Data Science', 'Cybersecurity', 'DevOps', 'Blockchain',
    'UI/UX Design', 'Graphic Design', 'Video Production', 'Content Creation', 'Writing & Editing', 'Photography',
    'Project Management', 'Product Management', 'Business Strategy', 'Finance & Accounting', 'Sales & Marketing', 'Human Resources', 'Operations Management', 'Legal',
    'Agriculture & Farming', 'Construction', 'Electrical Work', 'Plumbing', 'Welding', 'Automotive Repair',
    'Education & Training', 'Healthcare', 'Customer Service', 'Consulting', 'Event Planning', 'Hospitality'
];

interface CommunityPageProps {
  currentUser: User;
  onViewProfile: (userId: string | null) => void;
  onOpenChat: (conversation: Conversation) => void;
  unreadCount: number;
  onNewMessageClick: () => void;
  onNewGroupClick: () => void;
}

const TabButton: React.FC<{label: string, isActive: boolean, onClick: () => void, notificationCount?: number}> = ({ label, isActive, onClick, notificationCount }) => (
    <button onClick={onClick} className={`relative w-full py-3 text-sm font-semibold transition-colors ${isActive ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
        {label}
        {notificationCount !== undefined && notificationCount > 0 && (
            <span className="absolute top-2 ml-2 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
    </button>
);

export const CommunityPage: React.FC<CommunityPageProps> = ({ currentUser, onViewProfile, onOpenChat, unreadCount, onNewMessageClick, onNewGroupClick }) => {
    const [activeTab, setActiveTab] = useState<'collaborate' | 'chats'>('collaborate');
    // State for Collaborate Tab
    const [members, setMembers] = useState<PublicUserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [skillFilter, setSkillFilter] = useState<string>('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    // State for Chats Tab
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(true);

    const { addToast } = useToast();

    useEffect(() => {
        if (activeTab === 'collaborate') {
            setIsLoading(true);
            api.getCollaborators(500) // Fetch up to 500 members for client-side filtering
                .then(({ users }) => {
                    setMembers(users.filter(u => u.id !== currentUser.id));
                })
                .catch(() => addToast("Could not load community members.", "error"))
                .finally(() => setIsLoading(false));
        }
    }, [activeTab, currentUser.id, addToast]);
    
    useEffect(() => {
        if (activeTab === 'chats') {
            setIsLoadingChats(true);
            const unsubscribe = api.listenForConversations(
                currentUser,
                (convos) => {
                    setConversations(convos);
                    setIsLoadingChats(false);
                },
                (error) => {
                    console.error('Failed to listen for conversations:', error);
                    addToast('Could not load conversations.', 'error');
                    setIsLoadingChats(false);
                },
            );
            return () => unsubscribe();
        }
    }, [activeTab, currentUser, addToast]);

    const filteredMembers = useMemo(() => {
        return members.filter(member => {
            const matchesSearch = debouncedSearch ? member.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || member.businessIdea?.toLowerCase().includes(debouncedSearch.toLowerCase()) : true;
            
            // Robustly handle skills which might be a string or an array for backward compatibility
            const skills = member.skills;
            const skillsArray = Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(Boolean) : []);

            const matchesSkill = skillFilter ? skillsArray.some(s => s.toLowerCase() === skillFilter.toLowerCase()) : true;
            return matchesSearch && matchesSkill;
        });
    }, [members, debouncedSearch, skillFilter]);

    const renderCollaborateTab = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or idea..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>
                <select onChange={e => setSkillFilter(e.target.value)} value={skillFilter} className="w-full bg-slate-800 border border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Filter by skill...</option>
                    {SKILL_CATEGORIES.map(skill => <option key={skill} value={skill}>{skill}</option>)}
                </select>
            </div>
            {isLoading ? (
                <div className="flex justify-center items-center h-48"><LoaderIcon className="h-8 w-8 animate-spin text-green-500" /></div>
            ) : filteredMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredMembers.map((user) => (
                        <UserCard key={user.id} user={user} currentUser={currentUser} onClick={() => onViewProfile(user.id)} />
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500 py-16 bg-slate-800 rounded-lg">
                    <p className="font-semibold text-lg text-white">No members found</p>
                    <p>Try adjusting your search filters, or check back later as more members join.</p>
                </div>
            )}
        </div>
    );
    
    const renderChatsTab = () => (
        <div className="bg-slate-800 rounded-lg shadow-lg">
            <div className="p-4 border-b border-slate-700 flex justify-end gap-2">
                 <button onClick={onNewMessageClick} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-md"><MessageSquareIcon className="h-4 w-4"/> New Chat</button>
                 <button onClick={onNewGroupClick} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-md"><UsersPlusIcon className="h-4 w-4"/> New Group</button>
            </div>
             {isLoadingChats ? (
                <div className="flex justify-center items-center h-48"><LoaderIcon className="h-8 w-8 animate-spin text-green-500" /></div>
             ) : (
                <ConversationList
                    conversations={conversations}
                    currentUser={currentUser}
                    onSelectConversation={onOpenChat}
                    onViewProfile={onViewProfile as (userId: string) => void}
                />
             )}
        </div>
    );

    return (
        <div className="animate-fade-in space-y-4">
            <div className="bg-slate-800 rounded-lg shadow-lg">
                <div className="flex border-b border-slate-700">
                    <TabButton label="Collaborate" isActive={activeTab === 'collaborate'} onClick={() => setActiveTab('collaborate')} />
                    <TabButton label="Chats" isActive={activeTab === 'chats'} onClick={() => setActiveTab('chats')} notificationCount={unreadCount} />
                </div>
            </div>
            {activeTab === 'collaborate' ? renderCollaborateTab() : renderChatsTab()}
        </div>
    );
};