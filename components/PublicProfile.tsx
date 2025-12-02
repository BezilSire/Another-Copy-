import React, { useState, useEffect } from 'react';
import { User, PublicUserProfile, FilterType } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { PostsFeed } from './PostsFeed';
import { MemberCard } from './MemberCard';
import { FlagIcon } from './icons/FlagIcon';
import { ReportUserModal } from './ReportUserModal';
import { PostTypeFilter } from './PostTypeFilter';
import { SparkleIcon } from './icons/SparkleIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { UserCheckIcon } from './icons/UserCheckIcon';
import { LoaderIcon } from './icons/LoaderIcon';


interface PublicProfileProps {
  userId: string;
  currentUser: User;
  onBack: () => void;
  onStartChat: (targetUserId: string) => void;
  onViewProfile: (userId: string) => void; // For viewing profiles from posts
  isAdminView?: boolean;
}

const DetailItem: React.FC<{label: string, value: string | undefined}> = ({label, value}) => (
    <div>
        <dt className="text-sm font-medium text-gray-400">{label}</dt>
        <dd className="mt-1 text-white">{value || <span className="text-gray-500 italic">Not specified</span>}</dd>
    </div>
);

const Pill: React.FC<{text: string}> = ({ text }) => (
    <span className="inline-block bg-slate-700 rounded-full px-3 py-1 text-sm font-semibold text-gray-300 mr-2 mb-2">
        {text}
    </span>
);

export const PublicProfile: React.FC<PublicProfileProps> = ({ userId, currentUser, onBack, onStartChat, onViewProfile, isAdminView = false }) => {
    const [publicProfile, setPublicProfile] = useState<PublicUserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'activity' | 'about' | 'card' | 'venture'>('activity');
    const [typeFilter, setTypeFilter] = useState<FilterType>('all');
    const { addToast } = useToast();

    // Check if user is following when component mounts or currentUser updates
    useEffect(() => {
        if (currentUser.following?.includes(userId)) {
            setIsFollowing(true);
        } else {
            setIsFollowing(false);
        }
    }, [currentUser.following, userId]);

    useEffect(() => {
        setPublicProfile(null);
        setIsLoading(true);
        setActiveTab('activity');
        setTypeFilter('all');

        const fetchProfileData = async () => {
            try {
                // If viewing own profile via public route, use current user data for consistency
                if (userId === currentUser.id && !isAdminView) {
                    setPublicProfile(currentUser);
                    setIsLoading(false);
                    return;
                }

                const profileData = isAdminView
                    ? await api.getUser(userId)
                    : await api.getPublicUserProfile(userId);

                if (profileData) {
                    setPublicProfile(profileData);
                } else {
                    addToast("Could not find user profile.", "error");
                }
            } catch (error) {
                addToast("Failed to load profile data.", "error");
                console.error("Profile load error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (userId) {
            fetchProfileData();
        } else {
            addToast("User ID is missing.", "error");
            setIsLoading(false);
        }
    }, [userId, addToast, isAdminView, currentUser]); 
    
    const handleFollowToggle = async () => {
        if (!publicProfile) return;
        setIsFollowLoading(true);
        try {
            if (isFollowing) {
                await api.unfollowUser(currentUser.id, publicProfile.id);
                setIsFollowing(false);
                // Optimistic update of follower count for display
                setPublicProfile(prev => {
                    if (!prev) return null;
                    const newFollowers = prev.followers?.filter(id => id !== currentUser.id) || [];
                    return { ...prev, followers: newFollowers };
                });
                addToast(`Unfollowed ${publicProfile.name}.`, 'info');
            } else {
                await api.followUser(currentUser, publicProfile.id);
                setIsFollowing(true);
                // Optimistic update
                setPublicProfile(prev => {
                    if (!prev) return null;
                    const newFollowers = [...(prev.followers || []), currentUser.id];
                    return { ...prev, followers: newFollowers };
                });
                addToast(`You are now following ${publicProfile.name}!`, 'success');
            }
        } catch (error) {
            console.error(error);
            addToast("Action failed. Check your connection.", "error");
        } finally {
            setIsFollowLoading(false);
        }
    };

    const handleReportSubmit = async (reason: string, details: string) => {
        if (!publicProfile) return;
        try {
            await api.reportUser(currentUser, publicProfile as any, reason, details);
            addToast("Report submitted successfully. An admin will review it.", "success");
        } catch (error) {
            addToast("Failed to submit report.", "error");
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><LoaderIcon className="h-8 w-8 animate-spin text-green-500" /></div>;
    }

    if (!publicProfile) {
        return (
            <div>
                 <button onClick={onBack} className="inline-flex items-center mb-6 text-sm font-medium text-green-400 hover:text-green-300">
                    <ArrowLeftIcon className="h-4 w-4 mr-2" /> Back
                </button>
                <div className="text-center p-10 text-gray-300">User not found.</div>
            </div>
        );
    }
    
    const skills = publicProfile.skills;
    const skillsArray = Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(Boolean) : []);

    const interests = publicProfile.interests;
    const interestsArray = Array.isArray(interests) ? interests : (typeof interests === 'string' ? interests.split(',').map(s => s.trim()).filter(Boolean) : []);
    
    const lookingForArray = publicProfile.lookingFor?.filter(Boolean) || [];
    const hasVentureInfo = !!publicProfile.isLookingForPartners;
    const isOwnProfile = publicProfile.id === currentUser.id;

    const renderAboutTab = () => (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg animate-fade-in space-y-6">
            <div>
                <h3 className="text-md font-semibold text-gray-300 mb-2">About</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{publicProfile.bio || 'No bio provided.'}</p>
            </div>
            
            {publicProfile.socialLinks && publicProfile.socialLinks.length > 0 && (
                <div>
                    <h3 className="text-md font-semibold text-gray-300 mb-2">Links</h3>
                    <div className="flex flex-wrap gap-2">
                        {publicProfile.socialLinks.map((link, i) => (
                            <a 
                                key={i} 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="px-3 py-1 bg-slate-700 hover:bg-green-600 text-white text-sm rounded-md transition-colors truncate max-w-[200px]"
                            >
                                {link.title}
                            </a>
                        ))}
                    </div>
                </div>
            )}
            
            {(isOwnProfile || isAdminView) && (
                <div className="pt-6 mt-6 border-t border-slate-700">
                    <h3 className="text-md font-semibold text-gray-300 mb-2">Contact Information</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <DetailItem label="Email" value={publicProfile.email} />
                        <DetailItem label="Phone Number" value={publicProfile.phone} />
                    </dl>
                </div>
            )}

            {publicProfile.role === 'member' && (
                <>
                    {skillsArray.length > 0 && (
                        <div>
                            <h3 className="text-md font-semibold text-gray-300 mb-2">Skills</h3>
                            <div>{skillsArray.map(skill => <Pill key={skill} text={skill} />)}</div>
                        </div>
                    )}
                    {interestsArray.length > 0 && (
                        <div>
                            <h3 className="text-md font-semibold text-gray-300 mb-2">Interests</h3>
                            <div>{interestsArray.map(item => <Pill key={item} text={item} />)}</div>
                        </div>
                    )}
                </>
            )}

            {isAdminView && (
                 <div className="pt-6 mt-6 border-t border-slate-700">
                    <h3 className="text-md font-semibold text-red-400 mb-2">Private Details (Admin View)</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <DetailItem label="Address" value={publicProfile.address} />
                        <DetailItem label="ID Card Number" value={publicProfile.id_card_number} />
                        <DetailItem label="Gender" value={publicProfile.gender} />
                        <DetailItem label="Age" value={publicProfile.age} />
                    </dl>
                </div>
            )}
        </div>
    );
    
    const renderVentureTab = () => (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg animate-fade-in space-y-4">
            <h2 className="text-2xl font-bold text-white">Venture Idea</h2>
             <div className="pt-4 border-t border-slate-700">
                <p className="text-gray-300 whitespace-pre-line mt-1">{publicProfile.businessIdea}</p>
            </div>
             {lookingForArray.length > 0 && (
                <div className="pt-4 border-t border-slate-700">
                    <h3 className="text-lg font-semibold text-green-400">Looking For</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {lookingForArray.map(item => <Pill key={item} text={item} />)}
                    </div>
                </div>
            )}
        </div>
    );
    
    const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
         <button
            onClick={onClick}
            className={`${isActive ? 'border-green-500 text-green-400' : 'border-transparent text-gray-400 hover:text-gray-200'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
        >
            {label}
        </button>
    );

    return (
        <div className="animate-fade-in pb-20">
             {isReportModalOpen && publicProfile && (
                <ReportUserModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    reportedUser={publicProfile as User}
                    onReportSubmit={handleReportSubmit}
                />
            )}
            <button onClick={onBack} className="inline-flex items-center mb-6 text-sm font-medium text-green-400 hover:text-green-300">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back
            </button>
            
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex items-center gap-4">
                        <UserCircleIcon className="h-20 w-20 text-slate-600 flex-shrink-0" />
                        <div>
                            <h2 className="text-3xl font-bold text-white">{publicProfile.name}</h2>
                            <p className="text-lg text-green-400">{publicProfile.profession || <span className="capitalize">{publicProfile.role}</span>}</p>
                            <p className="text-sm text-gray-400">{publicProfile.circle}</p>
                            
                            {/* Follow Stats */}
                            <div className="flex items-center gap-4 mt-3 text-sm text-gray-300">
                                <span className="font-semibold">{publicProfile.followers?.length || 0} <span className="font-normal text-gray-400">Followers</span></span>
                                <span className="font-semibold">{publicProfile.following?.length || 0} <span className="font-normal text-gray-400">Following</span></span>
                            </div>

                            <div className="flex items-center gap-4 mt-3">
                                <div className="relative group flex items-center gap-1" title="Credibility Score">
                                    <span className="font-mono text-sm py-0.5 px-2 rounded-full bg-slate-700 text-green-400 border border-green-500/30">
                                        CR: {publicProfile.credibility_score ?? 100}
                                    </span>
                                </div>
                                <div className="relative group flex items-center gap-1" title="Social Capital (SCAP)">
                                    <SparkleIcon className="h-4 w-4 text-yellow-400" />
                                    <span className="font-mono text-sm py-0.5 px-2 rounded-full bg-slate-700 text-yellow-400">
                                        {publicProfile.scap ?? 0}
                                    </span>
                                </div>
                                <div className="relative group flex items-center gap-1" title="Civic Capital (CCAP)">
                                    <DatabaseIcon className="h-4 w-4 text-blue-400" />
                                    <span className="font-mono text-sm py-0.5 px-2 rounded-full bg-slate-700 text-blue-400">
                                        {publicProfile.ccap ?? 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                     <div className="flex flex-row flex-wrap gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                        {!isOwnProfile && (
                            <>
                                <button 
                                    onClick={handleFollowToggle}
                                    disabled={isFollowLoading}
                                    className={`flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-colors shadow-md ${
                                        isFollowing 
                                            ? 'bg-slate-700 text-gray-300 hover:bg-slate-600 border border-slate-600' 
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                >
                                    {isFollowLoading ? (
                                        <LoaderIcon className="h-5 w-5 animate-spin" />
                                    ) : isFollowing ? (
                                        <>
                                            <UserCheckIcon className="h-5 w-5" />
                                            <span>Following</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserPlusIcon className="h-5 w-5" />
                                            <span>Follow</span>
                                        </>
                                    )}
                                </button>
                                <button 
                                    onClick={() => onStartChat(publicProfile.id)}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-md transition-colors"
                                >
                                    <MessageSquareIcon className="h-5 w-5" />
                                    <span>Message</span>
                                </button>
                                <button
                                    onClick={() => setIsReportModalOpen(true)}
                                    className="inline-flex items-center justify-center p-2.5 bg-slate-700/50 text-gray-400 rounded-lg hover:bg-red-900/50 hover:text-red-400 transition-colors"
                                    title="Report this user"
                                >
                                    <FlagIcon className="h-5 w-5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="mt-6">
                <div className="border-b border-slate-700">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                        <TabButton label="Activity" isActive={activeTab === 'activity'} onClick={() => setActiveTab('activity')} />
                        <TabButton label="About" isActive={activeTab === 'about'} onClick={() => setActiveTab('about')} />
                        {hasVentureInfo && (
                             <TabButton label="Venture Idea" isActive={activeTab === 'venture'} onClick={() => setActiveTab('venture')} />
                        )}
                        {publicProfile.role === 'member' && (
                            <TabButton label="Member Card" isActive={activeTab === 'card'} onClick={() => setActiveTab('card')} />
                        )}
                    </nav>
                </div>
            </div>

            <div className="mt-6">
                {activeTab === 'activity' && (
                    <div className="animate-fade-in">
                         <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} />
                         <PostsFeed 
                            user={currentUser}
                            authorId={publicProfile.id}
                            onViewProfile={onViewProfile}
                            typeFilter={typeFilter}
                        />
                    </div>
                )}
                {activeTab === 'about' && renderAboutTab()}
                {activeTab === 'venture' && hasVentureInfo && renderVentureTab()}
                {activeTab === 'card' && publicProfile.role === 'member' && (
                    <div className="animate-fade-in">
                        <MemberCard user={publicProfile} />
                    </div>
                )}
            </div>
        </div>
    );
};