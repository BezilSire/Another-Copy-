
import React, { useState, useEffect, useMemo } from 'react';
import { Member, User, Post, PublicUserProfile, VentureEquityHolding, MemberUser, FilterType } from '../types';
import { api } from '../services/apiService';
import { PencilIcon } from './icons/PencilIcon';
import { useToast } from '../contexts/ToastContext';
import { ProfileCompletionMeter } from './ProfileCompletionMeter';
import { PostsFeed } from './PostsFeed';
import { PostTypeFilter } from './PostTypeFilter';
import { BookOpenIcon } from './icons/BookOpenIcon';
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
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
// Added missing LoaderIcon import
import { LoaderIcon } from './icons/LoaderIcon';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; description: string }> = ({ title, value, icon, description }) => (
    <div className="module-frame bg-slate-900/60 p-6 rounded-[2rem] border-white/5 hover:border-white/10 transition-all">
        <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">{icon}</div>
            <div>
                <p className="label-caps !text-[8px] text-gray-500 mb-1">{title}</p>
                <p className="text-2xl font-black text-white font-mono tracking-tighter">{value}</p>
            </div>
        </div>
        <p className="text-[8px] text-gray-600 font-black uppercase mt-4 tracking-widest leading-loose">{description}</p>
    </div>
);

const Pill: React.FC<{text: string}> = ({ text }) => (
    <span className="inline-block bg-slate-900 border border-white/5 rounded-lg px-3 py-1 text-[9px] font-black uppercase text-gray-400 mr-2 mb-2 tracking-widest">
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

    const [editData, setEditData] = useState({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        bio: currentUser.bio || '',
        profession: currentUser.profession || '',
        skills: (currentUser.skills || []).join(', '),
        id_card_number: currentUser.id_card_number || '',
        circle: currentUser.circle || ''
    });
    
    useEffect(() => {
        setEditData({
            name: currentUser.name || '', phone: currentUser.phone || '', address: currentUser.address || '',
            bio: currentUser.bio || '', profession: currentUser.profession || '', 
            skills: (currentUser.skills || []).join(', '),
            interests: (currentUser.interests || []).join(', '),
            id_card_number: currentUser.id_card_number || '',
            circle: currentUser.circle || ''
        });
    }, [currentUser]);
    
    useEffect(() => {
        const unsub = api.listenForReferredUsers(currentUser.id, setReferredUsers, console.error);
        return () => unsub();
    }, [currentUser.id]);

    const referralLink = `${window.location.origin}?ref=${currentUser.referralCode}`;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const skillsAsArray = (editData.skills || '').split(',').map(s => s.trim()).filter(Boolean);
            const userUpdateData = { ...editData, skills: skillsAsArray, skills_lowercase: skillsAsArray.map(s => s.toLowerCase()) };
            
            if (currentUser.member_id) {
                const memberUpdateData = { ...editData, skills: skillsAsArray, national_id: editData.id_card_number };
                await api.updateMemberAndUserProfile(currentUser.id, currentUser.member_id, userUpdateData as any, memberUpdateData as any);
            } else {
                await onUpdateUser(userUpdateData as any);
            }
            addToast('Identity Sync Successful.', 'success');
            setIsEditing(false);
        } catch (error: any) {
            addToast('Sync failed.', "error");
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
    
    const skillsArray = useMemo(() => isEditing ? (editData.skills || '').split(',').map(s => s.trim()).filter(Boolean) : currentUser.skills || [], [isEditing, editData.skills, currentUser.skills]);
    const profileDataForMeter = isEditing ? editData : currentUser;

    const renderEditView = () => (
        <div className="module-frame glass-module p-10 rounded-[2.5rem] border-white/5 space-y-8 animate-fade-in">
            <h3 className="label-caps !text-[10px] text-brand-gold border-b border-white/5 pb-4">Refining Identity Anchor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="label-caps !text-[9px]">Node Name</label>
                    <input value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-bold" />
                </div>
                 <div className="space-y-2">
                    <label className="label-caps !text-[9px]">Designation (Profession)</label>
                    <input value={editData.profession} onChange={(e) => setEditData({...editData, profession: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-xl text-white font-bold" />
                </div>
                <div className="space-y-2 col-span-full">
                    <label className="label-caps !text-[9px]">Narrative (Bio)</label>
                    <textarea value={editData.bio} onChange={(e) => setEditData({...editData, bio: e.target.value})} rows={4} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-sm" />
                </div>
                 <div className="space-y-2">
                    <label className="label-caps !text-[9px]">Capability Profile (Skills)</label>
                    <input value={editData.skills} onChange={(e) => setEditData({...editData, skills: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-sm" placeholder="Marketing, Agriculture, Code..." />
                </div>
                 <div className="space-y-2">
                    <label className="label-caps !text-[9px]">Circle (Location)</label>
                    <input value={editData.circle} onChange={(e) => setEditData({...editData, circle: e.target.value.toUpperCase()})} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-sm" placeholder="BULAWAYO" />
                </div>
            </div>
            <div className="flex justify-end gap-4 border-t border-white/5 pt-8">
                <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-gray-500 font-black uppercase text-[10px]">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="px-10 py-4 bg-brand-gold text-slate-950 font-black rounded-xl uppercase tracking-widest text-[10px] shadow-glow-gold active:scale-95">
                    {isSaving ? <LoaderIcon className="h-4 w-4 animate-spin"/> : 'Commit Sync'}
                </button>
            </div>
        </div>
    );

    const renderProfileView = () => (
         <div className="mt-10 space-y-10 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard title="Node Reputation" value={currentUser.credibility_score || 100} icon={<ShieldCheckIcon className="h-6 w-6 text-emerald-500"/>} description="Based on peer signatures and activity." />
                <StatCard title="Peer Vouches" value={currentUser.vouchCount || 0} icon={<TrendingUpIcon className="h-6 w-6 text-brand-gold"/>} description="Verified anchors from other citizens." />
                <StatCard title="Civic Capital" value={(currentUser.ccap ?? 0).toLocaleString()} icon={<DatabaseIcon className="h-6 w-6 text-blue-500"/>} description="Verifiable stake in the Commons." />
            </div>
             
             <div className="module-frame glass-module p-10 rounded-[2.5rem] border-white/5">
                <h3 className="label-caps !text-[10px] text-gray-500 mb-6 border-b border-white/5 pb-4">Citizen Narrative</h3>
                {currentUser.bio ? <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{currentUser.bio}</p> : <p className="text-gray-600 italic text-sm">No narrative indexed for this node.</p>}
                
                {skillsArray.length > 0 && (
                    <div className="mt-10 pt-10 border-t border-white/5">
                        <p className="label-caps !text-[8px] text-gray-500 mb-4">Capability Metadata</p>
                        <div className="flex flex-wrap">{skillsArray.map(skill => <Pill key={skill} text={skill} />)}</div>
                    </div>
                )}
             </div>

            <div>
                <h3 className="label-caps !text-[10px] text-gray-500 mb-6 pl-4">Network Growth Link</h3>
                <div className="module-frame glass-module p-8 rounded-[2.5rem] border-white/5 space-y-6">
                    <div className="flex items-center gap-4">
                        <input type="text" readOnly value={referralLink} className="w-full bg-black border border-white/10 p-4 rounded-xl text-gray-400 font-mono text-xs focus:outline-none" />
                        <button onClick={handleCopy} className="p-4 bg-brand-gold text-slate-950 rounded-xl shadow-glow-gold transition-all active:scale-90">
                            {isCopied ? <ClipboardCheckIcon className="h-5 w-5"/> : <ClipboardIcon className="h-5 w-5"/>}
                        </button>
                    </div>
                    <div className="pt-6 border-t border-white/5">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Referrals: <span className="text-white">{referredUsers.length}</span></p>
                    </div>
                </div>
            </div>
        </div>
    );

  return (
    <div className="animate-fade-in font-sans pb-20">
      <div className="module-frame glass-module p-8 sm:p-12 rounded-[3rem] border-white/5 shadow-premium">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-10">
            <div className="flex items-center gap-8">
                <div className="w-24 h-24 rounded-3xl bg-slate-950 flex items-center justify-center border border-brand-gold/30 shadow-2xl relative">
                    <UserCircleIcon className="h-16 w-16 text-gray-700" />
                    <div className="absolute -bottom-2 -right-2 bg-brand-gold text-slate-950 p-2 rounded-xl shadow-glow-gold">
                        <ShieldCheckIcon className="h-4 w-4" />
                    </div>
                </div>
                <div>
                    <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter gold-text leading-none">{currentUser.name}</h2>
                    <p className="text-xl font-black text-emerald-400 tracking-tight uppercase mt-1">{currentUser.profession || "Sovereign Node"}</p>
                    <p className="label-caps !text-[8px] !text-gray-600 mt-2 tracking-[0.4em]">{currentUser.circle || "GLOBAL"} Circle</p>
                </div>
            </div>
            {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="px-8 py-4 bg-white/5 hover:bg-brand-gold hover:text-slate-950 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-3">
                    <PencilIcon className="h-4 w-4" /> Refine Identity
                </button>
            )}
        </div>
        
        <div className="mt-12">
            <ProfileCompletionMeter profileData={profileDataForMeter as any} role="member" />
        </div>
      </div>
      
      <div className="mt-10 border-b border-white/10">
          <nav className="-mb-px flex space-x-12 overflow-x-auto no-scrollbar">
              <button onClick={() => setActiveTab('profile')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.4em] transition-all relative ${activeTab === 'profile' ? 'text-brand-gold' : 'text-gray-600 hover:text-gray-400'}`}>
                  Sovereign Data
                  {activeTab === 'profile' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold shadow-glow-gold"></div>}
              </button>
              <button onClick={() => setActiveTab('activity')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.4em] transition-all relative ${activeTab === 'activity' ? 'text-brand-gold' : 'text-gray-600 hover:text-gray-400'}`}>
                  Temporal Log
                  {activeTab === 'activity' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold shadow-glow-gold"></div>}
              </button>
          </nav>
      </div>

       <div className="mt-10">
            {activeTab === 'profile' ? (isEditing ? renderEditView() : renderProfileView()) : (
                <div className="animate-fade-in">
                    <PostsFeed user={currentUser} authorId={currentUser.id} onViewProfile={onViewProfile} typeFilter={typeFilter} />
                </div>
            )}
        </div>
    </div>
  );
};
