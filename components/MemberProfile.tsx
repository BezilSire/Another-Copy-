
import React, { useState, useEffect } from 'react';
import { Member, User, Post } from '../types';
import { api } from '../services/apiService';
import { PencilIcon } from './icons/PencilIcon';
import { useToast } from '../contexts/ToastContext';
import { ProfileCompletionMeter } from './ProfileCompletionMeter';
import { PostsFeed } from './PostsFeed';
import { PostTypeFilter } from './PostTypeFilter';
import { HelpCircleIcon } from './icons/HelpCircleIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';

interface MemberProfileProps {
  memberId: string;
  currentUser: User;
  onUpdateUser: (updatedUser: Partial<User>) => Promise<void>;
  onViewProfile: (userId: string) => void;
}

const LOOKING_FOR_LIST = ['Co-founder', 'Business Partner', 'Investor', 'Mentor', 'Advisor', 'Employee', 'Freelancer'];


const DetailItem: React.FC<{label: string, value: string | undefined, isMono?: boolean}> = ({label, value, isMono = false}) => (
    <div>
        <dt className="text-sm font-medium text-gray-400">{label}</dt>
        <dd className={`mt-1 text-white ${isMono ? 'font-mono' : ''}`}>{value || <span className="text-gray-500 italic">Not provided</span>}</dd>
    </div>
);

const Pill: React.FC<{text: string}> = ({ text }) => (
    <span className="inline-block bg-slate-700 rounded-full px-3 py-1 text-sm font-semibold text-gray-300 mr-2 mb-2">
        {text}
    </span>
);

export const MemberProfile: React.FC<MemberProfileProps> = ({ memberId, currentUser, onUpdateUser, onViewProfile }) => {
    const [member, setMember] = useState<Member | null>(null);
    const [isFetching, setIsFetching] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'profile' | 'posts'>('profile');
    const [typeFilter, setTypeFilter] = useState<Post['types'] | 'all'>('all');

    const [editData, setEditData] = useState({
        full_name: '',
        phone: '',
        address: '',
        bio: '',
        profession: '',
        skills: '',
        awards: '',
        interests: '',
        passions: '',
        gender: '',
        age: '',
        isLookingForPartners: false,
        lookingFor: [] as string[],
        businessIdea: '',
    });

    useEffect(() => {
        const fetchMember = async () => {
            setIsFetching(true);
            try {
                const fetchedMember = await api.getMemberById(memberId);
                setMember(fetchedMember);
                if (fetchedMember) {
                    setEditData({
                        full_name: fetchedMember.full_name || '',
                        phone: fetchedMember.phone || '',
                        address: fetchedMember.address || '',
                        bio: fetchedMember.bio || '',
                        profession: fetchedMember.profession || '',
                        skills: fetchedMember.skills || '',
                        awards: fetchedMember.awards || '',
                        interests: fetchedMember.interests || '',
                        passions: fetchedMember.passions || '',
                        gender: fetchedMember.gender || '',
                        age: fetchedMember.age || '',
                        isLookingForPartners: fetchedMember.isLookingForPartners || false,
                        lookingFor: fetchedMember.lookingFor || [],
                        businessIdea: fetchedMember.businessIdea || '',
                    });
                }
            } catch (error) {
                addToast("Could not load member profile.", "error");
            } finally {
                setIsFetching(false);
            }
        };
        fetchMember();
    }, [memberId, addToast]);

    const isOwnProfile = member?.uid === currentUser.id;

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEditData({ ...editData, [e.target.name]: e.target.value });
    };
    
    const handleEditCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked, value } = e.target;
        if (name === 'isLookingForPartners') {
            setEditData(prev => ({ ...prev, isLookingForPartners: checked }));
        } else { // for lookingFor
            setEditData(prev => ({
                ...prev,
                lookingFor: checked
                    ? [...prev.lookingFor, value]
                    : prev.lookingFor.filter(item => item !== value),
            }));
        }
    };


    const handleSave = async () => {
        if (!member || !member.uid) {
            addToast("Could not save profile. User data is missing.", "error");
            return;
        }
        setIsSaving(true);
        try {
            const memberUpdateData: Partial<Member> = {
                full_name: editData.full_name,
                phone: editData.phone,
                address: editData.address,
                bio: editData.bio,
                profession: editData.profession,
                skills: editData.skills,
                awards: editData.awards,
                interests: editData.interests,
                passions: editData.passions,
                gender: editData.gender,
                age: editData.age,
                isLookingForPartners: editData.isLookingForPartners,
                lookingFor: editData.lookingFor,
                businessIdea: editData.businessIdea,
            };
            
// FIX: The userUpdateData object was including fields not present in the base `User` type.
// I have updated `types.ts` to include these optional fields on the `User` type,
// which correctly reflects the data structure for MemberUsers in the 'users' collection.
            const userUpdateData: Partial<User> = {
                name: editData.full_name,
                phone: editData.phone,
                address: editData.address,
                bio: editData.bio,
                isLookingForPartners: editData.isLookingForPartners,
                lookingFor: editData.lookingFor,
                businessIdea: editData.businessIdea,
                skills: editData.skills,
                interests: editData.interests,
                profession: editData.profession,
            };
            
            await Promise.all([
                api.updateMemberProfile(member.id, memberUpdateData),
                onUpdateUser(userUpdateData) // This updates 'users' collection and AuthContext
            ]);
            
            setMember(prev => prev ? { ...prev, ...memberUpdateData } : null);
            setIsEditing(false);
        } catch (error) {
            addToast("An error occurred while saving. Please try again.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (isFetching) {
        return <div className="text-center p-10">Loading profile...</div>;
    }

    if (!member) {
        return <div className="text-center p-10">Member not found.</div>;
    }
    
    const skillsArray = (isEditing ? editData.skills : member.skills)?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const interestsArray = (isEditing ? editData.interests : member.interests)?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const passionsArray = (isEditing ? editData.passions : member.passions)?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const lookingForArray = (isEditing ? editData.lookingFor : member.lookingFor)?.filter(Boolean) || [];


    const profileDataForMeter = isEditing ? editData : member;

    const renderProfileEdit = () => (
        <div className="mt-6 space-y-4">
             <h3 className="text-lg font-semibold text-gray-200 border-b border-slate-700 pb-2">Personal Information</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-300">Full Name</label>
                    <input type="text" name="full_name" id="full_name" value={editData.full_name} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone</label>
                    <input type="tel" name="phone" id="phone" value={editData.phone} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" />
                </div>
             </div>
              <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-300">Address</label>
                    <input type="text" name="address" id="address" value={editData.address} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" />
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="profession" className="block text-sm font-medium text-gray-300">Job / Profession</label>
                    <input type="text" name="profession" id="profession" value={editData.profession} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" />
                </div>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-300">Gender</label>
                    <input type="text" name="gender" id="gender" value={editData.gender} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" />
                </div>
                 <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-300">Age</label>
                    <input type="text" name="age" id="age" value={editData.age} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" />
                </div>
            </div>
             <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-300">Bio</label>
                <textarea name="bio" id="bio" rows={4} value={editData.bio} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm"></textarea>
            </div>
            <div>
                <label htmlFor="skills" className="block text-sm font-medium text-gray-300">Skills (comma-separated)</label>
                <input type="text" name="skills" id="skills" value={editData.skills} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" />
            </div>
             <div>
                <label htmlFor="interests" className="block text-sm font-medium text-gray-300">Interests (comma-separated)</label>
                <input type="text" name="interests" id="interests" value={editData.interests} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" />
            </div>
            <div>
                <label htmlFor="passions" className="block text-sm font-medium text-gray-300">Passions (comma-separated)</label>
                <input type="text" name="passions" id="passions" value={editData.passions} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm" />
            </div>
            <div>
                <label htmlFor="awards" className="block text-sm font-medium text-gray-300">Awards & Recognitions</label>
                <textarea name="awards" id="awards" rows={3} value={editData.awards} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white sm:text-sm"></textarea>
            </div>

            <h3 className="text-lg font-semibold text-gray-200 border-b border-slate-700 pb-2 pt-4">Ventures & Collaborations</h3>
            <div className="flex items-center mt-4">
                <input type="checkbox" id="isLookingForPartners" name="isLookingForPartners" checked={editData.isLookingForPartners} onChange={handleEditCheckboxChange} className="h-4 w-4 text-green-600 bg-slate-700 border-slate-600 rounded focus:ring-green-500" />
                <label htmlFor="isLookingForPartners" className="ml-2 block text-sm text-gray-200">I'm open to business collaborations.</label>
            </div>
            {editData.isLookingForPartners && (
                <div className="space-y-4 mt-4 pl-6 border-l border-slate-700 animate-fade-in">
                    <div>
                        <label htmlFor="businessIdea" className="block text-sm font-medium text-gray-300">My business idea or area of focus</label>
                        <textarea name="businessIdea" id="businessIdea" rows={3} value={editData.businessIdea} onChange={handleEditChange} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">What I'm looking for</label>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {LOOKING_FOR_LIST.map(item => (
                                <label key={item} className="flex items-center space-x-2 text-sm text-gray-300">
                                    <input type="checkbox" value={item} name="lookingFor" checked={editData.lookingFor.includes(item)} onChange={handleEditCheckboxChange} className="text-green-600 bg-slate-700 border-slate-600 rounded focus:ring-green-500"/>
                                    <span>{item}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-600 text-white text-sm rounded-md hover:bg-slate-500">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-slate-500">{isSaving ? "Saving..." : "Save Changes"}</button>
            </div>
        </div>
    );

    const renderProfileView = () => (
         <div className="mt-6 space-y-6">
             <div>
                <h3 className="text-md font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-2">About</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm mt-4">
                    <DetailItem label="Gender" value={member.gender} />
                    <DetailItem label="Age" value={member.age} />
                </dl>
                {member.bio && <p className="text-gray-300 whitespace-pre-wrap mt-4">{member.bio}</p>}
            </div>

            {member.isLookingForPartners && (
                <div>
                    <h3 className="text-md font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-2">Ventures & Collaborations</h3>
                    {member.businessIdea && <p className="text-gray-300 whitespace-pre-wrap mb-4">{member.businessIdea}</p>}
                    {lookingForArray.length > 0 && (
                         <div>
                            <h4 className="text-sm font-semibold text-gray-400 mb-2">Currently Looking For:</h4>
                            <div>{lookingForArray.map(item => <Pill key={item} text={item} />)}</div>
                        </div>
                    )}
                </div>
            )}

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
            {passionsArray.length > 0 && (
                 <div>
                    <h3 className="text-md font-semibold text-gray-300 mb-2">Passions</h3>
                    <div>{passionsArray.map(item => <Pill key={item} text={item} />)}</div>
                </div>
            )}
             {member.awards && (
                 <div>
                    <h3 className="text-md font-semibold text-gray-300 mb-2">Awards & Recognitions</h3>
                    <p className="text-gray-300 whitespace-pre-wrap">{member.awards}</p>
                </div>
            )}

            <div>
                <h3 className="text-md font-semibold text-gray-300 border-b border-slate-700 pb-2 mb-2">Contact & Details</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm mt-4">
                    <DetailItem label="Email" value={member.email} />
                    <DetailItem label="Phone Number" value={member.phone} />
                    <DetailItem label="Address" value={member.address} />
                    <DetailItem label="National ID" value={member.national_id} isMono />
                </dl>
            </div>

            {isOwnProfile && (
                <div className="pt-6 border-t border-slate-700">
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
            )}
        </div>
    );

    return (
        <div className="animate-fade-in">
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold text-white">{isEditing ? editData.full_name : member.full_name}</h2>
                        <div className="flex items-center gap-4 mt-2">
                             <p className="text-lg text-green-400">{isEditing ? editData.profession : member.profession || 'Community Member'}</p>
                             {isOwnProfile && (
                                <div className="relative group flex items-center gap-1" title="Knowledge Points">
                                    <BookOpenIcon className="h-4 w-4 text-blue-400" />
                                    <span className="font-mono text-sm py-0.5 px-2 rounded-full bg-slate-700 text-blue-400">
                                        {currentUser.knowledgePoints ?? 0}
                                    </span>
                                </div>
                             )}
                        </div>
                        <p className="text-sm text-gray-400">{member.circle} • Joined {new Date(member.date_registered).toLocaleDateString()}</p>
                    </div>
                    {isOwnProfile && !isEditing && (
                        <button onClick={() => { setIsEditing(true); setActiveTab('profile'); }} className="flex items-center space-x-2 px-3 py-2 bg-slate-700 text-white text-sm rounded-md hover:bg-slate-600">
                            <PencilIcon className="h-4 w-4" />
                            <span>Edit Profile</span>
                        </button>
                    )}
                </div>

                {isOwnProfile && <ProfileCompletionMeter profileData={profileDataForMeter} role="member" />}
            </div>

            <div className="mt-4">
                <div className="border-b border-slate-700">
                    <nav className="-mb-px flex justify-around" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`${activeTab === 'profile' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-gray-200'} w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
                        >
                            Profile
                        </button>
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={`${activeTab === 'posts' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-gray-200'} w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
                        >
                            Posts
                        </button>
                    </nav>
                </div>

                <div className="mt-6">
                    {activeTab === 'profile' && (isEditing ? renderProfileEdit() : renderProfileView())}
                    {activeTab === 'posts' && member.uid && (
                        <>
                            <PostTypeFilter currentFilter={typeFilter} onFilterChange={setTypeFilter} />
                            <PostsFeed 
                                user={currentUser}
                                authorId={member.uid}
                                onViewProfile={onViewProfile}
                                typeFilter={typeFilter}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
