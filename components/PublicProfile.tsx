import React, { useState, useEffect } from 'react';
import { User, Member, Post, PublicUserProfile, FilterType } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { MessageSquareIcon } from './icons/MessageSquareIcon';
import { PostsFeed } from './PostsFeed';
import { IdCardIcon } from './icons/IdCardIcon';
import { InfoIcon } from './icons/InfoIcon';
import { MemberCard } from './MemberCard';
import { FlagIcon } from './icons/FlagIcon';
import { ReportUserModal } from './ReportUserModal';
import { PostTypeFilter } from './PostTypeFilter';
import { FilePenIcon } from './icons/FilePenIcon';
import { SparkleIcon } from './icons/SparkleIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';


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
    const [publicProfile, setPublicProfile] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'activity' | 'about' | 'card' | 'venture'>('activity');
    const [typeFilter, setTypeFilter] = useState<FilterType>('all');
    const { addToast } = useToast();

    useEffect(() => {
        setPublicProfile(null);
        setIsLoading(true);
        setActiveTab('activity');
        setTypeFilter('all');

        const fetchProfileData = async () => {
            try {
                const profileData = isAdminView
                    ? await api.getUser(userId)
                    : await api.getPublicUserProfile(userId);

                if (profileData) {
                    setPublicProfile(profileData as User);
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
    }, [userId, addToast, isAdminView]);
    
    const handleReportSubmit = async (reason: string, details: string) => {
        if (!publicProfile) return;
        try {
            await api.reportUser(currentUser, publicProfile as PublicUserProfile, reason, details);
            addToast("Report submitted successfully. An admin will review it.", "success");
        } catch (error) {
            addToast("Failed to submit report.", "error");
        }
    };

    if (isLoading) {
        return <div className="text-center p-10 text-gray-300">Loading profile...</div>;
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
    const hasPitchDeck = !!(publicProfile.businessIdea);


    const isOwnProfile = publicProfile.id === currentUser.id;

    const renderAboutTab = () => (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg animate-fade-in space-y-6">
            <div>
                <h3 className="text-md font-semibold text-gray-300 mb-2">About</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{publicProfile.bio || 'No bio provided.'}</p>
            </div>
            
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
        <div className="animate-fade-in">
             {isReportModalOpen && publicProfile && (
                <ReportUserModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    reportedUser={publicProfile as User} // Casting for prop compatibility
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
                        <UserCircleIcon className="h-20 w-20 text-slate-600" />
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-bold text-white">{publicProfile.name}</h2>
                            </div>
                            <p className="text-lg text-green-400">{publicProfile.profession || <span className="capitalize">{publicProfile.role}</span>}</p>
                            <p className="text-sm text-gray-400">{publicProfile.circle}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="relative group flex items-center gap-1" title="Credibility Score">
                                    <span className="font-mono text-sm py-0.5 px-2 rounded-full bg-slate-700 text-green-400">
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
                     <div className="flex flex-row flex-wrap gap-2 w-full sm:w-auto">
                        {!isOwnProfile && (
                             <button 
                                onClick={() => onStartChat(publicProfile.id)}
                                className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-slate-700 text-white text-sm font-semibold rounded-md hover:bg-slate-600 grow sm:grow-0"
                            >
                                <MessageSquareIcon className="h-4 w-4" />
                                <span>Message</span>
                            </button>
                        )}
                         {!isOwnProfile && (
                            <button
                                onClick={() => setIsReportModalOpen(true)}
                                className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-red-900/50 text-red-400 text-sm font-semibold rounded-md hover:bg-red-900/80 grow sm:grow-0"
                                title="Report this user"
                            >
                                <FlagIcon className="h-4 w-4" />
                                <span>Report</span>
                            </button>
                         )}
                    </div>
                </div>
            </div>
            
            <div className="mt-4">
                <div className="border-b border-slate-700">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <TabButton label="Activity" isActive={activeTab === 'activity'} onClick={() => setActiveTab('activity')} />
                        <TabButton label="About" isActive={activeTab === 'about'} onClick={() => setActiveTab('about')} />
                        {hasPitchDeck && (
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
                {activeTab === 'venture' && hasPitchDeck && renderVentureTab()}
                {activeTab === 'card' && publicProfile.role === 'member' && (
                    <div className="animate-fade-in">
                        <MemberCard user={publicProfile as PublicUserProfile} />
                    </div>
                )}
            </div>
        </div>
    );
};