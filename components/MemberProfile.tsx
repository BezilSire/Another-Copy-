import React, { useState, useEffect } from 'react';
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
}

export const MemberProfile: React.FC<MemberProfileProps> = ({ currentUser, onUpdateUser, onViewProfile }) => {
    const [referredUsers, setReferredUsers] = useState<PublicUserProfile[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'profile' | 'activity'>('profile');
    const [typeFilter, setTypeFilter] = useState<FilterType>('all');
    const [isCopied, setIsCopied] = useState(false);

    const [editData, setEditData] = useState({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        bio: currentUser.bio || '',
        profession: currentUser.profession || '',
        skills: currentUser.skills || '',
        awards: currentUser.awards || '',
        interests: currentUser.interests || '',
        passions: currentUser.passions || '',
        gender: currentUser.gender || '',
        age: currentUser.age || '',
        isLookingForPartners: currentUser.isLookingForPartners || false,
        lookingFor: currentUser.lookingFor || [] as string[],
        businessIdea: currentUser.businessIdea || '',
    });
    
    // Sync edit form if currentUser changes (e.g., after save)
    useEffect(() => {
        setEditData({
            name: currentUser.name || '', phone: currentUser.phone || '', address: currentUser.address || '',
            bio: currentUser.bio || '', profession: currentUser.profession || '', skills: currentUser.skills || '',
            awards: currentUser.awards || '', interests: currentUser.interests || '', passions: currentUser.passions || '',
            gender: currentUser.gender || '', age: currentUser.age || '',
            isLookingForPartners: currentUser.isLookingForPartners || false, lookingFor: currentUser.lookingFor || [],
            businessIdea: currentUser.businessIdea || '',
        });
    }, [currentUser]);
    
    useEffect(() => {
        const unsub = api.listenForReferredUsers(currentUser.id, setReferredUsers, console.error);
        return () => unsub();
    }, [currentUser.id]);

    const referralLink = `${window.location.origin}?ref=${currentUser.referralCode}`;

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEditData({ ...editData, [e.target.name]: e.target.value });
    };
    
    const handleEditCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked, value } = e.target;
        if (name === 'isLookingForPartners') { setEditData(prev => ({ ...prev, isLookingForPartners: checked })); }
        else { setEditData(prev => ({ ...prev, lookingFor: checked ? [...prev.lookingFor, value] : prev.lookingFor.filter(item => item !== value) })); }
    };

    const handleSave = async () => {
        if (!currentUser.member_id) { addToast("Could not save profile. Member ID is missing.", "error"); return; }
        setIsSaving(true);
        try {
            const memberUpdateData: Partial<Member> = {
                full_name: editData.name, phone: editData.phone, address: editData.address, bio: editData.bio,
                profession: editData.profession, skills: editData.skills, awards: editData.awards, interests: editData.interests,
                passions: editData.passions, gender: editData.gender, age: editData.age, isLookingForPartners: editData.isLookingForPartners,
                lookingFor: editData.lookingFor, businessIdea: editData.businessIdea,
            };
            const userUpdateData: Partial<User> = {
                name: editData.name, phone: editData.phone, address: editData.address, bio: editData.bio,
                isLookingForPartners: editData.isLookingForPartners, lookingFor: editData.lookingFor, businessIdea: editData.businessIdea,
                skills: editData.skills, interests: editData.interests, profession: editData.profession, awards: editData.awards,
                passions: editData.passions, gender: editData.gender, age: editData.age,
            };
            // The `onUpdateUser` will trigger the AuthContext listener which updates the `currentUser` prop for this component.
            // This re-renders the component with the latest data.
            await onUpdateUser(userUpdateData);
            // We also update the 'members' collection for consistency, though it's not directly read by this component anymore.
            await api.updateMemberProfile(currentUser.member_id, memberUpdateData);
            setIsEditing(false);
        } catch (error) { addToast("An error occurred while saving.", "error"); }
        finally { setIsSaving(false); }
    };
    
     const handleCopy = () => {
        navigator.clipboard.writeText(referralLink).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };
    
    const skillsArray = ((isEditing ? editData.skills : currentUser.skills) || '').split(',').map(s => s.trim()).filter(Boolean);
    const interestsArray = ((isEditing ? editData.interests : currentUser.interests) || '').split(',').map(s => s.trim()).filter(Boolean);
    const passionsArray = ((isEditing ? editData.passions : currentUser.passions) || '').split(',').map(s => s.trim()).filter(Boolean);
    const lookingForArray = (isEditing ? editData.lookingFor : currentUser.lookingFor)?.filter(Boolean) || [];
    const profileDataForMeter = isEditing ? editData : currentUser;

    const renderProfileEdit = () => (
        <div className="mt-6 space-y-4">
             <h3 className="text-lg font-semibold text-gray-200 border-b border-slate-700 pb-2">Personal Information</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label><input type="text" name="name" id="name" value={editData.name} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div>
                <div><label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone</label><input type="tel" name="phone" id="phone" value={editData.phone} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div>
             </div>
              <div><label htmlFor="address" className="block text-sm font-medium text-gray-300">Address</label><input type="text" name="address" id="address" value={editData.address} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label htmlFor="profession" className="block text-sm font-medium text-gray-300">Job / Profession</label><input type="text" name="profession" id="profession" value={editData.profession} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div></div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div><label htmlFor="gender" className="block text-sm font-medium text-gray-300">Gender</label><input type="text" name="gender" id="gender" value={editData.gender} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div>
                 <div><label htmlFor="age" className="block text-sm font-medium text-gray-300">Age</label><input type="text" name="age" id="age" value={editData.age} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div>
            </div>
             <div><label htmlFor="bio" className="block text-sm font-medium text-gray-300">Bio</label><textarea name="bio" id="bio" rows={4} value={editData.bio} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm"></textarea></div>
            <div><label htmlFor="skills" className="block text-sm font-medium text-gray-300">Skills (comma-separated)</label><input type="text" name="skills" id="skills" value={editData.skills} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div>
             <div><label htmlFor="interests" className="block text-sm font-medium text-gray-300">Interests (comma-separated)</label><input type="text" name="interests" id="interests" value={editData.interests} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div>
            <div><label htmlFor="passions" className="block text-sm font-medium text-gray-300">Passions (comma-separated)</label><input type="text" name="passions" id="passions" value={editData.passions} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" /></div>
            <div><label htmlFor="awards" className="block text-sm font-medium text-gray-300">Awards & Recognitions</label><textarea name="awards" id="awards" rows={3} value={editData.awards} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm"></textarea></div>
            <h3 className="text-lg font-semibold text-gray-200 border-b border-slate-700 pb-2 pt-4">Ventures & Collaborations</h3>
            <div className="flex items-center mt-4"><input type="checkbox" id="isLookingForPartners" name="isLookingForPartners" checked={editData.isLookingForPartners} onChange={handleEditCheckboxChange} className="h-4 w-4 text-green-600 bg-slate-700 border-slate-600 rounded focus:ring-green-500" /><label htmlFor="isLookingForPartners" className="ml-2 block text-sm text-gray-200">I'm open to business collaborations.</label></div>
            {editData.isLookingForPartners && (
                <div className="space-y-4 mt-4 pl-6 border-l border-slate-700 animate-fade-in">
                    <div><label htmlFor="businessIdea" className="block text-sm font-medium text-gray-300">My business idea</label><textarea name="businessIdea" id="businessIdea" rows={3} value={editData.businessIdea} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" /></div>
                    <div><label className="block text-sm font-medium text-gray-300">What I'm looking for</label><div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">{LOOKING_FOR_LIST.map(item => (<label key={item} className="flex items-center space-x-2 text-sm text-gray-300"><input type="checkbox" value={item} name="lookingFor" checked={editData.lookingFor.includes(item)} onChange={handleEditCheckboxChange} className="text-green-600 bg-slate-700 border-slate-600 rounded focus:ring-green-500"/><span>{item}</span></label>))}</div></div>
                </div>
            )}
            <div className="flex justify-end space-x-3 pt-4"><button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-600 text-white text-sm rounded-md hover:bg-slate-500">Cancel</button><button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-slate-500">{isSaving ? "Saving..." : "Save Changes"}</button></div>
        </div>
    );

    const renderProfileView = () => (
         <div className="mt-6 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Social Capital (SCAP)" value={(currentUser.scap ?? 0).toLocaleString()} icon={<SparkleIcon className="h-5 w-5 text-yellow-400"/>} />
                <StatCard title="Civic Capital (CCAP)" value={(currentUser.ccap ?? 0).toLocaleString()} icon={<DatabaseIcon className="h-5 w-5 text-blue-400"/>} />
                <StatCard title="Referral Earnings" value={`$${(currentUser.referralEarnings ?? 0).toFixed(2)}`} icon={<DollarSignIcon className="h-5 w-5 text-green-400"/>} />
            </div>
             <div><h3 className="text-md font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-4">About</h3>{currentUser.bio ? <p className="text-gray-300 whitespace-pre-line leading-relaxed">{currentUser.bio}</p> : <p className="text-gray-500 italic">No bio provided.</p>}</div>
            {currentUser.isLookingForPartners && (<div><h3 className="text-md font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-4">Ventures & Collaborations</h3>{currentUser.businessIdea && <p className="text-gray-300 whitespace-pre-line mb-4">{currentUser.businessIdea}</p>}{lookingForArray.length > 0 && (<div><h4 className="text-sm font-semibold text-gray-400 mb-2">Currently Looking For:</h4><div>{lookingForArray.map(item => <Pill key={item} text={item} />)}</div></div>)}</div>)}
            {skillsArray.length > 0 && (<div><h3 className="text-md font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-4">Skills</h3><div>{skillsArray.map(skill => <Pill key={skill} text={skill} />)}</div></div>)}
            {interestsArray.length > 0 && (<div><h3 className="text-md font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-4">Interests</h3><div>{interestsArray.map(item => <Pill key={item} text={item} />)}</div></div>)}
            
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
                    <div><label className="text-sm font-medium text-gray-400">Your Referral Link</label><div className="flex items-center gap-2 mt-1"><input type="text" readOnly value={referralLink} className="w-full bg-slate-700 p-2 rounded-md text-gray-300 font-mono text-sm" /><button onClick={handleCopy} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md">{isCopied ? <ClipboardCheckIcon className="h-5 w-5 text-green-400"/> : <ClipboardIcon className="h-5 w-5"/>}</button></div></div>
                    <div><h4 className="text-sm font-medium text-gray-400">Members You've Referred ({referredUsers.length})</h4>
                        {referredUsers.length > 0 ? <div className="mt-2 text-sm text-gray-300 space-y-1">{referredUsers.map(u => <p key={u.id} className="p-2 bg-slate-700/50 rounded-md">{u.name}</p>)}</div> : <p className="text-xs text-gray-500 mt-1">No members have joined with your code yet.</p>}
                    </div>
                </div>
            </div>
             <div className="mt-8 pt-6 border-t border-slate-700">
                <h3 className="text-lg font-medium text-gray-200 flex items-center">
                    <HelpCircleIcon className="h-5 w-5 mr-2" />
                    Help & Support
                </h3>
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-300">Have questions or need assistance? Contact our support team.</p>
                    <a href="mailto:support@globalcommons.app" className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center py-2 px-4 rounded-md text-white bg-slate-600 hover:bg-slate-500">
                        Contact Support
                    </a>
                </div>
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in">
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold text-white">{isEditing ? editData.name : currentUser.name}</h2>
                        <div className="flex items-center gap-4 mt-2">
                             <p className="text-lg text-green-400">{isEditing ? editData.profession : currentUser.profession || 'Community Member'}</p>
                             <div className="relative group flex items-center gap-1" title="Knowledge Points"><BookOpenIcon className="h-4 w-4 text-blue-400" /><span className="font-mono text-sm py-0.5 px-2 rounded-full bg-slate-700 text-blue-400">{currentUser.knowledgePoints ?? 0}</span></div>
                        </div>
                        <p className="text-sm text-gray-400">{currentUser.circle} • Joined {currentUser.createdAt ? new Date(currentUser.createdAt.toDate()).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    {!isEditing && (<button onClick={() => { setIsEditing(true); setActiveTab('profile'); }} className="flex items-center space-x-2 px-3 py-2 bg-slate-700 text-white text-sm rounded-md hover:bg-slate-600"><PencilIcon className="h-4 w-4" /><span>Edit Profile</span></button>)}
                </div>
                <ProfileCompletionMeter profileData={profileDataForMeter} role="member" />
            </div>

            <div className="mt-4">
                <div className="border-b border-slate-700"><nav className="-mb-px flex justify-around" aria-label="Tabs"><button onClick={() => setActiveTab('profile')} className={`${activeTab === 'profile' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-gray-200'} w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}>Profile</button><button onClick={() => setActiveTab('activity')} className={`${activeTab === 'activity' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-gray-200'} w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}>Activity</button></nav></div>
                <div className="mt-6">{activeTab === 'profile' && (isEditing ? renderProfileEdit() : renderProfileView())}{activeTab === 'activity' && (<><PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} /><PostsFeed user={currentUser} authorId={currentUser.id} onViewProfile={onViewProfile} typeFilter={typeFilter} /></>)}</div>
            </div>
        </div>
    );
};