
import React, { useState, useEffect, useMemo } from 'react';
import { Member, User, Post, PublicUserProfile, VentureEquityHolding, MemberUser, FilterType } from '../types';
import { api } from '../services/apiService';
import { PencilIcon } from './icons/PencilIcon';
import { useToast } from '../contexts/ToastContext';
import { ProfileCompletionMeter } from './ProfileCompletionMeter';
import { PostsFeed } from './PostsFeed';
import { PostTypeFilter } from './PostTypeFilter';
import { HelpCircleIcon } from './icons/HelpCircleIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { SparkleIcon } from './icons/SparkleIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { DollarSignIcon } from './icons/DollarSignIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { formatTimeAgo } from '../utils';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { FollowListModal } from './FollowListModal';

const LOOKING_FOR_LIST = ['Co-founder', 'Business Partner', 'Investor', 'Mentor', 'Advisor', 'Employee', 'Freelancer'];

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-slate-900/50 p-4 rounded-lg">
        <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-700 rounded-full">{icon}</div>
            <div>
                <p className="text-sm font-medium text-gray-400">{title}</p>
                <p className="text-xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);

const Pill: React.FC<{text: string}> = ({ text }) => (
    <span className="inline-block bg-slate-700 rounded-full px-3 py-1 text-sm font-semibold text-gray-300 mr-2 mb-2">
        {text}
    </span>
);

interface MemberProfileProps {
  currentUser: MemberUser;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  onViewProfile: (userId: string) => void;
  onGetVerifiedClick: () => void;
}

export const MemberProfile: React.FC<MemberProfileProps> = ({ currentUser, onUpdateUser, onViewProfile, onGetVerifiedClick }) => {
    const [referredUsers, setReferredUsers] = useState<PublicUserProfile[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'profile' | 'activity'>('profile');
    const [typeFilter, setTypeFilter] = useState<FilterType>('all');
    const [isCopied, setIsCopied] = useState(false);
    
    // Modal State
    const [followListType, setFollowListType] = useState<'followers' | 'following' | null>(null);

    // Initial state for editing
    const [editData, setEditData] = useState({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        bio: currentUser.bio || '',
        profession: currentUser.profession || '',
        skills: (currentUser.skills || []).join(', '),
        awards: currentUser.awards || '',
        interests: (currentUser.interests || []).join(', '),
        passions: (currentUser.passions || []).join(', '),
        gender: currentUser.gender || '',
        age: currentUser.age || '',
        isLookingForPartners: currentUser.isLookingForPartners || false,
        lookingFor: currentUser.lookingFor || [] as string[],
        businessIdea: currentUser.businessIdea || '',
        id_card_number: currentUser.id_card_number || '',
        circle: currentUser.circle || '',
        socialLinks: currentUser.socialLinks || [] as { title: string; url: string }[]
    });
    
    // Sync edit form if currentUser changes (e.g., after save)
    useEffect(() => {
        setEditData({
            name: currentUser.name || '', phone: currentUser.phone || '', address: currentUser.address || '',
            bio: currentUser.bio || '', profession: currentUser.profession || '', 
            skills: (currentUser.skills || []).join(', '),
            awards: currentUser.awards || '', interests: (currentUser.interests || []).join(', '), passions: (currentUser.passions || []).join(', '),
            gender: currentUser.gender || '', age: currentUser.age || '',
            isLookingForPartners: currentUser.isLookingForPartners || false, lookingFor: currentUser.lookingFor || [],
            businessIdea: currentUser.businessIdea || '',
            id_card_number: currentUser.id_card_number || '',
            circle: currentUser.circle || '',
            socialLinks: currentUser.socialLinks || []
        });
    }, [currentUser]);
    
    useEffect(() => {
        const unsub = api.listenForReferredUsers(currentUser.id, setReferredUsers, (error) => {
             console.error("Failed to load referred users:", error);
             addToast("Could not load referral list.", "error");
        });
        return () => unsub();
    }, [currentUser.id, addToast]);

    const referralLink = `${window.location.origin}?ref=${currentUser.referralCode}`;

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEditData({ ...editData, [e.target.name]: e.target.value });
    };
    
    const handleEditCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked, value } = e.target;
        if (name === 'isLookingForPartners') { setEditData(prev => ({ ...prev, isLookingForPartners: checked })); }
        else { setEditData(prev => ({ ...prev, lookingFor: checked ? [...prev.lookingFor, value] : prev.lookingFor.filter(item => item !== value) })); }
    };

    // Social Links Handlers
    const handleLinkChange = (index: number, field: 'title' | 'url', value: string) => {
        const newLinks = [...editData.socialLinks];
        newLinks[index] = { ...newLinks[index], [field]: value };
        setEditData({ ...editData, socialLinks: newLinks });
    };

    const addLink = () => {
        if (editData.socialLinks.length >= 4) return;
        setEditData({ ...editData, socialLinks: [...editData.socialLinks, { title: '', url: '' }] });
    };

    const removeLink = (index: number) => {
        const newLinks = editData.socialLinks.filter((_, i) => i !== index);
        setEditData({ ...editData, socialLinks: newLinks });
    };

    const handleSave = async () => {
        if (!currentUser.member_id) {
            addToast("Could not save profile. Member ID is missing.", "error");
            return;
        }
        
        // Simple validation for links
        const validLinks = editData.socialLinks.filter(l => l.title.trim() !== '' && l.url.trim() !== '');
        
        setIsSaving(true);
        try {
            const skillsAsArray = (editData.skills || '').split(',').map(s => s.trim()).filter(Boolean);
            const skillsLowercase = skillsAsArray.map(s => s.toLowerCase());
            const interestsAsArray = (editData.interests || '').split(',').map(s => s.trim()).filter(Boolean);
            const passionsAsArray = (editData.passions || '').split(',').map(s => s.trim()).filter(Boolean);
    
            const userUpdateData = {
                phone: editData.phone,
                address: editData.address,
                bio: editData.bio,
                profession: editData.profession,
                skills: skillsAsArray,
                interests: interestsAsArray,
                passions: passionsAsArray,
                awards: editData.awards,
                gender: editData.gender,
                age: editData.age,
                isLookingForPartners: editData.isLookingForPartners,
                lookingFor: editData.lookingFor,
                businessIdea: editData.businessIdea,
                skills_lowercase: skillsLowercase,
                id_card_number: editData.id_card_number,
                circle: editData.circle,
                socialLinks: validLinks
            };
    
            const memberUpdateData = {
                phone: editData.phone,
                address: editData.address,
                bio: editData.bio,
                profession: editData.profession,
                skills: skillsAsArray,
                interests: interestsAsArray,
                passions: passionsAsArray,
                gender: editData.gender,
                age: editData.age,
                isLookingForPartners: editData.isLookingForPartners,
                lookingFor: editData.lookingFor,
                businessIdea: editData.businessIdea,
                awards: editData.awards,
                skills_lowercase: skillsLowercase,
                national_id: editData.id_card_number,
                circle: editData.circle,
            };
    
            await api.updateMemberAndUserProfile(currentUser.id, currentUser.member_id, userUpdateData, memberUpdateData);
    
            addToast('Profile updated successfully!', 'success');
            setIsEditing(false);
        } catch (error: any) {
            console.error("Failed to save profile:", error);
            const errorMessage = error.message || 'An error occurred while saving.';
            addToast(errorMessage, "error");
        } finally {
            setIsSaving(false);
        }
    };
    
     const handleCopy = () => {
        navigator.clipboard.writeText(referralLink).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };
    
    const skillsArray = useMemo(() => {
        return isEditing 
            ? (editData.skills || '').split(',').map(s => s.trim()).filter(Boolean)
            : currentUser.skills || [];
    }, [isEditing, editData.skills, currentUser.skills]);

    const interestsArray = useMemo(() => {
        return isEditing 
            ? (editData.interests || '').split(',').map(s => s.trim()).filter(Boolean)
            : currentUser.interests || [];
    }, [isEditing, editData.interests, currentUser.interests]);
    
    const lookingForArray = (isEditing ? editData.lookingFor : currentUser.lookingFor)?.filter(Boolean) || [];
    const profileDataForMeter = isEditing ? editData : currentUser;

    const renderProfileEdit = () => (
        <div className="mt-6 space-y-4">
             <h3 className="text-lg font-semibold text-gray-200 border-b border-slate-700 pb-2">Personal Information</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
                    <input type="text" name="name" id="name" value={editData.name} readOnly className="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-gray-400 sm:text-sm" />
                    <p className="mt-1 text-xs text-gray-500">Name cannot be changed. Please contact support.</p>
                </div>
                <div><label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone</label><input type="tel" name="phone" id="phone" value={editData.phone} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div>
             </div>
              <div><label htmlFor="address" className="block text-sm font-medium text-gray-300">Address</label><input type="text" name="address" id="address" value={editData.address} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div><label htmlFor="profession" className="block text-sm font-medium text-gray-300">Job / Profession</label><input type="text" name="profession" id="profession" value={editData.profession} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div>
                 <div><label htmlFor="circle" className="block text-sm font-medium text-gray-300">Circle</label><input type="text" name="circle" id="circle" value={editData.circle} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div>
             </div>
             
             <div><label htmlFor="bio" className="block text-sm font-medium text-gray-300">Bio</label><textarea name="bio" id="bio" rows={4} value={editData.bio} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm"></textarea></div>
            
            {/* Bio Links Edit Section */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bio Links (Max 4)</label>
                <div className="space-y-2">
                    {editData.socialLinks.map((link, index) => (
                        <div key={index} className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Title (e.g. WhatsApp)" 
                                value={link.title} 
                                onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                                className="flex-1 bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
                            />
                            <input 
                                type="text" 
                                placeholder="URL (https://...)" 
                                value={link.url} 
                                onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                                className="flex-[2] bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
                            />
                            <button type="button" onClick={() => removeLink(index)} className="p-2 text-red-400 hover:text-red-300"><TrashIcon className="h-5 w-5"/></button>
                        </div>
                    ))}
                    {editData.socialLinks.length < 4 && (
                        <button type="button" onClick={addLink} className="flex items-center text-sm text-green-400 hover:text-green-300 mt-2">
                            <PlusIcon className="h-4 w-4 mr-1" /> Add Link
                        </button>
                    )}
                </div>
            </div>

            <div><label htmlFor="skills" className="block text-sm font-medium text-gray-300">Skills (comma-separated)</label><input type="text" name="skills" id="skills" value={editData.skills} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div>
             <div><label htmlFor="interests" className="block text-sm font-medium text-gray-300">Interests (comma-separated)</label><input type="text" name="interests" id="interests" value={editData.interests} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div>
            
            <h3 className="text-lg font-semibold text-gray-200 border-b border-slate-700 pb-2 pt-4">Ventures & Collaborations</h3>
            <div className="flex items-center mt-4"><input type="checkbox" id="isLookingForPartners" name="isLookingForPartners" checked={editData.isLookingForPartners} onChange={handleEditCheckboxChange} className="h-4 w-4 text-green-600 bg-slate-700 border-slate-600 rounded focus:ring-green-500" /><label htmlFor="isLookingForPartners" className="ml-2 block text-sm text-gray-200">I'm open to business collaborations.</label></div>
            {editData.isLookingForPartners && (
                <div className="space-y-4 mt-4 pl-6 border-l border-slate-700 animate-fade-in">
                    <div><label htmlFor="businessIdea" className="block text-sm font-medium text-gray-300">My business idea</label><textarea name="businessIdea" id="businessIdea" rows={3} value={editData.businessIdea} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" /></div>
                    <div><label className="block text-sm font-medium text-gray-300">What I'm looking for</label><div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">{LOOKING_FOR_LIST.map(item => (<label key={item} className="flex items-center space-x-2 text-sm text-gray-300"><input type="checkbox" value={item} name="lookingFor" checked={editData.lookingFor.includes(item)} onChange={handleEditCheckboxChange} className="text-green-600 bg-slate-700 border border-slate-600 rounded focus:ring-green-500"/><span>{item}</span></label>))}</div></div>
                </div>
            )}
            <div className="flex justify-end space-x-3 pt-4"><button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-600 text-white text-sm rounded-md hover:bg-slate-500">Cancel</button><button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-slate-500">{isSaving ? "Saving..." : "Save Changes"}</button></div>
        </div>
    );

    const renderProfileView = () => (
         <div className="mt-6 space-y-8">
            <div className="flex justify-between items-center text-sm text-gray-400 bg-slate-900/50 p-4 rounded-lg">
                <button 
                    onClick={() => setFollowListType('followers')}
                    className="text-center hover:bg-slate-800 p-2 rounded-md transition-colors w-1/3"
                >
                    <span className="block font-bold text-white text-lg">{currentUser.followers?.length || 0}</span>
                    <span>Followers</span>
                </button>
                <div className="h-8 w-px bg-slate-700"></div>
                <button 
                    onClick={() => setFollowListType('following')}
                    className="text-center hover:bg-slate-800 p-2 rounded-md transition-colors w-1/3"
                >
                    <span className="block font-bold text-white text-lg">{currentUser.following?.length || 0}</span>
                    <span>Following</span>
                </button>
                <div className="h-8 w-px bg-slate-700"></div>
                <div className="text-center w-1/3">
                    <span className="block font-bold text-white text-lg">{currentUser.credibility_score}</span>
                    <span>Score</span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard title="Civic Capital (CCAP)" value={(currentUser.ccap ?? 0).toLocaleString()} icon={<DatabaseIcon className="h-5 w-5 text-blue-400"/>} />
                <StatCard title="Referral Earnings" value={`$${(currentUser.referralEarnings ?? 0).toFixed(2)}`} icon={<DollarSignIcon className="h-5 w-5 text-green-400"/>} />
            </div>
             
             <div>
                <h3 className="text-md font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-4">About</h3>
                {currentUser.bio ? <p className="text-gray-300 whitespace-pre-line leading-relaxed">{currentUser.bio}</p> : <p className="text-gray-500 italic">No bio provided.</p>}
                
                {currentUser.socialLinks && currentUser.socialLinks.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {currentUser.socialLinks.map((link, i) => (
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
                )}
             </div>

            {currentUser.isLookingForPartners && (<div><h3 className="text-md font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-4">Ventures & Collaborations</h3>{currentUser.businessIdea && <p className="text-gray-300 whitespace-pre-line mb-4">{currentUser.businessIdea}</p>}{lookingForArray.length > 0 && (<div><h4 className="text-sm font-semibold text-gray-400 mb-2">Currently Looking For:</h4><div>{lookingForArray.map(item => <Pill key={item} text={item} />)}</div></div>)}</div>)}
            {skillsArray.length > 0 && (<div><h3 className="text-md font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-4">Skills</h3><div>{skillsArray.map(skill => <Pill key={skill} text={skill} />)}</div></div>)}
            
            {currentUser.ventureEquity?.length > 0 && (
                <div><h3 className="text-md font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-4">My Investments (VEQ)</h3>
                    <div className="space-y-3">
                        {currentUser.ventureEquity.map((holding: VentureEquityHolding) => (
                            <div key={holding.ventureId} className="bg-slate-900/50 p-3 rounded-md flex justify-between items-center">
                                <div><p className="font-semibold text-white">{holding.ventureName}</p><p className="text-xs text-gray-400 font-mono">{holding.ventureTicker}</p></div>
                                <div className="text-right"><p className="font-semibold text-white">{holding.shares.toLocaleString()} Shares</p><p className="text-xs text-gray-400">Venture Equity</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div><h3 className="text-md font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-4">Referral Program</h3>
                <div className="bg-slate-900/50 p-4 rounded-lg space-y-4">
                    <div><label className="text-sm font-medium text-gray-400">Your Referral Link</label><div className="flex items-center gap-2 mt-1"><input type="text" readOnly value={referralLink} className="w-full bg-slate-700 p-2 rounded-md text-gray-300 font-mono text-sm" /><button onClick={handleCopy} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md">{isCopied ? <ClipboardCheckIcon className="h-5 w-5 text-green-400"/> : <ClipboardIcon className="h-5 w-5 text-gray-400"/>}</button></div></div>
                    <div><h4 className="text-sm font-medium text-gray-400">Your Referrals ({referredUsers.length})</h4>
                        <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                            {referredUsers.length > 0 ? referredUsers.map(u => (
                                <button key={u.id} onClick={() => onViewProfile(u.id)} className="w-full text-left flex items-center space-x-3 p-2 bg-slate-700/50 rounded-md hover:bg-slate-700">
                                    <UserCircleIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-white">{u.name}</p>
                                        <p className="text-xs text-gray-400">Joined {u.createdAt ? formatTimeAgo(u.createdAt.toDate().toISOString()) : 'N/A'}</p>
                                    </div>
                                </button>
                            )) : <p className="text-sm text-gray-500 text-center py-4">No one has joined with your code yet.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

  return (
    <div className="bg-slate-800 p-4 sm:p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
            <UserCircleIcon className="h-24 w-24 text-slate-600" />
            <div>
                <h2 className="text-3xl font-bold text-white">{isEditing ? editData.name : currentUser.name}</h2>
                <p className="text-lg text-green-400">{isEditing ? editData.profession : currentUser.profession || <span className="capitalize">{currentUser.role}</span>}</p>
                <p className="text-sm text-gray-400">{currentUser.circle}</p>
            </div>
        </div>
         {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="flex items-center space-x-2 px-4 py-2 bg-slate-700 text-white text-sm font-semibold rounded-md hover:bg-slate-600">
                <PencilIcon className="h-4 w-4" />
                <span>Edit Profile</span>
            </button>
         )}
      </div>

       {currentUser.status !== 'active' && (
        <div className="mt-6 p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
           <div>
                <h4 className="font-bold text-yellow-200 flex items-center gap-2"><AlertTriangleIcon className="h-5 w-5"/>Complete Your Verification</h4>
                <p className="text-sm text-yellow-300 mt-1">Unlock full member benefits by securing your $UBT stake in the commons.</p>
            </div>
            <button 
                onClick={onGetVerifiedClick}
                className="flex-shrink-0 w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold"
            >
                Get Verified Now
            </button>
        </div>
     )}
      
      <div className="mt-4 border-b border-slate-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button onClick={() => setActiveTab('profile')} className={`${activeTab === 'profile' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-400 hover:text-gray-200'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Profile</button>
              <button onClick={() => setActiveTab('activity')} className={`${activeTab === 'activity' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-400 hover:text-gray-200'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Activity</button>
          </nav>
      </div>

       <div className="mt-6">
            <ProfileCompletionMeter profileData={profileDataForMeter} role="member" />
            {activeTab === 'profile' ? (isEditing ? renderProfileEdit() : renderProfileView()) : (
                <div className="animate-fade-in">
                    <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} />
                    <PostsFeed user={currentUser} authorId={currentUser.id} onViewProfile={onViewProfile} typeFilter={typeFilter} />
                </div>
            )}
        </div>

        {/* Follow/Following Modal */}
        {followListType && (
            <FollowListModal 
                isOpen={!!followListType}
                onClose={() => setFollowListType(null)}
                title={followListType === 'followers' ? 'Followers' : 'Following'}
                userIds={followListType === 'followers' ? (currentUser.followers || []) : (currentUser.following || [])}
                currentUser={currentUser}
                onViewProfile={onViewProfile}
                canManage={followListType === 'following'}
            />
        )}
    </div>
  );
};
